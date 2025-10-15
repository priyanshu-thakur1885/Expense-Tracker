const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Get all users with their spending statistics
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('Admin users request from:', req.user.email);
    
    const users = await User.find({ isActive: true }).select('name email photo createdAt');
    console.log('Found users:', users.length);
    
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Get total spending for this user
        const expenses = await Expense.find({ userId: user._id });
        console.log(`Expenses for user ${user.email}:`, expenses.length);
        const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const totalExpenses = expenses.length;
        
        // Get recent expenses (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentExpenses = expenses.filter(expense => expense.date >= thirtyDaysAgo);
        const recentSpent = recentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        // Get category breakdown
        const categoryStats = {};
        expenses.forEach(expense => {
          categoryStats[expense.category] = (categoryStats[expense.category] || 0) + expense.amount;
        });
        
        // Get food court breakdown
        const foodCourtStats = {};
        expenses.forEach(expense => {
          if (expense.foodCourt) {
            foodCourtStats[expense.foodCourt] = (foodCourtStats[expense.foodCourt] || 0) + expense.amount;
          }
        });
        
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          photo: user.photo,
          joinedAt: user.createdAt,
          totalSpent,
          totalExpenses,
          recentSpent,
          recentExpenses: recentExpenses.length,
          categoryStats,
          foodCourtStats,
          averageExpense: totalExpenses > 0 ? totalSpent / totalExpenses : 0
        };
      })
    );
    
    // Sort by total spending (descending)
    usersWithStats.sort((a, b) => b.totalSpent - a.totalSpent);
    
    res.json({
      success: true,
      users: usersWithStats,
      totalUsers: usersWithStats.length
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ message: 'Error fetching users data' });
  }
});

// Get overall platform statistics
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalExpenses = await Expense.countDocuments();
    const totalSpent = await Expense.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Get expenses by category
    const categoryStats = await Expense.aggregate([
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    
    // Get expenses by food court
    const foodCourtStats = await Expense.aggregate([
      { $match: { foodCourt: { $exists: true, $ne: null } } },
      { $group: { _id: '$foodCourt', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    
    // Get daily spending for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyStats = await Expense.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      { $group: { 
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);
    
    // Get top spenders
    const topSpenders = await Expense.aggregate([
      { $group: { _id: '$userId', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { 
        userId: '$_id',
        name: '$user.name',
        email: '$user.email',
        total: 1,
        count: 1
      }},
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalExpenses,
        totalSpent: totalSpent[0]?.total || 0,
        averageSpentPerUser: totalUsers > 0 ? (totalSpent[0]?.total || 0) / totalUsers : 0,
        averageExpenseAmount: totalExpenses > 0 ? (totalSpent[0]?.total || 0) / totalExpenses : 0,
        categoryStats,
        foodCourtStats,
        dailyStats,
        topSpenders
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Error fetching platform statistics' });
  }
});

// Send notification to all users
router.post('/notifications/send', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, message, type = 'info', targetUsers = 'all', specificUserIds = [], personalUserId = null } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    
    // Create notification in database
    const notification = new Notification({
      title,
      message,
      type: personalUserId ? 'personal' : type,
      targetUsers: personalUserId ? 'personal' : targetUsers,
      specificUserIds: personalUserId ? [personalUserId] : (targetUsers === 'specific' ? specificUserIds : []),
      sentBy: req.user.email,
      sentByUserId: req.user._id,
      isPersonal: !!personalUserId
    });
    
    await notification.save();
    
    console.log('Admin notification sent:', {
      id: notification._id,
      title,
      message,
      type: notification.type,
      targetUsers: notification.targetUsers,
      isPersonal: notification.isPersonal,
      sentBy: req.user.email
    });
    
    res.json({
      success: true,
      message: personalUserId ? 'Personal message sent successfully' : 'Notification sent successfully',
      notification: {
        id: notification._id,
        title,
        message,
        type: notification.type,
        targetUsers: notification.targetUsers,
        sentBy: req.user.email,
        isPersonal: notification.isPersonal,
        createdAt: notification.createdAt
      }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ message: 'Error sending notification' });
  }
});

// Get user details by ID
router.get('/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('name email photo createdAt preferences');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's expenses
    const expenses = await Expense.find({ userId }).sort({ date: -1 });
    
    // Get user's budgets
    const budgets = await Budget.find({ userId });
    
    // Calculate statistics
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryStats = {};
    const foodCourtStats = {};
    
    expenses.forEach(expense => {
      categoryStats[expense.category] = (categoryStats[expense.category] || 0) + expense.amount;
      if (expense.foodCourt) {
        foodCourtStats[expense.foodCourt] = (foodCourtStats[expense.foodCourt] || 0) + expense.amount;
      }
    });
    
    res.json({
      success: true,
      user: {
        ...user.toObject(),
        totalSpent,
        totalExpenses: expenses.length,
        averageExpense: expenses.length > 0 ? totalSpent / expenses.length : 0,
        categoryStats,
        foodCourtStats,
        expenses: expenses.slice(0, 20), // Last 20 expenses
        budgets
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ message: 'Error fetching user details' });
  }
});

// Get notifications for current user
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get notifications for this user (all notifications or specific ones)
    const notifications = await Notification.find({
      $or: [
        { targetUsers: 'all' },
        { specificUserIds: userId },
        { targetUsers: 'personal', specificUserIds: userId }
      ],
      expiresAt: { $gt: new Date() }
    })
    .sort({ createdAt: -1 })
    .limit(50);
    
    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
});

// Mark notification as read
router.post('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;
    
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if user already read this notification
    const alreadyRead = notification.readBy.some(read => read.userId.toString() === userId.toString());
    
    if (!alreadyRead) {
      notification.readBy.push({
        userId,
        readAt: new Date()
      });
      await notification.save();
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Error marking notification as read' });
  }
});

// Reply to personal notification
router.post('/notifications/:notificationId/reply', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { message } = req.body;
    const userId = req.user._id;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Reply message is required' });
    }
    
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    // Check if this is a personal notification for this user
    if (!notification.isPersonal || !notification.specificUserIds.includes(userId)) {
      return res.status(403).json({ message: 'You can only reply to personal notifications sent to you' });
    }
    
    // Add reply to notification
    notification.replies.push({
      userId,
      userName: req.user.name,
      userEmail: req.user.email,
      message: message.trim()
    });
    
    await notification.save();
    
    res.json({
      success: true,
      message: 'Reply sent successfully',
      reply: {
        userId,
        userName: req.user.name,
        userEmail: req.user.email,
        message: message.trim(),
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Reply to notification error:', error);
    res.status(500).json({ message: 'Error sending reply' });
  }
});

// Get replies for personal notifications sent by admin
router.get('/notifications/replies', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const adminUserId = req.user._id;
    
    // Get all personal notifications sent by this admin that have replies
    const notificationsWithReplies = await Notification.find({
      sentByUserId: adminUserId,
      isPersonal: true,
      'replies.0': { $exists: true } // Has at least one reply
    })
    .populate('specificUserIds', 'name email photo')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      notifications: notificationsWithReplies
    });
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ message: 'Error fetching replies' });
  }
});

module.exports = router;
