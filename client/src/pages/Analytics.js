import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import axios from "axios";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import FloatingChat from "../components/FloatingChat";
import UpgradeModal from "../components/UpgradeModal";
import { useFeatureAccess, hasFeatureAccess } from "../utils/featureGating";
import { format } from "date-fns";

const Analytics = () => {
  const { subscription, checkAccessWithRefresh, checkAccess } =
    useFeatureAccess();
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [requiredPlanForFeature, setRequiredPlanForFeature] =
    useState("premium");
  const [hasAccess, setHasAccess] = useState(false);
  const [budgetInfo, setBudgetInfo] = useState(null); // monthlyLimit etc
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  ); // YYYY-MM
  const [monthlySummary, setMonthlySummary] = useState({ spent: 0, delta: 0 });

  // Check access once on mount
  useEffect(() => {
    const verifyAccess = async () => {
      const access = await checkAccessWithRefresh("advancedAnalytics");
      setHasAccess(access);
      if (!access) {
        setRequiredPlanForFeature("premium");
        setShowUpgradeModal(true);
        // Stop the loading spinner if user doesn't have access
        setLoading(false);
      } else {
        setShowUpgradeModal(false);
      }
    };
    verifyAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update access when subscription changes (but don't refresh)
  useEffect(() => {
    if (subscription) {
      const access = checkAccess("advancedAnalytics");
      setHasAccess(access);
      if (!access) {
        setShowUpgradeModal(true);
        // Ensure we are not stuck in loading state
        setLoading(false);
      } else {
        setShowUpgradeModal(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      let statsUrl = `/api/expenses/stats/summary?period=${period}`;

      // If period is 'date', add the specific date parameter
      if (period === "range" && fromDate && toDate) {
        statsUrl += `&startDate=${fromDate}&endDate=${toDate}`;
      }

      const [statsResponse, insightsResponse, budgetResponse] =
        await Promise.all([
          axios.get(statsUrl),
          axios.get("/api/budget/insights"),
          axios.get("/api/budget"),
        ]);
      setStats(statsResponse.data.stats);
      setInsights(insightsResponse.data.insights);
      setBudgetInfo(budgetResponse.data.budget);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [period, fromDate, toDate]);

  // Fetch analytics when period or selectedDate changes (only if we have access)
  useEffect(() => {
    if (hasAccess) {
      fetchAnalytics();
    }
  }, [period, selectedDate, hasAccess, fetchAnalytics]);

  // Fetch monthly saving/overspending for selected month
  useEffect(() => {
    const fetchMonthly = async () => {
      if (!hasAccess) return;
      try {
        const dateParam = `${selectedMonth}-01`;
        const resp = await axios.get(
          `/api/expenses/stats/summary?period=month&date=${dateParam}`
        );
        const spent = resp.data?.stats?.totalSpent || 0;
        const limit = budgetInfo?.monthlyLimit || 0;
        setMonthlySummary({ spent, delta: limit - spent });
      } catch (err) {
        console.error("Monthly summary error:", err);
      }
    };
    fetchMonthly();
  }, [selectedMonth, hasAccess, budgetInfo]);

  const getCategoryColor = (category) => {
    const colors = {
      breakfast: "#f97316",
      lunch: "#3b82f6",
      dinner: "#8b5cf6",
      snacks: "#eab308",
      Drinks: "#22c55e",
      Groceries: "#00FFFF",
      other: "#6b7280",
    };
    return colors[category] || colors.other;
  };

  const getFoodCourtColor = (index) => {
    const colors = [
      "#3b82f6",
      "#ef4444",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#06b6d4",
      "#84cc16",
      "#f97316",
    ];
    return colors[index % colors.length];
  };

  const prepareCategoryData = () => {
    if (!stats?.categoryStats) return [];

    return Object.entries(stats.categoryStats).map(([category, amount]) => ({
      name: category.charAt(0).toUpperCase() + category.slice(1),
      value: amount,
      color: getCategoryColor(category),
    }));
  };

  const prepareFoodCourtData = () => {
    if (!stats?.foodCourtStats) return [];

    return Object.entries(stats.foodCourtStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([court, amount], index) => ({
        name: court.replace(" Food Court", ""),
        value: amount,
        color: getFoodCourtColor(index),
      }));
  };

  const prepareDailyData = () => {
    if (!stats?.dailyStats) return [];

    if (period === "today") {
      // For today, show hourly data if available, otherwise just show today's total
      const today = new Date().toISOString().split("T")[0];
      const todayAmount = stats.dailyStats[today] || 0;

      return [{ date: "Today", amount: todayAmount }];
    } else if (period === "date") {
      // For specific date, show the selected date's data
      const selectedDateAmount = stats.dailyStats[selectedDate] || 0;

      return [
        {
          date: format(new Date(selectedDate), "MMM dd"),
          amount: selectedDateAmount,
        },
      ];
    } else {
      const dailyEntries = Object.entries(stats.dailyStats)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .slice(-30); // Last 30 days

      return dailyEntries.map(([date, amount]) => ({
        date: format(new Date(date), "MMM dd"),
        amount: amount,
      }));
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-medium text-gray-900 dark:text-white">{label}</p>
          <p className="text-primary-600 dark:text-primary-400">
            Amount: ₹{payload[0].value.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!stats || !insights) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Failed to load analytics data
        </p>
      </div>
    );
  }
  const calculateAveragePerDay = () => {
    if (!stats?.dailyStats) return 0;

    const days = Object.keys(stats.dailyStats).length;
    if (days === 0) return 0;

    return stats.totalSpent / days;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics & Insights
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Understand your spending patterns and get smart recommendations
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              if (e.target.value === "today") {
                setSelectedDate(new Date().toISOString().split("T")[0]);
              }
            }}
            className="input"
          >
            <option value="today">Today</option>
            <option value="range">Custom Range</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>

          {period === "range" && (
            <>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input"
              />
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input"
              />
            </>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Total Spent
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{stats.totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalExpenses}
              </p>
            </div>
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Average Expense
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{calculateAveragePerDay().toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-warning-100 dark:bg-warning-900 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Daily Target
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{insights.dailyTarget.toFixed(2)}
              </p>
            </div>
            <div className="w-12 h-12 bg-info-100 dark:bg-info-900 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-info-600 dark:text-info-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Monthly Savings / Overspending */}
      {budgetInfo && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Monthly Savings / Overspending
            </h2>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-300">Budget</p>
              <p className="text-gray-900 dark:text-white font-semibold">
                ₹{Number(budgetInfo.monthlyLimit || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-300">
                Spent ({selectedMonth})
              </p>
              <p className="text-gray-900 dark:text-white font-semibold">
                ₹{Number(monthlySummary.spent || 0).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-300">Result</p>
              {monthlySummary.delta >= 0 ? (
                <p className="font-semibold text-success-600 dark:text-success-400">
                  Saved ₹{Math.abs(monthlySummary.delta).toFixed(2)}
                </p>
              ) : (
                <p className="font-semibold text-danger-600 dark:text-danger-400">
                  Exceeded by -₹{Math.abs(monthlySummary.delta).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        >
          <div className="flex items-center space-x-2 mb-6">
            <PieChart className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Spending by Category
            </h2>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={prepareCategoryData()}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {prepareCategoryData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Food Court Spending */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
        >
          <div className="flex items-center space-x-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Spending by Food Court
            </h2>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepareFoodCourtData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Daily Spending Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center space-x-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {period === "today"
              ? "Today's Spending"
              : period === "date"
              ? `Spending on ${format(new Date(selectedDate), "MMM dd, yyyy")}`
              : period === "week"
              ? "Weekly Spending Trend"
              : period === "month"
              ? "Daily Spending Trend"
              : "Yearly Spending Trend"}
          </h2>
        </div>

        <div className="h-64">
          {(period === "today" || period === "date") &&
          stats?.totalSpent === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                  {period === "today"
                    ? "No expenses recorded today"
                    : `No expenses recorded on ${format(
                        new Date(selectedDate),
                        "MMM dd, yyyy"
                      )}`}
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  {period === "today"
                    ? "Start tracking your expenses to see your spending patterns"
                    : "Try selecting a different date or add some expenses for this day"}
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prepareDailyData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Insights and Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center space-x-2 mb-6">
          <AlertTriangle className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Smart Insights & Recommendations
          </h2>
        </div>

        <div className="space-y-4">
          {insights.recommendations.map((recommendation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              className={`p-4 rounded-lg border-l-4 ${
                recommendation.type === "success"
                  ? "bg-success-50 border-success-500 dark:bg-success-900/20"
                  : recommendation.type === "warning"
                  ? "bg-warning-50 border-warning-500 dark:bg-warning-900/20"
                  : recommendation.type === "tip"
                  ? "bg-blue-50 border-blue-500 dark:bg-blue-900/20"
                  : "bg-gray-50 border-gray-500 dark:bg-gray-900/20"
              }`}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    recommendation.type === "success"
                      ? "bg-success-500"
                      : recommendation.type === "warning"
                      ? "bg-warning-500"
                      : recommendation.type === "tip"
                      ? "bg-blue-500"
                      : "bg-gray-500"
                  }`}
                >
                  {recommendation.type === "success" ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    {recommendation.message}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {recommendation.action}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Floating Chat Component */}
        <FloatingChat />
      </motion.div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        requiredPlan={requiredPlanForFeature}
      />
    </div>
  );
};

export default Analytics;
