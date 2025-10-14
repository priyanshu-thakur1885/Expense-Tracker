const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

const router = express.Router();

// Get user's budget
router.get('/', authenticateToken, async (req, res) => {
  try {
    let budget = await Budget.findOne({ userId: req.user._id });
    
    if (!budget) {
      // Create default budget if none exists
      budget = new Budget({
        userId: req.user._id,
        monthlyLimit: 4000, // Default ₹4000
        currentSpent: 0
      });
      await budget.save();
    }

    res.json({ success: true, budget });
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({ message: 'Error fetching budget' });
  }
});

// Create or update budget
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { monthlyLimit, currency = 'INR' } = req.body;

    if (!monthlyLimit || monthlyLimit < 100 || monthlyLimit > 50000) {
      return res.status(400).json({ 
        message: 'Monthly limit must be between ₹100 and ₹50,000' 
      });
    }

    // Calculate current spent amount from expenses
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const expenses = await Expense.find({
      userId: req.user._id,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const currentSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id },
      {
        monthlyLimit: parseFloat(monthlyLimit),
        currentSpent,
        currency,
        startDate: startOfMonth,
        endDate: endOfMonth
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, budget });
  } catch (error) {
    console.error('Create/update budget error:', error);
    res.status(500).json({ message: 'Error creating/updating budget' });
  }
});

// Update budget
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { monthlyLimit, currency, notifications } = req.body;

    const updateData = {};
    if (monthlyLimit !== undefined) {
      if (monthlyLimit < 100 || monthlyLimit > 50000) {
        return res.status(400).json({ 
          message: 'Monthly limit must be between ₹100 and ₹50,000' 
        });
      }
      updateData.monthlyLimit = parseFloat(monthlyLimit);
    }
    if (currency) updateData.currency = currency;
    if (notifications) updateData.notifications = notifications;

    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id },
      updateData,
      { new: true }
    );

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json({ success: true, budget });
  } catch (error) {
    console.error('Update budget error:', error);
    res.status(500).json({ message: 'Error updating budget' });
  }
});

// Reset budget for new month
router.post('/reset', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id },
      {
        currentSpent: 0,
        startDate: startOfMonth,
        endDate: endOfMonth
      },
      { new: true }
    );

    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    res.json({ success: true, budget, message: 'Budget reset for new month' });
  } catch (error) {
    console.error('Reset budget error:', error);
    res.status(500).json({ message: 'Error resetting budget' });
  }
});

// Get budget insights and recommendations
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    // Handle demo mode
    if (req.user._id === '507f1f77bcf86cd799439011') {
      const demoInsights = {
        budget: {
          monthlyLimit: 4000,
          currentSpent: 325,
          remaining: 3675
        },
        insights: {
          dailyTarget: 118.55,
          daysRemaining: 31,
          spendingRate: 'Good',
          recommendations: [
            'You are on track with your budget!',
            'Consider trying the new café for cheaper coffee options.',
            'Your lunch spending is reasonable.'
          ]
        }
      };
      return res.json({ success: true, ...demoInsights });
    }

    const budget = await Budget.findOne({ userId: req.user._id });
    
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate() + 1;
    const remainingBudget = budget.monthlyLimit - budget.currentSpent;
    const dailyTarget = daysRemaining > 0 ? remainingBudget / daysRemaining : 0;

    // Get recent expenses for analysis
    const recentExpenses = await Expense.find({
      userId: req.user._id,
      date: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) }
    }).sort({ date: -1 }).limit(10);

    // Calculate average daily spending
    const daysPassed = now.getDate();
    const averageDailySpending = daysPassed > 0 ? budget.currentSpent / daysPassed : 0;

    // Generate insights
    const insights = {
      budgetStatus: budget.status,
      spendingPercentage: budget.spendingPercentage,
      remainingBudget,
      dailyTarget,
      averageDailySpending,
      daysRemaining,
      recommendations: []
    };

    // Add recommendations based on spending patterns
    if (budget.spendingPercentage > 80) {
      insights.recommendations.push({
        type: 'warning',
        message: 'You\'ve used over 80% of your budget. Consider reducing daily expenses.',
        action: 'Reduce daily spending to ₹' + Math.round(dailyTarget) + ' per day'
      });
    } else if (budget.spendingPercentage > 50) {
      insights.recommendations.push({
        type: 'info',
        message: 'You\'re halfway through your budget. Stay mindful of spending.',
        action: 'Aim to spend no more than ₹' + Math.round(dailyTarget) + ' per day'
      });
    } else {
      insights.recommendations.push({
        type: 'success',
        message: 'Great job! You\'re well within your budget.',
        action: 'You can spend up to ₹' + Math.round(dailyTarget) + ' per day'
      });
    }

    // Add food court recommendations
    const foodCourtStats = {};
    recentExpenses.forEach(expense => {
      foodCourtStats[expense.foodCourt] = (foodCourtStats[expense.foodCourt] || 0) + expense.amount;
    });

    const mostExpensiveCourt = Object.entries(foodCourtStats)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostExpensiveCourt) {
      insights.recommendations.push({
        type: 'tip',
        message: `You spend most at ${mostExpensiveCourt[0]}. Consider trying other food courts.`,
        action: 'Explore cheaper alternatives to save money'
      });
    }

    res.json({ success: true, insights });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ message: 'Error fetching insights' });
  }
});

module.exports = router;
