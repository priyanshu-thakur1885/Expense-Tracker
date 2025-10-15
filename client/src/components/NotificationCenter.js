import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  Settings, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  Clock,
  Volume2,
  VolumeX,
  Crown
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const NotificationCenter = () => {
  const {
    notifications,
    unreadCount,
    settings,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    updateSettings
  } = useNotifications();
  
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [loadingAdminNotifications, setLoadingAdminNotifications] = useState(false);
  const API_BASE = process.env.REACT_APP_API_URL || '';

  // Calculate total unread count including admin notifications
  const totalUnreadCount = unreadCount + adminNotifications.filter(n => !n.isRead).length;

  // Fetch admin notifications
  const fetchAdminNotifications = async () => {
    if (!user) return;
    
    try {
      setLoadingAdminNotifications(true);
      const response = await fetch(`${API_BASE}/api/admin/notifications`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAdminNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setLoadingAdminNotifications(false);
    }
  };

  // Mark admin notification as read
  const markAdminNotificationAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        // Update local state
        setAdminNotifications(prev => 
          prev.map(notif => 
            notif._id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking admin notification as read:', error);
    }
  };

  // Fetch admin notifications when component mounts or user changes
  useEffect(() => {
    if (user && isOpen) {
      fetchAdminNotifications();
    }
  }, [user, isOpen]);

  // Debug logging
  useEffect(() => {
    console.log('NotificationCenter Debug:', {
      notifications: notifications.length,
      adminNotifications: adminNotifications.length,
      totalUnreadCount,
      isOpen
    });
  }, [notifications, adminNotifications, totalUnreadCount, isOpen]);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'success':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const handleSettingChange = (key, value) => {
    updateSettings({ [key]: value });
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-200"
      >
        <Bell className="w-5 h-5" />
        {totalUnreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium"
          >
            {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
          </motion.span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[500px] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  {totalUnreadCount > 0 && (
                    <span className="bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs px-2 py-1 rounded-full">
                      {totalUnreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1 text-gray-400 hover:text-primary-600 rounded"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50"
              >
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Notification Settings
                </h4>
                <div className="space-y-2">
                  {Object.entries(settings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-300 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <button
                        onClick={() => handleSettingChange(key, !value)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                          value ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 ${
                            value ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Admin Notifications Section */}
            {adminNotifications.length > 0 && (
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-l-4 border-yellow-400">
                  <div className="flex items-center space-x-2">
                    <Crown className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                      Admin Notifications
                    </h3>
                    <span className="bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded-full font-medium">
                      {adminNotifications.filter(n => !n.isRead).length} unread
                    </span>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {adminNotifications.map((notification) => (
                      <motion.div
                        key={notification._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`p-4 border-l-4 ${
                          notification.type === 'error' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/20' :
                          notification.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                          notification.type === 'success' ? 'border-l-green-500 bg-green-50 dark:bg-green-900/20' :
                          'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        } ${
                          !notification.isRead ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {notification.type === 'error' ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                             notification.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> :
                             notification.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                             <Info className="w-4 h-4 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className={`text-sm font-medium ${
                                !notification.isRead 
                                  ? 'text-gray-900 dark:text-white' 
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {notification.title}
                              </h4>
                              <div className="flex items-center space-x-1">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </span>
                                {!notification.isRead && (
                                  <button
                                    onClick={() => markAdminNotificationAsRead(notification._id)}
                                    className="p-1 text-gray-400 hover:text-green-600 rounded"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className={`text-sm mt-1 ${
                              !notification.isRead 
                                ? 'text-gray-700 dark:text-gray-300' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {notification.message}
                            </p>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                              <span>From: {notification.sentBy}</span>
                              {!notification.isRead && (
                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs font-medium">
                                  New
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Regular Notifications List */}
            {notifications.length > 0 && (
              <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-l-4 border-blue-400">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                      Your Notifications
                    </h3>
                    <span className="bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full font-medium">
                      {notifications.filter(n => !n.read).length} unread
                    </span>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`p-4 border-l-4 ${getSeverityColor(notification.severity)} ${
                        !notification.read ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getSeverityIcon(notification.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-medium ${
                              !notification.read 
                                ? 'text-gray-900 dark:text-white' 
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                              </span>
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="p-1 text-gray-400 hover:text-green-600 rounded"
                                    title="Mark as read"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(notification.id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                  title="Delete notification"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className={`text-sm mt-1 ${
                            !notification.read 
                              ? 'text-gray-700 dark:text-gray-300' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  </div>
                </div>
                </div>
              )}

            {/* Empty State */}
            {notifications.length === 0 && adminNotifications.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
            </div>
            )}

            {/* Footer Actions */}
            {(notifications.length > 0 || adminNotifications.length > 0) && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      markAllAsRead();
                      // Mark all admin notifications as read
                      adminNotifications.forEach(notification => {
                        if (!notification.isRead) {
                          markAdminNotificationAsRead(notification._id);
                        }
                      });
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Mark all as read
                  </button>
                  <button
                    onClick={() => {
                      clearAllNotifications();
                      // Also reset welcome notification flag for current user
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
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter;
