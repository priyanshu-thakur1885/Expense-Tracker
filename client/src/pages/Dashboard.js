import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Tesseract from 'tesseract.js';
import { Camera, TrendingUp, TrendingDown, DollarSign, Calendar, Plus, Target, AlertTriangle, CheckCircle, BarChart3, PieChart, MapPin, Info, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
    notificationService.initialize(notifications);
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
      const date = text.match(/\d{2}[-/]\d{2}[-/]\d{4}/)?.[0] || '';
      const prices = text.match(/\₹?\d+(\.\d{1,2})?/g) || [];
      const price = prices[0] || '';
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      const probableItem = lines.find(l => /item|food|meal|rice|pizza|burger|sandwich/i.test(l)) || lines[0] || '';

      toast.success('Bill scanned successfully!');
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

  const { 
    budget, 
    today, 
    week, 
    categoryStats = [], 
    foodCourtStats = [], 
    dailySpending = [],
    comparison = {},
    averageDailySpending = 0,
    insights = [],
    totalExpenses = 0
  } = dashboardData;

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

  const getCategoryColor = (category) => {
    const colors = {
      breakfast: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      lunch: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      dinner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      snacks: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      beverages: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[category] || colors.other;
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      case 'tip': return <Lightbulb className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'success': return 'bg-success-50 border-success-500 dark:bg-success-900/20';
      case 'warning': return 'bg-warning-50 border-warning-500 dark:bg-warning-900/20';
      case 'info': return 'bg-blue-50 border-blue-500 dark:bg-blue-900/20';
      case 'tip': return 'bg-purple-50 border-purple-500 dark:bg-purple-900/20';
      default: return 'bg-gray-50 border-gray-500 dark:bg-gray-900/20';
    }
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            ₹{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  const totalCategorySpending = categoryStats.reduce((sum, cat) => sum + cat.amount, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {user?.name?.split(' ')[0]}! 👋
            </h1>
            <p className="text-primary-100">
              Track your campus expenses and save money smartly
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
        {scanning && (
          <p className="text-sm text-primary-100 mt-3">Extracting text from bill...</p>
        )}
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

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Remaining</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              ₹{budget.remaining.toFixed(2)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-1">Daily Target</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              ₹{budget.dailyTarget.toFixed(2)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {week.expenses} expense{week.expenses !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
        </motion.div>

        {/* Average Daily */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg. Daily</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{averageDailySpending.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This month
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* Total Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalExpenses}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This month
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <PieChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Weekly Spending Trend & Monthly Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Spending Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Weekly Spending Trend</span>
            </h2>
          </div>
          
          {dailySpending.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySpending}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-700" />
                  <XAxis 
                    dataKey="day" 
                    className="text-xs"
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="amount" 
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">No spending data available</p>
            </div>
          )}
        </motion.div>

        {/* Monthly Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Monthly Comparison</span>
            </h2>
          </div>
          
          {comparison.previousMonth > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">This Month</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{comparison.currentMonth.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">Last Month</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{comparison.previousMonth.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg">
                {comparison.change > 0 ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-danger-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="text-danger-600 font-bold">{Math.abs(comparison.change).toFixed(1)}%</span> increase
                    </span>
                  </>
                ) : comparison.change < 0 ? (
                  <>
                    <TrendingDown className="w-5 h-5 text-success-600" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span className="text-success-600 font-bold">{Math.abs(comparison.change).toFixed(1)}%</span> decrease
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    No change
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">No previous month data available</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Category Breakdown & Top Food Courts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <PieChart className="w-5 h-5" />
              <span>Spending by Category</span>
            </h2>
            <button
              onClick={() => navigate('/analytics')}
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              View Details
            </button>
          </div>
          
          {categoryStats.length > 0 ? (
            <div className="space-y-3">
              {categoryStats.map((cat, index) => {
                const percentage = totalCategorySpending > 0 ? (cat.amount / totalCategorySpending) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(cat.category)}`}>
                          {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{cat.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.9 + index * 0.1 }}
                        className={`h-2 rounded-full ${
                          cat.category === 'breakfast' ? 'bg-orange-500' :
                          cat.category === 'lunch' ? 'bg-blue-500' :
                          cat.category === 'dinner' ? 'bg-purple-500' :
                          cat.category === 'snacks' ? 'bg-yellow-500' :
                          cat.category === 'beverages' ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No category data available</p>
            </div>
          )}
        </motion.div>

        {/* Top Food Courts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <MapPin className="w-5 h-5" />
              <span>Top Food Courts</span>
            </h2>
            <button
              onClick={() => navigate('/analytics')}
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              View Details
            </button>
          </div>
          
          {foodCourtStats.length > 0 ? (
            <div className="space-y-4">
              {foodCourtStats.map((court, index) => {
                const maxAmount = Math.max(...foodCourtStats.map(c => c.amount));
                const percentage = maxAmount > 0 ? (court.amount / maxAmount) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-bold text-sm">
                            #{index + 1}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {court.foodCourt}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{court.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, delay: 1.0 + index * 0.1 }}
                        className="h-2 rounded-full bg-primary-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No food court data available</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Insights */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-2 mb-4">
            <Lightbulb className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Quick Insights
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 + index * 0.1 }}
                className={`p-4 rounded-lg border-l-4 ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    insight.type === 'success' ? 'bg-success-500' :
                    insight.type === 'warning' ? 'bg-warning-500' :
                    insight.type === 'info' ? 'bg-blue-500' :
                    'bg-purple-500'
                  }`}>
                    {getInsightIcon(insight.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      {insight.message}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {insight.action}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Floating Chat Component */}
      <FloatingChat />
    </div>
  );
};

export default Dashboard;