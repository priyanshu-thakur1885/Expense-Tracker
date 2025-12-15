const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const mongoose = require('mongoose');

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

module.exports = {
  setBudget,
  addExpense,
  updateExpense,
  deleteExpense,
  getMonthlySummary,
  getCategoryComparison,
  detectSpikes,
};

