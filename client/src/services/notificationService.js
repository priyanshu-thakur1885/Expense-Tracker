import { useNotifications } from '../context/NotificationContext';

class NotificationService {
  constructor() {
    this.notifications = null;
    this.budgetCheckInterval = null;
    this.weeklyReportInterval = null;
    this.initialized = false;
  }

  getCurrentUserId() {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      }
    } catch (error) {
      console.error('Error parsing user token:', error);
    }
    return null;
  }

  initialize(notificationContext) {
    // Prevent multiple initializations
    if (this.initialized) return;
    
    this.notifications = notificationContext;
    this.startBudgetMonitoring();
    this.startWeeklyReports();
    this.generateWelcomeNotification();
    this.generateDailyTip();
    
    this.initialized = true;
  }

  generateWelcomeNotification() {
    if (!this.notifications) return;
    
    // Get current user ID
    const userId = this.getCurrentUserId();
    if (!userId) return;
    
    // Check if welcome notification was already shown for this user
    const welcomeShown = localStorage.getItem(`welcomeNotificationShown_${userId}`);
    if (welcomeShown) return;
    
    this.notifications.generateSystemNotification(
      'Welcome to Expense Tracker!',
      '🎉 Your expense tracking journey begins now. We\'ll keep you updated with important budget alerts and insights.',
      'success'
    );
    
    // Mark welcome notification as shown for this user
    localStorage.setItem(`welcomeNotificationShown_${userId}`, 'true');
  }

  startBudgetMonitoring() {
    // Check budget every 5 minutes
    this.budgetCheckInterval = setInterval(() => {
      this.checkBudgetStatus();
    }, 5 * 60 * 1000);
  }

  startWeeklyReports() {
    // Generate weekly report every Monday at 9 AM
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
    nextMonday.setHours(9, 0, 0, 0);
    
    const timeUntilMonday = nextMonday.getTime() - now.getTime();
    
    setTimeout(() => {
      this.generateWeeklyReport();
      // Then repeat every week
      this.weeklyReportInterval = setInterval(() => {
        this.generateWeeklyReport();
      }, 7 * 24 * 60 * 60 * 1000);
    }, timeUntilMonday);
  }

  async checkBudgetStatus() {
    if (!this.notifications) return;

    try {
      // Fetch current budget data
      const response = await fetch('http://localhost:5000/api/budget');
      if (!response.ok) return;
      
      const data = await response.json();
      const budget = data.budget;
      
      if (!budget || !budget.monthlyLimit) return;

      const spent = budget.currentSpent || 0;
      const limit = budget.monthlyLimit;
      const percentage = (spent / limit) * 100;

      // Generate budget alerts based on spending
      if (percentage >= 100) {
        // Budget exceeded - show critical alert
        this.generateBudgetExceededAlert(spent, limit, percentage);
      } else if (percentage >= 80 && percentage < 100) {
        // Budget warning - show warning alert
        this.generateBudgetWarningAlert(spent, limit, percentage);
      } else if (percentage >= 50 && percentage < 80) {
        // Only show 50% alert once per day for this user
        const userId = this.getCurrentUserId();
        if (!userId) return;
        
        const lastAlert = localStorage.getItem(`lastBudgetAlert_${userId}`);
        const today = new Date().toDateString();
        
        if (lastAlert !== today) {
          this.notifications.generateBudgetAlert(spent, limit, percentage);
          localStorage.setItem(`lastBudgetAlert_${userId}`, today);
        }
      }
    } catch (error) {
      console.error('Error checking budget status:', error);
    }
  }

  generateBudgetExceededAlert(spent, limit, percentage) {
    if (!this.notifications) return;

    // Get current user ID
    const userId = this.getCurrentUserId();
    if (!userId) return;

    // Check if we already showed this alert today to avoid spam for this user
    const lastExceededAlert = localStorage.getItem(`lastBudgetExceededAlert_${userId}`);
    const today = new Date().toDateString();
    
    if (lastExceededAlert === today) return;

    const exceededAmount = spent - limit;
    
    this.notifications.addNotification({
      type: 'budget_alert',
      title: '🚨 Budget Exceeded!',
      message: `Your monthly budget has been exceeded by ₹${exceededAmount.toFixed(2)}! You've spent ₹${spent.toFixed(2)} out of ₹${limit.toFixed(2)} (${percentage.toFixed(1)}%). Please review your spending.`,
      severity: 'critical',
      data: { spent, limit, percentage, exceededAmount }
    });

    // Mark this alert as shown today for this user
    localStorage.setItem(`lastBudgetExceededAlert_${userId}`, today);
  }

  generateBudgetWarningAlert(spent, limit, percentage) {
    if (!this.notifications) return;

    // Get current user ID
    const userId = this.getCurrentUserId();
    if (!userId) return;

    // Check if we already showed this warning today for this user
    const lastWarningAlert = localStorage.getItem(`lastBudgetWarningAlert_${userId}`);
    const today = new Date().toDateString();
    
    if (lastWarningAlert === today) return;

    const remaining = limit - spent;
    
    this.notifications.addNotification({
      type: 'budget_alert',
      title: '⚠️ Budget Warning',
      message: `You've used ${percentage.toFixed(1)}% of your monthly budget! Only ₹${remaining.toFixed(2)} remaining out of ₹${limit.toFixed(2)}. Please spend wisely.`,
      severity: 'warning',
      data: { spent, limit, percentage, remaining }
    });

    // Mark this warning as shown today for this user
    localStorage.setItem(`lastBudgetWarningAlert_${userId}`, today);
  }

  async generateWeeklyReport() {
    if (!this.notifications) return;

    try {
      // Fetch expenses for the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const response = await fetch(`http://localhost:5000/api/expenses/stats/summary?period=week`);
      if (!response.ok) return;
      
      const data = await response.json();
      
      if (data && data.totalSpent > 0) {
        const totalSpent = data.totalSpent;
        const avgDaily = totalSpent / 7;
        const topCategory = data.topCategory || 'Food';
        
        this.notifications.generateWeeklyReport(totalSpent, avgDaily, topCategory);
      }
    } catch (error) {
      console.error('Error generating weekly report:', error);
    }
  }

  generateExpenseInsight(expense) {
    if (!this.notifications) return;

    const { amount, category } = expense;
    
    // Check budget status immediately after adding expense
    this.checkBudgetStatusAfterExpense(amount);
    
    // Generate insights based on expense patterns
    if (amount > 500) {
      this.notifications.generateSystemNotification(
        'High Expense Alert',
        `💰 You just spent ₹${amount.toFixed(2)} on ${category}. Consider if this fits your budget!`,
        'warning'
      );
    }
    
    // Get current user ID
    const userId = this.getCurrentUserId();
    if (!userId) return;

    // Check for frequent spending in same category for this user
    const recentExpenses = JSON.parse(localStorage.getItem(`recentExpenses_${userId}`) || '[]');
    const sameCategoryExpenses = recentExpenses.filter(
      exp => exp.category === category && 
      new Date(exp.date) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    
    if (sameCategoryExpenses.length >= 3) {
      this.notifications.generateSystemNotification(
        'Spending Pattern Alert',
        `📊 You've made ${sameCategoryExpenses.length + 1} expenses in ${category} today. Consider reviewing your spending pattern.`,
        'info'
      );
    }
    
    // Update recent expenses for this user
    recentExpenses.push({ ...expense, date: new Date() });
    if (recentExpenses.length > 10) {
      recentExpenses.shift();
    }
    localStorage.setItem(`recentExpenses_${userId}`, JSON.stringify(recentExpenses));
  }

  async checkBudgetStatusAfterExpense(newExpenseAmount) {
    if (!this.notifications) return;

    try {
      // Fetch current budget data
      const response = await fetch('http://localhost:5000/api/budget');
      if (!response.ok) return;
      
      const data = await response.json();
      const budget = data.budget;
      
      if (!budget || !budget.monthlyLimit) return;

      const spent = budget.currentSpent || 0;
      const limit = budget.monthlyLimit;
      const percentage = (spent / limit) * 100;

      // Check if this expense caused budget to be exceeded
      if (percentage >= 100) {
        const exceededAmount = spent - limit;
        this.notifications.addNotification({
          type: 'budget_alert',
          title: '🚨 Budget Exceeded!',
          message: `This expense caused you to exceed your budget by ₹${exceededAmount.toFixed(2)}! You've now spent ₹${spent.toFixed(2)} out of ₹${limit.toFixed(2)}.`,
          severity: 'critical',
          data: { spent, limit, percentage, exceededAmount }
        });
      } else if (percentage >= 80 && percentage < 100) {
        const remaining = limit - spent;
        this.notifications.addNotification({
          type: 'budget_alert',
          title: '⚠️ Budget Warning',
          message: `This expense brought you to ${percentage.toFixed(1)}% of your budget! Only ₹${remaining.toFixed(2)} remaining.`,
          severity: 'warning',
          data: { spent, limit, percentage, remaining }
        });
      }
    } catch (error) {
      console.error('Error checking budget after expense:', error);
    }
  }

  generateBudgetTip() {
    if (!this.notifications) return;

    const tips = [
      {
        title: 'Budget Tip',
        message: '💡 Try the 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings!',
        severity: 'info'
      },
      {
        title: 'Money Saving Tip',
        message: '🍎 Consider meal prepping to reduce food court expenses!',
        severity: 'info'
      },
      {
        title: 'Smart Spending',
        message: '📱 Use the app to track expenses immediately after purchase for better accuracy!',
        severity: 'info'
      },
      {
        title: 'Budget Reminder',
        message: '⏰ Set a daily spending limit to stay within your monthly budget!',
        severity: 'info'
      }
    ];

    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    this.notifications.generateSystemNotification(
      randomTip.title,
      randomTip.message,
      randomTip.severity
    );
  }

  generateDailyTip() {
    // Generate a daily tip at 8 AM
    const now = new Date();
    const next8AM = new Date(now);
    next8AM.setHours(8, 0, 0, 0);
    
    if (now.getHours() >= 8) {
      next8AM.setDate(next8AM.getDate() + 1);
    }
    
    const timeUntil8AM = next8AM.getTime() - now.getTime();
    
    setTimeout(() => {
      this.generateBudgetTip();
      // Then repeat every 24 hours
      setInterval(() => {
        this.generateBudgetTip();
      }, 24 * 60 * 60 * 1000);
    }, timeUntil8AM);
  }

  // Manual budget check function for immediate notifications
  async checkBudgetNow() {
    await this.checkBudgetStatus();
  }

  // Test function to simulate budget exceeded (for testing)
  testBudgetExceeded() {
    if (!this.notifications) return;
    
    this.notifications.addNotification({
      type: 'budget_alert',
      title: '🚨 Budget Exceeded!',
      message: 'Your monthly budget has been exceeded by ₹500.00! You\'ve spent ₹4,500.00 out of ₹4,000.00 (112.5%). Please review your spending.',
      severity: 'critical',
      data: { spent: 4500, limit: 4000, percentage: 112.5, exceededAmount: 500 }
    });
  }

  cleanup() {
    if (this.budgetCheckInterval) {
      clearInterval(this.budgetCheckInterval);
      this.budgetCheckInterval = null;
    }
    if (this.weeklyReportInterval) {
      clearInterval(this.weeklyReportInterval);
      this.weeklyReportInterval = null;
    }
    this.initialized = false;
  }
}

export default new NotificationService();
