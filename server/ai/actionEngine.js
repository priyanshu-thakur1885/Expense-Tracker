const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const mongoose = require('mongoose');
const User = require('../models/User');

function toDate(input) {
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeRange(startInput, endInput) {
  let start = startInput ? toDate(startInput) : null;
  let end = endInput ? toDate(endInput) : null;
  if (!start && !end) {
    // default last 30 days
    end = new Date();
    start = new Date();
    start.setDate(end.getDate() - 30);
  }
  if (start && !end) {
    end = new Date();
  }
  if (end && !start) {
    start = new Date(end);
    start.setDate(start.getDate() - 30);
  }
  return { start, end };
}

async function setBudget(userId, amount) {
  if (!amount || Number.isNaN(Number(amount))) throw new Error('Budget amount is required');
  const numeric = parseFloat(amount);
  const budget = await Budget.findOneAndUpdate(
    { userId },
    {
      $set: {
        monthlyLimit: numeric,
      },
      $setOnInsert: {
        currentSpent: 0,
        remainingBudget: numeric,
      },
    },
    { upsert: true, new: true }
  );
  // Update remainingBudget to reflect currentSpent if exists
  const remaining = budget.monthlyLimit - (budget.currentSpent || 0);
  budget.remainingBudget = remaining;
  await budget.save();
  return budget;
}

async function getBudget(userId) {
  const budget = await Budget.findOne({ userId });
  if (!budget) {
    return { message: 'No budget set yet.' };
  }
  return {
    monthlyLimit: budget.monthlyLimit,
    currentSpent: budget.currentSpent,
    remainingBudget: budget.remainingBudget ?? (budget.monthlyLimit - (budget.currentSpent || 0)),
    status: budget.status || 'unknown',
  };
}

async function setAssistantName(userId, name) {
  const clean = (name || '').trim();
  if (!clean) throw new Error('Name is required');
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  user.preferences = user.preferences || {};
  user.preferences.assistantName = clean;
  await user.save();
  return { assistantName: clean };
}

async function addExpense(userId, payload) {
  const { item, amount, category = 'other', foodCourt = '', description = '', tags = [], date } = payload;
  if (!item || !amount) throw new Error('item and amount are required');
  const expense = new Expense({
    userId,
    item,
    amount: parseFloat(amount),
    category,
    foodCourt,
    description,
    tags,
    date: date ? new Date(date) : new Date(),
  });
  await expense.save();
  await Budget.findOneAndUpdate(
    { userId },
    { $inc: { currentSpent: expense.amount } },
    { upsert: true }
  );
  return expense;
}

async function updateExpense(userId, expenseId, updates) {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) throw new Error('Invalid expenseId');
  const expense = await Expense.findOneAndUpdate(
    { _id: expenseId, userId },
    { $set: updates },
    { new: true }
  );
  if (!expense) throw new Error('Expense not found');
  return expense;
}

async function deleteExpense(userId, expenseId) {
  if (!mongoose.Types.ObjectId.isValid(expenseId)) throw new Error('Invalid expenseId');
  const expense = await Expense.findOneAndDelete({ _id: expenseId, userId });
  if (!expense) throw new Error('Expense not found');
  await Budget.findOneAndUpdate(
    { userId },
    { $inc: { currentSpent: -expense.amount } }
  );
  return expense;
}

async function getMonthlySummary(userId, monthOffset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
  const expenses = await Expense.find({ userId, date: { $gte: start, $lt: end } });
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  return { total, byCategory, count: expenses.length, period: { start, end } };
}

async function getCategoryComparison(userId) {
  const expenses = await Expense.find({ userId });
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  return { byCategory: sorted };
}

async function detectSpikes(userId, threshold = 1.25) {
  const now = new Date();
  const thisMonth = await getMonthlySummary(userId, 0);
  const lastMonth = await getMonthlySummary(userId, -1);
  const spikes = [];
  for (const [cat, amount] of Object.entries(thisMonth.byCategory)) {
    const prev = lastMonth.byCategory[cat] || 0.001;
    if (amount / prev >= threshold) {
      spikes.push({ category: cat, current: amount, previous: prev, ratio: amount / prev });
    }
  }
  return spikes;
}

async function getSummaryByRange(userId, startDate, endDate) {
  const { start, end } = normalizeRange(startDate, endDate);
  const expenses = await Expense.find({ userId, date: { $gte: start, $lt: end } });
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  return { total, byCategory, count: expenses.length, period: { start, end } };
}

async function compareMonths(userId, offsetA = 0, offsetB = -1) {
  const a = await getMonthlySummary(userId, offsetA);
  const b = await getMonthlySummary(userId, offsetB);
  const delta = a.total - b.total;
  const pct = b.total ? (delta / b.total) * 100 : null;
  return { current: a, previous: b, delta, pct };
}

