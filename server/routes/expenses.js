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

// Get expense statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    // Read query params early so they are available in demo mode too
    const { period = 'month', date } = req.query;
    // Handle demo mode
    if (req.user._id === '507f1f77bcf86cd799439011') {
      let demoStats;
      
      if (period === 'today') {
        demoStats = {
          totalSpent: 180,
          totalExpenses: 1,
          averageExpense: 180,
          categoryStats: { dinner: 180 },
          foodCourtStats: { 'Food Court 2': 180 },
          dailyStats: { [new Date().toISOString().split('T')[0]]: 180 },
          period,
          startDate: new Date(new Date().setHours(0, 0, 0, 0)),
          endDate: new Date(new Date().setHours(23, 59, 59, 999))
        };
      } else if (period === 'date') {
        // For specific date, check if it matches one of our demo dates
        const selectedDateStr = date;
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const dayBeforeYesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        let dailyAmount = 0;
        let categoryStats = {};
        let foodCourtStats = {};
        
        if (selectedDateStr === today) {
          dailyAmount = 180;
          categoryStats = { dinner: 180 };
          foodCourtStats = { 'Food Court 2': 180 };
        } else if (selectedDateStr === yesterday) {
          dailyAmount = 25;
          categoryStats = { beverage: 25 };
          foodCourtStats = { 'Café': 25 };
        } else if (selectedDateStr === dayBeforeYesterday) {
          dailyAmount = 120;
          categoryStats = { lunch: 120 };
          foodCourtStats = { 'Food Court 1': 120 };
        } else {
          // For any other date, show some random demo data based on the date
          const dateObj = new Date(selectedDateStr);
          const dayOfWeek = dateObj.getDay();
          const dayOfMonth = dateObj.getDate();
          
          // Generate different amounts based on day of week and day of month
          if (dayOfWeek === 0 || dayOfWeek === 6) { // Weekend
            dailyAmount = Math.floor(Math.random() * 200) + 50; // 50-250
            categoryStats = { snacks: dailyAmount };
            foodCourtStats = { 'Weekend Café': dailyAmount };
          } else if (dayOfMonth % 7 === 0) { // Every 7th day
            dailyAmount = Math.floor(Math.random() * 300) + 100; // 100-400
            categoryStats = { lunch: dailyAmount };
            foodCourtStats = { 'Special Court': dailyAmount };
          } else {
            dailyAmount = Math.floor(Math.random() * 150) + 30; // 30-180
            categoryStats = { breakfast: dailyAmount };
            foodCourtStats = { 'Regular Court': dailyAmount };
          }
        }
        
        demoStats = {
          totalSpent: dailyAmount,
          totalExpenses: dailyAmount > 0 ? 1 : 0,
          averageExpense: dailyAmount,
          categoryStats,
          foodCourtStats,
          dailyStats: { [selectedDateStr]: dailyAmount },
          period,
          startDate: new Date(selectedDateStr + 'T00:00:00'),
          endDate: new Date(selectedDateStr + 'T23:59:59')
        };
      } else {
        demoStats = {
          totalSpent: 325,
          totalExpenses: 3,
          averageExpense: 108.33,
          categoryStats: { lunch: 120, beverage: 25, dinner: 180 },
          foodCourtStats: { 'Food Court 1': 120, 'Café': 25, 'Food Court 2': 180 },
          dailyStats: {
            [new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]: 120,
            [new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]: 25,
            [new Date().toISOString().split('T')[0]]: 180
          },
          period,
          startDate: new Date(),
          endDate: new Date()
        };
      }
      
      return res.json({ success: true, stats: demoStats });
    }

    const userId = req.user._id;
    
    console.log('Analytics request - Period:', period, 'Date:', date, 'User:', userId);
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'date':
        if (!date) {
          return res.status(400).json({ message: 'Date parameter is required for date period' });
        }
        
        // Parse the date string properly (YYYY-MM-DD format)
        const dateParts = date.split('-');
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
        const day = parseInt(dateParts[2]);
        
        // Create dates in local timezone to avoid timezone issues
        startDate = new Date(year, month, day, 0, 0, 0, 0);
        endDate = new Date(year, month, day, 23, 59, 59, 999);
        
        console.log('Date filtering - Start:', startDate, 'End:', endDate, 'Original date:', date);
        console.log('Date range in ISO:', startDate.toISOString(), 'to', endDate.toISOString());
        break;
      case 'week':
        // Last 7 days (including today)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    let expenses;
    
    if (period === 'date') {
      // For specific date, use string comparison to avoid timezone issues
      const allExpenses = await Expense.find({ userId });
      
      console.log('All expenses for user:', allExpenses.length);
      console.log('All expense dates:', allExpenses.map(exp => exp.date.toISOString().split('T')[0]));
      
      // Filter expenses by the selected date
      const targetDateStr = date; // This is in YYYY-MM-DD format
      expenses = allExpenses.filter(expense => {
  const expenseDate = new Date(expense.date);
  return (
    expenseDate.getFullYear() === startDate.getFullYear() &&
    expenseDate.getMonth() === startDate.getMonth() &&
    expenseDate.getDate() === startDate.getDate()
  );
});

      
      console.log('Found expenses for date', targetDateStr, ':', expenses.length);
      console.log('Filtered expense dates:', expenses.map(exp => exp.date.toISOString().split('T')[0]));
    } else {
      // For other periods, use the original date range approach
      expenses = await Expense.find({
        userId,
        date: { $gte: startDate, $lte: endDate }
      });
      
      console.log('Found expenses:', expenses.length, 'for date range:', startDate, 'to', endDate);
    }

    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryStats = {};
    const foodCourtStats = {};
    const dailyStats = {};

    expenses.forEach(expense => {
      // Category statistics
      categoryStats[expense.category] = (categoryStats[expense.category] || 0) + expense.amount;
      
      // Food court statistics
      foodCourtStats[expense.foodCourt] = (foodCourtStats[expense.foodCourt] || 0) + expense.amount;
      
      // Daily statistics
      const day = expense.date.toISOString().split('T')[0];
      dailyStats[day] = (dailyStats[day] || 0) + expense.amount;
    });

    const finalStats = {
      totalSpent,
      totalExpenses: expenses.length,
      averageExpense: expenses.length > 0 ? totalSpent / expenses.length : 0,
      categoryStats,
      foodCourtStats,
      dailyStats,
      period,
      startDate,
      endDate
    };
    
    console.log('Returning stats:', finalStats);
    
    res.json({
      success: true,
      stats: finalStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
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
