const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');

const router = express.Router();

// Get all expenses for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, foodCourt, startDate, endDate } = req.query;
    
    const query = { userId: req.user._id };
    
    // Add filters
    if (category) query.category = category;
    if (foodCourt) query.foodCourt = new RegExp(foodCourt, 'i');
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Handle demo mode
    if (req.user._id === '507f1f77bcf86cd799439011') {
      // Return demo expenses
      const demoExpenses = [
        {
          _id: 'demo-expense-1',
          userId: { _id: '507f1f77bcf86cd799439011', name: 'Demo Student', email: 'demo@lpu.in' },
          item: 'Chicken Biryani',
          amount: 120,
          category: 'lunch',
          foodCourt: 'Food Court 1',
          description: 'Delicious biryani with raita',
          tags: ['spicy', 'rice'],
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          _id: 'demo-expense-2',
          userId: { _id: '507f1f77bcf86cd799439011', name: 'Demo Student', email: 'demo@lpu.in' },
          item: 'Coffee',
          amount: 25,
          category: 'beverage',
          foodCourt: 'Café',
          description: 'Morning coffee',
          tags: ['caffeine'],
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        },
        {
          _id: 'demo-expense-3',
          userId: { _id: '507f1f77bcf86cd799439011', name: 'Demo Student', email: 'demo@lpu.in' },
          item: 'Pizza',
          amount: 180,
          category: 'dinner',
          foodCourt: 'Food Court 2',
          description: 'Margherita pizza',
          tags: ['cheese', 'italian'],
          date: new Date(), // today
          createdAt: new Date()
        }
      ];

      return res.json({
        success: true,
        expenses: demoExpenses,
        pagination: {
          current: page,
          pages: 1,
          total: demoExpenses.length
        }
      });
    }

    const expenses = await Expense.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'name email');

    const total = await Expense.countDocuments(query);

    res.json({
      success: true,
      expenses,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ message: 'Error fetching expenses' });
  }
});

// Get expense by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json({ success: true, expense });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Error fetching expense' });
  }
});

// Create new expense
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { item, amount, category, foodCourt, description, tags, date } = req.body;

    // Validate required fields
    if (!item || !amount || !foodCourt) {
      return res.status(400).json({ 
        message: 'Item, amount, and food court are required' 
      });
    }
    

    // For demo mode, we'll simulate saving without actually persisting to DB
    if (req.user._id === '507f1f77bcf86cd799439011') {
      // Demo mode - return success without saving to database
      return res.status(201).json({
        message: 'Expense added successfully (Demo Mode)',
        expense: {
          _id: 'demo-expense-' + Date.now(),
          userId: req.user._id,
          item,
          amount: parseFloat(amount),
          category: category || 'other',
          foodCourt,
          description,
          tags: tags || [],
          date: date ? new Date(date) : new Date(),
          createdAt: new Date()
        }
      });
    }

    const expense = new Expense({
      userId: req.user._id,
      item,
      amount: parseFloat(amount),
      category: category || 'other',
      foodCourt,
      description,
      tags: tags || [],
      date: date ? new Date(date) : new Date()
    });

    await expense.save();

    // Update budget
    await Budget.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { currentSpent: parseFloat(amount) } },
      { upsert: true }
    );

    // Check budget status after adding expense
const updatedBudget = await Budget.findOne({ userId: req.user._id });
if (updatedBudget) {
  const percentage = (updatedBudget.currentSpent / updatedBudget.monthlyLimit) * 100;

  // Trigger notification if budget exceeded
  if (percentage >= 100) {
    const io = req.app.get('io');
    if (io) {
      io.to(req.user._id.toString()).emit('budgetExceeded', {
        spent: updatedBudget.currentSpent,
        limit: updatedBudget.monthlyLimit,
        percentage: percentage,
        exceededAmount: updatedBudget.currentSpent - updatedBudget.monthlyLimit
      });
    }
  }
}
// Check daily limit
const today = new Date();
today.setHours(0,0,0,0);
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

const todayExpenses = await Expense.find({
  userId: req.user._id,
  date: { $gte: today, $lt: tomorrow }
});

