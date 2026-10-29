const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const User = require('../models/User');

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function monthRange(referenceDate = new Date()) {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

async function setBudget(userId, amount) {
  const value = toNumber(amount);
  if (value === null || value <= 0) {
    return { text: 'Please provide a valid positive number for the budget.' };
  }

  const budget = await Budget.findOne({ userId });
  if (budget) {
    budget.monthlyLimit = value;
    await budget.save();
  } else {
    await Budget.create({ userId, monthlyLimit: value, currentSpent: 0 });
  }

  return { text: `Your monthly budget has been set to ₹${value.toFixed(2)}.` };
}

async function getBudget(userId) {
  const budget = await Budget.findOne({ userId });
  const limit = budget?.monthlyLimit ?? 0;
  const spent = budget?.currentSpent ?? 0;
  const remaining = Math.max(limit - spent, 0);

  if (!budget) {
    return { text: 'You do not have a budget set yet. You can set one using “set my budget to 5000”.' };
  }

  return {
    text: `Your monthly budget is ₹${limit.toFixed(2)}. You have spent ₹${spent.toFixed(2)} and have ₹${remaining.toFixed(2)} left.`
  };
}

async function setAssistantName(userId, name) {
  const cleanName = String(name || '').trim();
  if (!cleanName) {
    return { text: 'I did not receive a valid name. Please tell me the name you want to use.' };
  }

  const user = await User.findById(userId);
  if (!user) {
    return { text: 'I could not find your account to update the assistant name.' };
  }

  user.preferences = user.preferences || {};
  user.preferences.assistantName = cleanName;
  await user.save();

  return { text: `Got it! I’ll call myself ${cleanName}.` };
}

async function addExpense(userId, expenseData = {}) {
  const item = String(expenseData.item || expenseData.name || 'Expense').trim();
  const amount = toNumber(expenseData.amount ?? expenseData.price ?? 0);
  const foodCourt = String(expenseData.foodCourt || expenseData.place || 'Unknown').trim();

  if (!item || amount === null || amount <= 0 || !foodCourt) {
    return { text: 'I need the expense item, amount, and place to add it correctly.' };
  }

  const expense = await Expense.create({
    userId,
    item,
    amount,
    category: expenseData.category || 'other',
    foodCourt,
    description: expenseData.description || '',
    date: expenseData.date ? new Date(expenseData.date) : new Date(),
    tags: Array.isArray(expenseData.tags) ? expenseData.tags : []
  });

  const budget = await Budget.findOne({ userId });
  if (budget) {
    budget.currentSpent = Number(budget.currentSpent || 0) + amount;
    await budget.save();
  } else {
    await Budget.create({ userId, monthlyLimit: Math.max(5000, amount), currentSpent: amount });
  }

  return {
    text: `Added expense: ${item} for ₹${amount.toFixed(2)} at ${foodCourt}.`,
    expense
  };
}

async function updateExpense(userId, expenseId, updates = {}) {
  const expense = await Expense.findOne({ _id: expenseId, userId });
  if (!expense) {
    return { text: 'I could not find that expense to update.' };
  }

  Object.keys(updates || {}).forEach((key) => {
    if (updates[key] !== undefined) expense[key] = updates[key];
  });

  await expense.save();
  return { text: `Updated expense ${expense.item}.`, expense };
}

async function deleteExpense(userId, expenseId) {
  const expense = await Expense.findOne({ _id: expenseId, userId });
  if (!expense) {
    return { text: 'I could not find that expense to delete.' };
  }

  await Expense.deleteOne({ _id: expenseId, userId });
  const budget = await Budget.findOne({ userId });
  if (budget) {
    budget.currentSpent = Math.max((budget.currentSpent || 0) - (expense.amount || 0), 0);
    await budget.save();
  }

  return { text: `Deleted expense ${expense.item}.` };
}

async function getMonthlySummary(userId, offsetMonths = 0) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0, 23, 59, 59, 999);

  const expenses = await Expense.find({
    userId,
    date: { $gte: monthStart, $lte: monthEnd }
  }).lean();

  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const budget = await Budget.findOne({ userId });

  return {
    text: `Your total spending for ${monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' })} is ₹${total.toFixed(2)}.${budget ? ` Your budget is ₹${Number(budget.monthlyLimit || 0).toFixed(2)}.` : ''}`,
    summary: `Total spent: ₹${total.toFixed(2)}`,
    total,
    expenses
  };
}

async function getSummaryByRange(userId, start, end) {
  const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endDate = end ? new Date(end) : new Date();

  const expenses = await Expense.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  }).lean();

  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    text: `Your spending from ${startDate.toDateString()} to ${endDate.toDateString()} is ₹${total.toFixed(2)}.`,
    total,
    expenses
  };
}

