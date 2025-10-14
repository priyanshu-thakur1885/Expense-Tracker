import React, { createContext, useContext, useReducer, useEffect } from 'react';
import toast from 'react-hot-toast';

const NotificationContext = createContext();

const initialState = {
  notifications: [],
  unreadCount: 0,
  settings: {
    budgetAlerts: true,
    expenseAlerts: true,
    weeklyReports: true,
    systemUpdates: true,
    soundEnabled: true
  }
};

const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      const newNotification = {
        id: Date.now() + Math.random(),
        ...action.payload,
        timestamp: new Date(),
        read: false
      };
      return {
        ...state,
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1
      };
    
    case 'MARK_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      };
    
    case 'MARK_ALL_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          read: true
        })),
        unreadCount: 0
      };
    
    case 'DELETE_NOTIFICATION':
      const notificationToDelete = state.notifications.find(n => n.id === action.payload);
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
        unreadCount: notificationToDelete && !notificationToDelete.read 
          ? Math.max(0, state.unreadCount - 1) 
          : state.unreadCount
      };
    
    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      };
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    
    default:
      return state;
  }
};

export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Load notifications from localStorage on mount
  useEffect(() => {
    // Get current user ID from auth context or token
    const getCurrentUserId = () => {
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
    };

    const userId = getCurrentUserId();
    if (!userId) return; // Don't load notifications if no user is logged in

    const userNotificationsKey = `notifications_${userId}`;
    const userSettingsKey = `notificationSettings_${userId}`;
    
    const savedNotifications = localStorage.getItem(userNotificationsKey);
    const savedSettings = localStorage.getItem(userSettingsKey);
    
    if (savedNotifications) {
      try {
        const notifications = JSON.parse(savedNotifications);
        notifications.forEach(notification => {
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              ...notification,
              timestamp: new Date(notification.timestamp)
            }
          });
        });
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
    
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        dispatch({
          type: 'UPDATE_SETTINGS',
          payload: settings
        });
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    const getCurrentUserId = () => {
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
    };

    const userId = getCurrentUserId();
    if (!userId) return; // Don't save if no user is logged in

    const userNotificationsKey = `notifications_${userId}`;
    localStorage.setItem(userNotificationsKey, JSON.stringify(state.notifications));
  }, [state.notifications]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const getCurrentUserId = () => {
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
    };

    const userId = getCurrentUserId();
    if (!userId) return; // Don't save if no user is logged in

    const userSettingsKey = `notificationSettings_${userId}`;
    localStorage.setItem(userSettingsKey, JSON.stringify(state.settings));
  }, [state.settings]);

  const addNotification = (notification) => {
    // Check if this type of notification is enabled
    const isEnabled = checkNotificationEnabled(notification.type);
    if (!isEnabled) return;

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: notification
    });

    // Show toast notification
    if (notification.type === 'budget_alert') {
      toast.error(notification.message, {
        duration: 5000,
        icon: '⚠️'
      });
    } else if (notification.type === 'expense_added') {
      toast.success(notification.message, {
        duration: 3000,
        icon: '💰'
      });
    } else if (notification.type === 'weekly_report') {
      toast(notification.message, {
        duration: 4000,
        icon: '📊'
      });
    } else {
      toast(notification.message, {
        duration: 3000
      });
    }

    // Play notification sound if enabled
    if (state.settings.soundEnabled) {
      playNotificationSound(notification.type);
    }
  };

  const checkNotificationEnabled = (type) => {
    switch (type) {
      case 'budget_alert':
        return state.settings.budgetAlerts;
      case 'expense_added':
      case 'expense_updated':
      case 'expense_deleted':
        return state.settings.expenseAlerts;
      case 'weekly_report':
        return state.settings.weeklyReports;
      case 'system_update':
        return state.settings.systemUpdates;
      default:
        return true;
    }
  };

  const playNotificationSound = (type) => {
    try {
      const audio = new Audio();
      if (type === 'budget_alert') {
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      } else {
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
      }
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (user might not have interacted with page)
      });
    } catch (error) {
      // Ignore audio errors
    }
  };

  const markAsRead = (id) => {
    dispatch({ type: 'MARK_AS_READ', payload: id });
  };

  const markAllAsRead = () => {
    dispatch({ type: 'MARK_ALL_AS_READ' });
  };

  const deleteNotification = (id) => {
    dispatch({ type: 'DELETE_NOTIFICATION', payload: id });
  };

  const clearAllNotifications = () => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
    // Also clear from localStorage for current user
    const getCurrentUserId = () => {
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
    };

    const userId = getCurrentUserId();
    if (userId) {
      const userNotificationsKey = `notifications_${userId}`;
      localStorage.removeItem(userNotificationsKey);
    }
  };

  const updateSettings = (settings) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  };

  // Notification generators for different events
  const generateBudgetAlert = (spent, limit, percentage) => {
    let message, severity;
    
    if (percentage >= 100) {
      message = `🚨 Budget exceeded! You've spent ₹${spent.toFixed(2)} out of ₹${limit.toFixed(2)}`;
      severity = 'critical';
    } else if (percentage >= 80) {
      message = `⚠️ Budget warning! You've used ${percentage.toFixed(1)}% of your monthly budget (₹${spent.toFixed(2)}/₹${limit.toFixed(2)})`;
      severity = 'warning';
    } else if (percentage >= 50) {
      message = `💡 Budget update: You've used ${percentage.toFixed(1)}% of your monthly budget (₹${spent.toFixed(2)}/₹${limit.toFixed(2)})`;
      severity = 'info';
    }
    
    if (message) {
      addNotification({
        type: 'budget_alert',
        title: 'Budget Alert',
        message,
        severity,
        data: { spent, limit, percentage }
      });
    }
  };

  const generateExpenseNotification = (type, amount, category) => {
    const messages = {
      expense_added: `💰 New expense added: ₹${amount.toFixed(2)} for ${category}`,
      expense_updated: `✏️ Expense updated: ₹${amount.toFixed(2)} for ${category}`,
      expense_deleted: `🗑️ Expense deleted: ₹${amount.toFixed(2)} for ${category}`
    };

    addNotification({
      type,
      title: 'Expense Update',
      message: messages[type],
      severity: 'info',
      data: { amount, category }
    });
  };

  const generateWeeklyReport = (totalSpent, avgDaily, topCategory) => {
    addNotification({
      type: 'weekly_report',
      title: 'Weekly Report',
      message: `📊 This week: ₹${totalSpent.toFixed(2)} spent, ₹${avgDaily.toFixed(2)}/day average. Top category: ${topCategory}`,
      severity: 'info',
      data: { totalSpent, avgDaily, topCategory }
    });
  };

  const generateSystemNotification = (title, message, severity = 'info') => {
    addNotification({
      type: 'system_update',
      title,
      message,
      severity
    });
  };

  const resetWelcomeNotification = () => {
    const getCurrentUserId = () => {
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
    };

    const userId = getCurrentUserId();
    if (userId) {
      localStorage.removeItem(`welcomeNotificationShown_${userId}`);
    }
  };

  const value = {
    ...state,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updateSettings,
    generateBudgetAlert,
    generateExpenseNotification,
    generateWeeklyReport,
    generateSystemNotification,
    resetWelcomeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
