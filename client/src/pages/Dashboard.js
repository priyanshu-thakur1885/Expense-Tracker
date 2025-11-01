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
  CheckCircle,
  Crown,
  Zap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import notificationService from '../services/notificationService';
import axios from 'axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import FloatingChat from '../components/FloatingChat';
import UpgradeModal from '../components/UpgradeModal';
import { createPaymentOrder, verifyPayment, getSubscription } from '../services/paymentService';
import { useFeatureAccess } from '../utils/featureGating';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { subscription: featureSubscription, checkAccessWithRefresh } = useFeatureAccess();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [requiredPlanForFeature, setRequiredPlanForFeature] = useState('premium');

  // Log component mount
  useEffect(() => {
    console.log('Dashboard component mounted');
    return () => {
      console.log('Dashboard component unmounted');
    };
  }, []);


  useEffect(() => {
    fetchDashboardData();
    fetchSubscription();
  }, []);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await getSubscription();
      if (response.success) {
        setSubscription(response.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handlePayment = async (planName) => {
    const planMap = {
      'Basic': 'basic',
      'Premium': 'premium',
      'Pro': 'pro'
    };

    const planKey = planMap[planName];
    
    if (planKey === 'basic') {
      toast.info('Basic plan is already free!');
      return;
    }

    // Check if already subscribed to this or higher plan
    if (subscription && subscription.plan === planKey) {
      toast.info(`You're already on the ${planName} plan!`);
      return;
    }

    if (subscription && subscription.status === 'active') {
      if ((planKey === 'premium' && subscription.plan === 'pro') || 
          (planKey === 'pro' && subscription.plan === 'premium')) {
        toast.info('You already have an active subscription. Please wait for it to expire before upgrading.');
        return;
      }
    }

    setProcessingPayment(true);
    
    try {
      // Create order
      const orderResponse = await createPaymentOrder(planKey);
      
      if (!orderResponse.success || !orderResponse.order) {
        throw new Error('Failed to create payment order');
      }

      const { order } = orderResponse;

      // Razorpay options
      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: 'Expense Tracker',
        description: `${planName} Plan Subscription`,
        order_id: order.id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: {
          color: '#3b82f6'
        },
        handler: async (response) => {
          try {
            // Verify payment
            const verifyResponse = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              plan: planKey
            });

            if (verifyResponse.success) {
              toast.success(`🎉 ${planName} plan activated successfully!`);
              await fetchSubscription();
              setProcessingPayment(false);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
            setProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
            toast.error('Payment cancelled');
          }
        }
      };

      // Open Razorpay checkout
      const razorpay = window.Razorpay(options);
      razorpay.open();
      
    } catch (error) {
      console.error('Payment error:', error);
      console.error('Payment error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Show detailed error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to initiate payment';
      
      toast.error(`❌ ${errorMessage}`);
      setProcessingPayment(false);
    }
  };

  // Auto-slide plans every 3 seconds (paused on hover)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentPlanIndex((prev) => (prev < 2 ? prev + 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused]);

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
      console.log('Fetching dashboard data...');
      const response = await axios.get('/api/user/dashboard');
      console.log('Dashboard API response:', response.data);
      if (response.data && response.data.dashboard) {
        setDashboardData(response.data.dashboard);
        console.log('Dashboard data set successfully');
      } else {
        console.error('Invalid dashboard data structure:', response.data);
        toast.error('Invalid dashboard data received');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response) {
        console.error('API Error:', error.response.status, error.response.data);
        toast.error(`Failed to load dashboard: ${error.response.status}`);
      } else if (error.request) {
        console.error('Network Error:', error.request);
        toast.error('Network error: Could not reach server');
      } else {
        console.error('Unknown error:', error);
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };
  const handleBillScan = async (event) => {
    // Check if user has access to OCR Scanner (Pro feature) - refresh subscription first
    const hasAccess = await checkAccessWithRefresh('ocrScanner');
    if (!hasAccess) {
      setRequiredPlanForFeature('pro');
      setShowUpgradeModal(true);
      // Clear the file input
      event.target.value = '';
      return;
    }

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

  // Error boundary catch
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-50 dark:bg-red-900/20">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error.message}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchDashboardData();
            }}
            className="btn btn-primary"
          >
            Try Again
          </button>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500">Error details</summary>
            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        </div>
      </div>
    );
  }

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
        <button
          onClick={() => {
            setLoading(true);
            fetchDashboardData();
          }}
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  const { 
    budget = { 
      monthlyLimit: 0, 
      currentSpent: 0, 
      remaining: 0, 
      percentage: 0, 
      status: 'safe',
      dailyTarget: 0
    }, 
    today = { spent: 0, expenses: 0 }, 
    week = { spent: 0, expenses: 0 }, 
    recentExpenses = [] 
  } = dashboardData || {};

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

  // Always render at least something visible for debugging
  console.log('Dashboard render - user:', user, 'dashboardData:', dashboardData, 'loading:', loading);

  return (
    <div className="space-y-6">
      {/* Debug info - remove later */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2 text-xs text-center">
          Dashboard Component Rendered | User: {user?.name || 'No user'} | Loading: {loading ? 'Yes' : 'No'} | Data: {dashboardData ? 'Yes' : 'No'}
        </div>
      )}
      
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

      {/* Subscription Plans Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="relative">
          {/* Sliding Plans Container */}
          <div className="overflow-hidden">
            <motion.div
              className="flex"
              animate={{ x: `-${currentPlanIndex * 100}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {[
                {
                  name: "Basic",
                  price: "Free",
                  period: "",
                  icon: <Target className="w-5 h-5" />,
                  gradient: "from-blue-500 to-blue-600",
                  features: [
                    "Basic expense tracking",
                    "Monthly budget limit",
                    "Simple analytics",
                    "Basic notifications"
                  ],
                  popular: false
                },
                {
                  name: "Premium",
                  price: "₹99",
                  period: "/year",
                  icon: <Zap className="w-5 h-5" />,
                  gradient: "from-purple-500 to-purple-600",
                  features: [
                    "Unlimited expenses",
                    "Voice input access",
                    "Advanced analytics & charts",
                    "Export data to Excel",
                    "Smart AI insights",
                    "Priority support"
                  ],
                  popular: true
                },
                {
                  name: "Pro",
                  price: "₹299",
                  period: "/year",
                  icon: <Crown className="w-5 h-5" />,
                  gradient: "from-yellow-500 to-orange-600",
                  features: [
                    "Everything in Premium",
                    "OCR Bill Scanner",
                    "AI Assistant",
                    "Customized wallpaper",
                    "Priority admin help",
                    "24/7 support"
                  ],
                  popular: false
                }
              ].map((plan, index) => (
                <div
                  key={index}
                  className="w-full flex-shrink-0 px-6 py-5"
                >
                  <div className={`relative bg-gradient-to-r ${plan.gradient} rounded-xl p-5 text-white`}>
                    {plan.popular && (
                      <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                        <Sparkles className="w-3 h-3" />
                        <span>POPULAR</span>
                      </div>
                    )}
                    
                    {/* Header: Plan Name, Icon, and Price */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white/20 rounded-lg p-2">
                          {plan.icon}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                          <div className="flex items-baseline space-x-1">
                            <span className="text-3xl font-bold">{plan.price}</span>
                            {plan.period && (
                              <span className="text-lg opacity-90 ml-1">{plan.period}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Features Grid - Shows all features */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-5">
                      {plan.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start space-x-2">
                          <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <span className="text-sm opacity-95">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Upgrade Button - Full width and prominent */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handlePayment(plan.name)}
                      disabled={processingPayment || (plan.price === "Free" && subscription?.plan === 'basic')}
                      className={`w-full py-3 rounded-lg font-semibold text-base transition-colors ${
                        plan.popular
                          ? 'bg-white text-purple-600 hover:bg-gray-100 shadow-lg'
                          : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                      } ${processingPayment ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {processingPayment ? (
                        <span className="flex items-center justify-center space-x-2">
                          <LoadingSpinner size="sm" />
                          <span>Processing...</span>
                        </span>
                      ) : plan.price === "Free" ? (
                        subscription?.plan === 'basic' ? "Current Plan" : "Free Plan"
                      ) : subscription?.plan === plan.name.toLowerCase() ? (
                        "✓ Active Plan"
                      ) : (
                        `Upgrade to ${plan.name}`
                      )}
                    </motion.button>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={() => setCurrentPlanIndex((prev) => (prev > 0 ? prev - 1 : 2))}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-700/90 hover:bg-white dark:hover:bg-gray-700 rounded-full p-2 shadow-lg z-10 transition-colors"
            aria-label="Previous plan"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setCurrentPlanIndex((prev) => (prev < 2 ? prev + 1 : 0))}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-gray-700/90 hover:bg-white dark:hover:bg-gray-700 rounded-full p-2 shadow-lg z-10 transition-colors"
            aria-label="Next plan"
          >
            <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-2 pt-3 pb-3">
            {[0, 1, 2].map((index) => (
              <button
                key={index}
                onClick={() => setCurrentPlanIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  currentPlanIndex === index
                    ? 'w-8 bg-primary-600'
                    : 'w-2 bg-gray-300 dark:bg-gray-600'
                }`}
                aria-label={`Go to plan ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Budget Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
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
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
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
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
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
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
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
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50"
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

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        requiredPlan={requiredPlanForFeature}
      />
    </div>
  );
};

export default Dashboard;
