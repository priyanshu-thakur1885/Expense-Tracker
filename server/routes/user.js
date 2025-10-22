const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const multer = require('multer');

const router = express.Router();

const ExcelJS = require('exceljs');

// Configure multer for profile picture upload
const profileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});


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
router.put('/profile', authenticateToken, profileUpload.single('photo'), async (req, res) => {
  try {
    const { name, preferences } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (preferences) updateData.preferences = { ...req.user.preferences, ...preferences };

    // Handle photo upload
    if (req.file) {
      // Convert buffer to base64
      const base64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;
      updateData.photo = `data:${mimeType};base64,${base64}`;
    }

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

// Permanently delete user account and all associated data
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const { confirmName } = req.body || {};

    // Require the user to send their exact name for confirmation
    if (!confirmName || confirmName.trim() !== req.user.name) {
      return res.status(400).json({ message: 'Please provide your full name to confirm account deletion' });
    }

    const userId = req.user._id;

    // Remove related data
    const Expense = require('../models/Expense');
    const Budget = require('../models/Budget');
    const Notification = require('../models/Notification');
    const BugReport = require('../models/BugReport');

    await Promise.all([
      Expense.deleteMany({ userId }),
      Budget.deleteMany({ userId }),
      Notification.deleteMany({ $or: [ { sentByUserId: userId }, { specificUserIds: userId } ] }),
      BugReport.deleteMany({ userId })
    ]);

    // Finally remove the user document
    await User.findByIdAndDelete(userId);

    // If sessions or other records exist, they should be cleaned up externally
    res.json({ success: true, message: 'Account and all data deleted permanently' });
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

    // Calculate weekly expenses (last 7 days including today, matching Analytics)
    const currentDate = new Date();
    const weekStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 6);
    const weekEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999);

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

// Export expenses as XLSX
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const Expense = require('../models/Expense');

    // Fetch all expenses for the user
    const expenses = await Expense.find({ userId: req.user._id }).sort({ date: -1 });

    // Prepare monthly summary for the last 12 months
    const now = new Date();
    const monthlyMap = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = { year: d.getFullYear(), month: d.getMonth() + 1, total: 0 };
    }

    expenses.forEach(exp => {
      const dt = new Date(exp.date);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { year: dt.getFullYear(), month: dt.getMonth() + 1, total: 0 };
      }
      monthlyMap[key].total += exp.amount;
    });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = req.user.name || req.user.email;
    workbook.created = new Date();

    // Expenses sheet
    const sheet = workbook.addWorksheet('Expenses');
    // Use an Excel-friendly date column and store actual Date objects so Excel displays real date/time
    sheet.columns = [
      { header: 'Date', key: 'date', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Food Court', key: 'foodCourt', width: 25 },
      { header: 'Amount', key: 'amount', width: 15 }
    ];

    expenses.forEach(exp => {
      // Ensure we pass a real Date object to ExcelJS
      const dateVal = exp.date ? new Date(exp.date) : new Date();
      sheet.addRow({
        date: dateVal,
        description: exp.description || exp.item || exp.title || '',
        category: exp.category || '',
        foodCourt: exp.foodCourt || '',
        amount: exp.amount
      });
    });;;;;;

    // Monthly Summary sheet
    const summary = workbook.addWorksheet('Monthly Summary');
    summary.columns = [
      { header: 'Year-Month', key: 'ym', width: 15 },
      { header: 'Total Spent', key: 'total', width: 15 }
    ];

    // Sort keys descending (most recent first)
    const keys = Object.keys(monthlyMap).sort((a, b) => b.localeCompare(a));
    keys.forEach(k => {
      summary.addRow({ ym: k, total: monthlyMap[k].total });
    });

    // Write workbook to buffer
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=expenses_${req.user._id}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Error exporting data' });
  }
});
