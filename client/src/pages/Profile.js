import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Calendar, 
  Settings, 
  Save, 
  Edit3,
  Camera,
  Bell,
  Moon,
  Sun,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import notificationService from '../services/notificationService';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [budget, setBudget] = useState(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    monthlyLimit: 4000,
    currency: 'INR',
    notifications: true,
    theme: theme
  });

  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    try {
      const response = await axios.get('/api/budget');
      if (response.data && response.data.budget) {
        setBudget(response.data.budget);
        setFormData(prev => ({
          ...prev,
          monthlyLimit: response.data.budget.monthlyLimit || 4000
        }));
      }
    } catch (error) {
      console.error('Error fetching budget:', error);
      // Set default budget values if API fails
      setBudget({
        currentSpent: 0,
        remainingBudget: 4000,
        spendingPercentage: 0,
        monthlyLimit: 4000
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await axios.put('/api/user/profile', {
        name: formData.name,
        preferences: {
          currency: formData.currency,
          notifications: formData.notifications,
          theme: formData.theme
        }
      });
      
      updateUser({
        name: formData.name,
        preferences: {
          ...user.preferences,
          currency: formData.currency,
          notifications: formData.notifications,
          theme: formData.theme
        }
      });
      
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    setLoading(true);
    try {
      await axios.post('/api/budget', {
        monthlyLimit: parseFloat(formData.monthlyLimit),
        currency: formData.currency
      });
      
      await fetchBudget();
      
      // Check budget status after update
      await notificationService.checkBudgetNow();
      
      toast.success('Budget updated successfully!');
    } catch (error) {
      console.error('Error updating budget:', error);
      toast.error('Failed to update budget');
    } finally {
      setLoading(false);
    }
  };

  const API_BASE = process.env.REACT_APP_API_URL || '';

  const handleExport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/user/export`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || 'Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_export_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export started — downloading file');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = () => {
    toggleTheme();
    setFormData(prev => ({
      ...prev,
      theme: theme === 'light' ? 'dark' : 'light'
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white"
      >
        <div className="flex items-center space-x-4">
          <div className="relative">
            {user?.photo ? (
              <img
                src={user.photo}
                alt={user.name}
                className="w-20 h-20 rounded-full border-4 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/20">
                <User className="w-10 h-10 text-white" />
              </div>
            )}
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
              <Camera className="w-3 h-3 text-gray-600" />
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.name}</h1>
            <p className="text-primary-100">LPU Student</p>
            <p className="text-primary-200 text-sm">{user?.email}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Profile Information
            </h2>
            <button
              onClick={() => setEditing(!editing)}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-200"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label block mb-2">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!editing}
                className="input w-full"
              />
            </div>

            <div>
              <label className="label block mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="input w-full pl-10 bg-gray-50 dark:bg-gray-700"
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <label className="label block mb-2">Member Since</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  disabled
                  className="input w-full pl-10 bg-gray-50 dark:bg-gray-700"
                />
              </div>
            </div>

            {editing && (
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setEditing(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Budget Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-2 mb-6">
            <DollarSign className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Budget Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label block mb-2">Monthly Budget Limit</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  name="monthlyLimit"
                  value={formData.monthlyLimit}
                  onChange={handleInputChange}
                  min="100"
                  max="50000"
                  className="input w-full pl-8"
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Set your monthly food expense limit
              </p>
            </div>

            <div>
              <label className="label block mb-2">Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="input w-full"
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>

            {budget && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-300">Current Spent:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{(budget.currentSpent || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-300">Remaining:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{(budget.remainingBudget || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      (budget.spendingPercentage || 0) < 50 ? 'bg-success-500' :
                      (budget.spendingPercentage || 0) < 80 ? 'bg-warning-500' :
                      (budget.spendingPercentage || 0) < 100 ? 'bg-danger-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(budget.spendingPercentage || 0, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {(budget.spendingPercentage || 0).toFixed(1)}% of budget used
                </p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleSaveBudget}
                disabled={loading}
                className="btn btn-primary w-full flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update Budget</span>
                  </>
                )}
              </button>
              
              {/* Test button for budget exceeded notification */}
              <button
                onClick={() => notificationService.testBudgetExceeded()}
                className="btn btn-secondary w-full text-sm"
              >
                🧪 Test Budget Exceeded Alert
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center space-x-2 mb-6">
          <Settings className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preferences
          </h2>
        </div>

        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 text-warning-500" />
              ) : (
                <Moon className="w-5 h-5 text-blue-500" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {theme === 'light' ? 'Light mode' : 'Dark mode'}
                </p>
              </div>
            </div>
            <button
              onClick={handleThemeToggle}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600 transition-colors duration-200"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-primary-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Notifications</p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Get notified about budget alerts and tips
                </p>
              </div>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, notifications: !prev.notifications }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                formData.notifications ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                  formData.notifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Account Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Account Actions
        </h2>
        
        <div className="space-y-3">
          <button onClick={handleExport} className="w-full text-left p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg hover:bg-warning-100 dark:hover:bg-warning-900/30 transition-colors duration-200">
            <p className="font-medium text-warning-800 dark:text-warning-300">Export Data</p>
            <p className="text-sm text-warning-600 dark:text-warning-400">
              Download your expense data as CSV
            </p>
          </button>
          
          <button className="w-full text-left p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg hover:bg-danger-100 dark:hover:bg-danger-900/30 transition-colors duration-200">
            <p className="font-medium text-danger-800 dark:text-danger-300">Delete Account</p>
            <p className="text-sm text-danger-600 dark:text-danger-400">
              Permanently delete your account and all data
            </p>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