const dailySpent = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
if (updatedBudget.dailyLimit && dailySpent > updatedBudget.dailyLimit) {
  const io = req.app.get('io');
  if (io) {
    io.to(req.user._id.toString()).emit('dailyLimitExceeded', {
      spent: dailySpent,
      limit: updatedBudget.dailyLimit,
      exceededAmount: dailySpent - updatedBudget.dailyLimit
    });
  }
}



    res.status(201).json({ success: true, expense });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Error creating expense' });
  }
});

// Update expense
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { item, amount, category, foodCourt, description, tags, date } = req.body;

    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Calculate amount difference for budget update
    const oldAmount = expense.amount;
    const newAmount = parseFloat(amount);

    // Update expense
    expense.item = item || expense.item;
    expense.amount = newAmount;
    expense.category = category || expense.category;
    expense.foodCourt = foodCourt || expense.foodCourt;
    expense.description = description || expense.description;
    expense.tags = tags || expense.tags;
    expense.date = date ? new Date(date) : expense.date;

    await expense.save();

    // Update budget with amount difference
    const amountDifference = newAmount - oldAmount;
    await Budget.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { currentSpent: amountDifference } },
      { upsert: true }
    );

    res.json({ success: true, expense });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ message: 'Error updating expense' });
  }
});

// Delete expense
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    await Expense.findByIdAndDelete(req.params.id);

    // Update budget by subtracting the amount
    await Budget.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { currentSpent: -expense.amount } },
      { upsert: true }
    );

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Error deleting expense' });
  }
});

router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const { period, date } = req.query;
    const userId = req.user.id;

    const query = { userId };
    const now = new Date();

    if (period === 'today') {
      const start = new Date(now.setHours(0, 0, 0, 0));
      const end = new Date(now.setHours(23, 59, 59, 999));
      query.date = { $gte: start, $lte: end };
    } else if (period === 'week') {
      const start = new Date(now.setDate(now.getDate() - 7));
      query.date = { $gte: start };
    } else if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      query.date = { $gte: start };
    } else if (period === 'date' && date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      query.date = { $gte: start, $lte: end };
    }

    const expenses = await Expense.find(query);

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = expenses.length;

    const categoryStats = {};
    const foodCourtStats = {};
    const dailyStats = {};

    expenses.forEach(e => {
      categoryStats[e.category] = (categoryStats[e.category] || 0) + e.amount;
      foodCourtStats[e.foodCourt] = (foodCourtStats[e.foodCourt] || 0) + e.amount;
      const d = new Date(e.date).toISOString().split('T')[0];
      dailyStats[d] = (dailyStats[d] || 0) + e.amount;
    });

    res.json({
      stats: { totalSpent, totalExpenses, categoryStats, foodCourtStats, dailyStats }
    });
  } catch (err) {
    console.error('Error fetching analytics summary:', err);
    res.status(500).json({ message: 'Error generating analytics summary' });
  }
});

// Get dynamic insights and recommendations
router.get('/insights', authenticateToken, async (req, res) => {
  const userId = req.user._id;
  try {
    const expenses = await Expense.find({ userId });
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    const categoryStats = {};
    expenses.forEach(e => {
      categoryStats[e.category] = (categoryStats[e.category] || 0) + e.amount;
    });

    const recommendations = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todaySpent = expenses
      .filter(e => e.date >= today && e.date < tomorrow)
      .reduce((sum, e) => sum + e.amount, 0);

    const budget = await Budget.findOne({ userId });

    if (budget) {
      if (todaySpent > budget.dailyLimit) recommendations.push("You've exceeded your daily limit!");
      if (totalSpent > budget.monthlyLimit) recommendations.push("You've exceeded your monthly budget!");
      if (todaySpent < budget.dailyLimit * 0.5) recommendations.push("Great! You're below half of your daily limit.");
    }

    res.json({
      success: true,
      insights: {
        totalSpent,
        categoryStats,
        recommendations
      }
    });
  } catch (error) {
    console.error("Insights error:", error);
    res.status(500).json({ message: "Error fetching insights" });
  }
});


module.exports = router;
