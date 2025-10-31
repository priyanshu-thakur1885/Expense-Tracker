import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Tesseract from 'tesseract.js';
import { Camera } from 'lucide-react';

import { 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Plus,
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import notificationService from '../services/notificationService';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import FloatingChat from '../components/FloatingChat';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);


  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Initialize notification service only once
    notificationService.initialize(notifications);
    
    // Cleanup on unmount
    return () => {
      notificationService.cleanup();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('/api/user/dashboard');
      setDashboardData(response.data.dashboard);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };
  const handleBillScan = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setScanning(true);

    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      console.log('Extracted Text:', text);

      // Extract date
      const date = text.match(/\d{2}[-/]\d{2}[-/]\d{4}/)?.[0] || '';
      
      // Extract price (₹ or numeric)
      const prices = text.match(/\₹?\d+(\.\d{1,2})?/g) || [];
      const price = prices[0] || '';
      
      // Extract probable item (first meaningful line)
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const probableItem = lines.find(l => /item|food|meal|rice|pizza|burger|sandwich/i.test(l)) || lines[0] || '';

      toast.success('Bill scanned successfully!');
      
      // Navigate to Add Expense with extracted data
      navigate('/add-expense', { state: { date, probableItem, price } });

    } catch (error) {
      console.error('Error scanning bill:', error);
      toast.error('Failed to scan bill.');
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Failed to load dashboard data</p>
      </div>
    );
  }

  const { budget, today, week, recentExpenses } = dashboardData;

  const getBudgetStatusColor = (status) => {
    switch (status) {
      case 'safe': return 'text-success-600 bg-success-100 dark:bg-success-900';
      case 'warning': return 'text-warning-600 bg-warning-100 dark:bg-warning-900';
      case 'danger': return 'text-danger-600 bg-danger-100 dark:bg-danger-900';
      case 'exceeded': return 'text-red-600 bg-red-100 dark:bg-red-900';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getBudgetStatusIcon = (status) => {
    switch (status) {
      case 'safe': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'danger': return <AlertTriangle className="w-5 h-5" />;
      case 'exceeded': return <AlertTriangle className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getBudgetStatusMessage = (status, percentage) => {
    switch (status) {
      case 'safe':
        return `Great! You've used only ${percentage.toFixed(1)}% of your budget.`;
      case 'warning':
        return `You've used ${percentage.toFixed(1)}% of your budget. Stay mindful!`;
      case 'danger':
        return `You've used ${percentage.toFixed(1)}% of your budget. Be careful!`;
      case 'exceeded':
        return `You've exceeded your budget by ${(percentage - 100).toFixed(1)}%!`;
      default:
        return 'Budget status unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-primary-100">
              Track your campus expenses and save money smartly
            </p>
          </div>
          <div className="hidden md:block">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/add-expense')}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center space-x-2 transition-colors duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>Add Expense</span>
            </motion.button>
            <label className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center space-x-2 cursor-pointer transition-colors duration-200">
  <Camera className="w-5 h-5" />
  <span>{scanning ? 'Scanning...' : 'Scan Bill'}</span>
  <input 
    type="file" 
    accept="image/*" 
    capture="environment" 
    onChange={handleBillScan} 
    className="hidden"
  />
</label>
{scanning && <p className="text-sm text-gray-200 mt-2">Extracting text from bill...</p>}

          </div>
        </div>
      </motion.div>

      {/* Budget Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Monthly Budget Status
          </h2>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getBudgetStatusColor(budget.status)}`}>
            {getBudgetStatusIcon(budget.status)}
            <span className="text-sm font-medium capitalize">{budget.status}</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
            <span>Spent: ₹{budget.currentSpent.toFixed(2)}</span>
            <span>Budget: ₹{budget.monthlyLimit.toFixed(2)}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(budget.percentage, 100)}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              className={`h-3 rounded-full ${
                budget.status === 'safe' ? 'bg-success-500' :
                budget.status === 'warning' ? 'bg-warning-500' :
                budget.status === 'danger' ? 'bg-danger-500' : 'bg-red-500'
              }`}
            />
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          {getBudgetStatusMessage(budget.status, budget.percentage)}
        </p>

        {budget.dailyTarget > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Daily Target:</strong> ₹{budget.dailyTarget.toFixed(2)} per day to stay within budget
            </p>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Spending */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Today's Spending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{today.spent.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {today.expenses} expense{today.expenses !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </motion.div>

        {/* This Week */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">This Week</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{week.spent.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {week.expenses} expense{week.expenses !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
        </motion.div>

        {/* Remaining Budget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Remaining Budget</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{budget.remaining.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {budget.percentage.toFixed(1)}% used
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Expenses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Expenses
          </h2>
          <button className="text-primary-600 hover:text-primary-500 text-sm font-medium">
            View All
          </button>
        </div>

        {recentExpenses.length > 0 ? (
          <div className="space-y-3">
            {recentExpenses.map((expense, index) => (
              <motion.div
                key={expense._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                      {expense.category.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {expense.item}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {expense.foodCourt} • {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    ₹{expense.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    {expense.category}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No expenses recorded yet
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/add-expense')}>
              Add Your First Expense
            </button>
          </div>
        )}
        
        {/* Floating Chat Component */}
        <FloatingChat />
      </motion.div>
    </div>
  );
};

export default Dashboard;
