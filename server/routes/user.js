const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, preferences } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-__v');

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { currency, notifications, theme } = req.body;
    
    const preferences = { ...req.user.preferences };
    if (currency) preferences.currency = currency;
    if (notifications !== undefined) preferences.notifications = notifications;
    if (theme) preferences.theme = theme;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferences },
      { new: true }
    ).select('-__v');

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Error updating preferences' });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    // Soft delete - mark as inactive
    await User.findByIdAndUpdate(req.user._id, { isActive: false });
    
    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Error deleting account' });
  }
});

// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Handle demo mode
    if (req.user._id === '507f1f77bcf86cd799439011') {
      const demoData = {
        user: req.user,
        recentExpenses: [
          {
            _id: 'demo-expense-1',
            item: 'Chicken Biryani',
            amount: 120,
            category: 'lunch',
            foodCourt: 'Food Court 1',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          },
          {
            _id: 'demo-expense-2',
            item: 'Coffee',
            amount: 25,
            category: 'beverage',
            foodCourt: 'Café',
            date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          },
          {
            _id: 'demo-expense-3',
            item: 'Pizza',
            amount: 180,
            category: 'dinner',
            foodCourt: 'Food Court 2',
            date: new Date()
          }
        ],
        budget: {
          monthlyLimit: 4000,
          currentSpent: 325,
          remaining: 3675
        },
        stats: {
          totalExpenses: 325,
          averageDaily: 108.33,
          topCategory: 'lunch',
          topFoodCourt: 'Food Court 1'
        }
      };
      return res.json({ success: true, ...demoData });
    }

    const Expense = require('../models/Expense');
    const Budget = require('../models/Budget');
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get current month expenses
    const expenses = await Expense.find({
      userId: req.user._id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ date: -1 }).limit(5);

    // Get budget
    let budget = await Budget.findOne({ userId: req.user._id });
    if (!budget) {
      budget = new Budget({
        userId: req.user._id,
        monthlyLimit: 4000,
        currentSpent: 0
      });
      await budget.save();
    }

    // Calculate today's expenses
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayExpenses = await Expense.find({
      userId: req.user._id,
      date: { $gte: today, $lt: tomorrow }
    });

    const todaySpent = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate weekly expenses
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekExpenses = await Expense.find({
      userId: req.user._id,
      date: { $gte: weekStart, $lte: weekEnd }
    });

    const weekSpent = weekExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    res.json({
      success: true,
      dashboard: {
        user: {
          name: req.user.name,
          photo: req.user.photo
        },
        budget: {
          monthlyLimit: budget.monthlyLimit,
          currentSpent: budget.currentSpent,
          remaining: budget.remainingBudget,
          percentage: budget.spendingPercentage,
          status: budget.status,
          dailyTarget: budget.dailyTarget
        },
        today: {
          spent: todaySpent,
          expenses: todayExpenses.length
        },
        week: {
          spent: weekSpent,
          expenses: weekExpenses.length
        },
        recentExpenses: expenses
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

module.exports = router;