async function getOverspendingStatus(userId) {
  const budget = await Budget.findOne({ userId });
  if (!budget) return { message: 'No budget set yet.' };
  const remaining = budget.monthlyLimit - (budget.currentSpent || 0);
  const pct = budget.monthlyLimit ? (budget.currentSpent / budget.monthlyLimit) * 100 : null;
  let status = 'safe';
  if (pct >= 100) status = 'over';
  else if (pct >= 90) status = 'danger';
  else if (pct >= 75) status = 'warning';
  return {
    status,
    monthlyLimit: budget.monthlyLimit,
    currentSpent: budget.currentSpent,
    remaining,
    percent: pct,
  };
}

async function getTopCategories(userId, opts = {}) {
  const { startDate, endDate, topN = 3, direction = 'desc' } = opts;
  const { start, end } = normalizeRange(startDate, endDate);
  const query = { userId };
  if (start && end) query.date = { $gte: start, $lt: end };
  const expenses = await Expense.find(query);
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  let sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (direction === 'asc') sorted = sorted.reverse();
  const top = sorted.slice(0, topN);
  return { categories: top, period: { start, end }, count: expenses.length };
}

async function searchExpenses(userId, filters = {}) {
  const query = { userId };
  if (filters.startDate || filters.endDate) {
    const { start, end } = normalizeRange(filters.startDate, filters.endDate);
    query.date = { $gte: start, $lt: end };
  }
  if (filters.minAmount || filters.maxAmount) {
    query.amount = {};
    if (filters.minAmount) query.amount.$gte = parseFloat(filters.minAmount);
    if (filters.maxAmount) query.amount.$lte = parseFloat(filters.maxAmount);
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.keyword) {
    const regex = new RegExp(filters.keyword, 'i');
    query.$or = [{ item: regex }, { description: regex }];
  }
  const expenses = await Expense.find(query).sort({ date: -1 }).limit(10);
  const totalCount = await Expense.countDocuments(query);
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  return { totalCount, sample: expenses, sampleTotal: totalAmount, filters };
}

async function forecastSpend(userId) {
  const now = new Date();
  const end = now;
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const expenses = await Expense.find({ userId, date: { $gte: start, $lt: end } });
  if (!expenses.length) return { message: 'Not enough data to forecast.' };

  const totalSample = expenses.reduce((s, e) => s + e.amount, 0);
  const daysSample = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  const avgPerDay = totalSample / daysSample;

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = Math.max(1, now.getDate());
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  // Sum spent so far this month
  const spentThisMonth = expenses
    .filter(e => e.date >= monthStart)
    .reduce((s, e) => s + e.amount, 0);

  const projectedMonthTotal = spentThisMonth + avgPerDay * daysRemaining;

  return {
    avgPerDay,
    daysConsidered: daysSample,
    daysRemaining,
    spentThisMonth,
    projectedMonthTotal,
  };
}

async function advice(userId) {
  const budget = await Budget.findOne({ userId });
  const month = await getMonthlySummary(userId, 0);
  const categories = Object.entries(month.byCategory || {}).sort((a, b) => b[1] - a[1]);
  const topCat = categories[0];
  const suggestions = [];

  if (budget) {
    const remaining = budget.monthlyLimit - (budget.currentSpent || 0);
    const pct = budget.monthlyLimit ? (budget.currentSpent / budget.monthlyLimit) * 100 : null;
    if (pct !== null) {
      if (pct >= 100) suggestions.push('You are over budget. Consider pausing non-essential categories this week.');
      else if (pct >= 85) suggestions.push('You are close to your budget. Try to cut discretionary spend for the rest of the month.');
    }
    suggestions.push(`Remaining budget: ₹${remaining.toFixed(2)} (limit ₹${budget.monthlyLimit.toFixed(2)}, spent ₹${budget.currentSpent.toFixed(2)}).`);
  } else {
    suggestions.push('Set a monthly budget to track against a limit.');
  }

  if (topCat) {
    suggestions.push(`Your top category is ${topCat[0]} (₹${topCat[1].toFixed(2)}). Consider setting a cap or finding cheaper alternatives there.`);
  }

  if (!suggestions.length) {
    suggestions.push('Track a few more expenses so I can give specific tips.');
  }

  return { text: suggestions.join(' ') };
}

module.exports = {
  setBudget,
  getBudget,
  setAssistantName,
  addExpense,
  updateExpense,
  deleteExpense,
  getMonthlySummary,
  getCategoryComparison,
  detectSpikes,
  getSummaryByRange,
  compareMonths,
  getOverspendingStatus,
  getTopCategories,
  searchExpenses,
  forecastSpend,
  advice,
};