async function compareMonths(userId, currentOffset = 0, previousOffset = -1) {
  const current = await getMonthlySummary(userId, currentOffset);
  const previous = await getMonthlySummary(userId, previousOffset);
  const diff = current.total - previous.total;
  const statement = diff >= 0 ? `You spent ₹${diff.toFixed(2)} more than last month.` : `You saved ₹${Math.abs(diff).toFixed(2)} compared to last month.`;

  return {
    text: `${statement} Current month: ₹${current.total.toFixed(2)}. Previous month: ₹${previous.total.toFixed(2)}.`,
    current,
    previous,
    diff
  };
}

async function getOverspendingStatus(userId) {
  const budget = await Budget.findOne({ userId });
  const currentSpent = budget?.currentSpent ?? 0;
  const limit = budget?.monthlyLimit ?? 0;

  if (!budget || limit <= 0) {
    return { text: 'You do not have a monthly budget set yet.' };
  }

  if (currentSpent > limit) {
    return { text: `You are over budget by ₹${(currentSpent - limit).toFixed(2)}.` };
  }

  return { text: `You are within budget. ₹${(limit - currentSpent).toFixed(2)} remaining.` };
}

async function getTopCategories(userId) {
  const expenses = await Expense.find({ userId }).lean();
  const map = {};

  for (const expense of expenses) {
    const category = expense.category || 'other';
    map[category] = (map[category] || 0) + Number(expense.amount || 0);
  }

  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const top = entries[0];

  if (!top) {
    return { text: 'No expense data available yet.' };
  }

  return { text: `Your highest spending category is ${top[0]} with ₹${top[1].toFixed(2)}.` };
}

async function searchExpenses(userId, filters = {}) {
  const query = { userId };

  if (filters.category) {
    query.category = new RegExp(filters.category, 'i');
  }

  if (filters.keyword) {
    query.$or = [
      { item: new RegExp(filters.keyword, 'i') },
      { description: new RegExp(filters.keyword, 'i') },
      { foodCourt: new RegExp(filters.keyword, 'i') }
    ];
  }

  if (filters.minAmount != null || filters.maxAmount != null) {
    query.amount = {};
    if (filters.minAmount != null) query.amount.$gte = Number(filters.minAmount);
    if (filters.maxAmount != null) query.amount.$lte = Number(filters.maxAmount);
  }

  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  const expenses = await Expense.find(query).lean();
  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    text: `I found ${expenses.length} expenses totaling ₹${total.toFixed(2)}.`,
    total,
    expenses
  };
}

async function forecastSpend(userId) {
  const current = await getMonthlySummary(userId, 0);
  const total = current.total || 0;
  const month = new Date();
  const daysPassed = month.getDate();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const projected = daysInMonth > 0 && daysPassed > 0 ? (total / daysPassed) * daysInMonth : total;

  return {
    text: `Based on current spending, your projected total for this month is ₹${projected.toFixed(2)}.`,
    projected
  };
}

async function advice(userId) {
  const budget = await Budget.findOne({ userId });
  const limit = budget?.monthlyLimit ?? 0;
  const spent = budget?.currentSpent ?? 0;

  if (!limit) {
    return { text: 'Set a monthly budget first so I can help you optimize your spending.' };
  }

  const remaining = Math.max(limit - spent, 0);
  const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

  if (percentUsed > 80) {
    return { text: `You are already at ${percentUsed.toFixed(1)}% of your budget. Try cutting nonessential meals and snacks to keep within your limit. ₹${remaining.toFixed(2)} remains.` };
  }

  return { text: `You are in a healthy range. Keep spending controlled and try to save at least ₹${(limit * 0.1).toFixed(2)} this month.` };
}

async function getCategoryComparison(userId) {
  const expenses = await Expense.find({ userId }).lean();
  const map = {};

  for (const expense of expenses) {
    const category = expense.category || 'other';
    map[category] = (map[category] || 0) + Number(expense.amount || 0);
  }

  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const lines = entries.map(([category, total]) => `${category}: ₹${total.toFixed(2)}`).join('; ');

  return {
    text: `Category comparison: ${lines || 'No category data yet.'}`,
    breakdown: map
  };
}

module.exports = {
  setBudget,
  getBudget,
  setAssistantName,
  addExpense,
  updateExpense,
  deleteExpense,
  getMonthlySummary,
  getSummaryByRange,
  compareMonths,
  getOverspendingStatus,
  getTopCategories,
  searchExpenses,
  forecastSpend,
  advice,
  getCategoryComparison
};
