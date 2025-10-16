import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Users, TrendingUp, Shield, Dumbbell, GraduationCap, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPayment, setShowPayment] = useState(false);

  const handleGoogleLogin = (plan) => {
    if (isRedirecting) return; // prevent multiple rapid clicks
    setIsRedirecting(true);

    // Check if we're in demo mode
    const isDemo = window.location.search.includes('demo=true');
    if (isDemo) {
      // Demo mode - create a fake user based on plan
      let demoUser;
      if (plan === 'gym') {
        demoUser = {
          id: 'demo-gym-user-123',
          name: 'Demo Gym Member',
          email: 'demo@gym.com',
          photo: 'https://via.placeholder.com/150/ff6b6b/ffffff?text=DG',
          membershipPlan: 'gym'
        };
      } else if (plan === 'lpu') {
        demoUser = {
          id: 'demo-lpu-user-123',
          name: 'Demo LPU Student',
          email: 'demo@lpu.in',
          photo: 'https://via.placeholder.com/150/3b82f6/ffffff?text=DS',
          membershipPlan: 'lpu'
        };
      } else {
        demoUser = {
          id: 'demo-user-123',
          name: 'Demo User',
          email: 'demo@normal.com',
          photo: 'https://via.placeholder.com/150/6c757d/ffffff?text=DU',
          membershipPlan: 'normal'
        };
      }

      // Store demo user in localStorage
      localStorage.setItem('demoUser', JSON.stringify(demoUser));
      localStorage.setItem('token', 'demo-token-123');

      // Use the login function
      login('demo-token-123').then(() => {
        navigate('/dashboard');
      });
      setIsRedirecting(false);
      return;
    }

    // Normal Google OAuth flow with plan parameter
    window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/google?plan=${plan}`;
  };

  const membershipPlans = [
    {
      id: 'gym',
      name: 'Gym Membership',
      price: '₹19/month',
      icon: Dumbbell,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      features: [
        'Premium UI/UX Design',
        'Advanced Gym Analytics',
        'Personalized Workout Insights',
        'Exclusive Gym Features',
        'Priority Support'
      ],
      description: 'Perfect for fitness enthusiasts who want premium expense tracking with gym-focused features.'
    },
    {
      id: 'lpu',
      name: 'LPU Student',
      price: 'Free',
      icon: GraduationCap,
      color: 'from-blue-500 to-primary-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      features: [
        'Campus Expense Tracking',
        'Food Court Analytics',
        'Student Community',
        'Hostel Budget Planning',
        'Academic Year Insights'
      ],
      description: 'Free for LPU students with campus-specific features and community support.'
    },
    {
      id: 'normal',
      name: 'Regular User',
      price: 'Free',
      icon: User,
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-900/20',
      features: [
        'Basic Expense Tracking',
        'Simple Analytics',
        'Standard Features',
        'Community Access',
        'Regular Updates'
      ],
      description: 'Free basic expense tracking for everyone with essential features.'
    }
  ];

  const features = [
    {
      icon: Receipt,
      title: 'Track Expenses',
      description: 'Monitor your daily expenses with detailed categorization'
    },
    {
      icon: TrendingUp,
      title: 'Smart Analytics',
      description: 'Get insights and recommendations to optimize your spending'
    },
    {
      icon: Users,
      title: 'Community Focused',
      description: 'Join a community of smart spenders and budget planners'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is protected with Google OAuth and encrypted storage'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex">
      {/* Left side - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-white dark:bg-gray-800 p-12 flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <Receipt className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Expense Tracker
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Smart expense tracking for LPU students
            </p>
          </div>

          <div className="space-y-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="flex items-start space-x-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Membership Plans Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Choose Your Membership Plan
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {membershipPlans.map((plan, index) => {
                const Icon = plan.icon;
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                      selectedPlan === plan.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    } ${plan.bgColor}`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 bg-gradient-to-r ${plan.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {plan.price}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {plan.name}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                      {plan.description}
                    </p>

                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                          <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (plan.id === 'gym') {
                          setSelectedPlan(plan.id);
                          setShowPayment(true);
                        } else {
                          handleGoogleLogin(plan.id);
                        }
                      }}
                      className={`w-full py-3 px-4 bg-gradient-to-r ${plan.color} text-white font-semibold rounded-lg transition-all duration-200 ${
                        selectedPlan === plan.id ? 'shadow-lg' : ''
                      }`}
                    >
                      {plan.id === 'gym' ? 'Subscribe Now' : 'Get Started'}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right side - Login */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8 lg:hidden">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <Receipt className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Expense Tracker
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Smart expense tracking for LPU students
            </p>
          </div>

          {/* Payment Modal for Gym Membership */}
          {showPayment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowPayment(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Dumbbell className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Gym Membership
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Unlock premium features for just ₹19/month
                  </p>
                </div>

                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-700 dark:text-gray-300">Monthly Subscription</span>
                    <span className="font-semibold text-gray-900 dark:text-white">₹19</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Includes all premium gym features and analytics
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      // Demo payment success
                      setShowPayment(false);
                      handleGoogleLogin('gym');
                    }}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
                  >
                    💳 Pay ₹19 (Demo Payment)
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowPayment(false)}
                    className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-4 rounded-lg transition-all duration-200"
                  >
                    Cancel
                  </motion.button>
                </div>

                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Secure payment powered by Razorpay (Demo)
                </div>
              </motion.div>
            </motion.div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome Back!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Sign in to track your expenses
              </p>
            </div>

            {selectedPlan && (
              <div className="mb-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {selectedPlan === 'gym' && <Dumbbell className="w-5 h-5 text-orange-500" />}
                    {selectedPlan === 'lpu' && <GraduationCap className="w-5 h-5 text-blue-500" />}
                    {selectedPlan === 'normal' && <User className="w-5 h-5 text-gray-500" />}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {membershipPlans.find(p => p.id === selectedPlan)?.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => selectedPlan ? handleGoogleLogin(selectedPlan) : null}
              disabled={isRedirecting || !selectedPlan}
              className={`w-full flex items-center justify-center px-6 py-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors duration-200 ${
                isRedirecting || !selectedPlan
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isRedirecting ? 'Redirecting…' : selectedPlan ? `Continue with Google (${membershipPlans.find(p => p.id === selectedPlan)?.name})` : 'Select a plan first'}
            </motion.button>

            <div className="mt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (selectedPlan) {
                    // Demo mode - create a fake user based on selected plan
                    let demoUser;
                    if (selectedPlan === 'gym') {
                      demoUser = {
                        id: 'demo-gym-user-123',
                        name: 'Demo Gym Member',
                        email: 'demo@gym.com',
                        photo: 'https://via.placeholder.com/150/ff6b6b/ffffff?text=DG',
                        membershipPlan: 'gym'
                      };
                    } else if (selectedPlan === 'lpu') {
                      demoUser = {
                        id: 'demo-lpu-user-123',
                        name: 'Demo LPU Student',
                        email: 'demo@lpu.in',
                        photo: 'https://via.placeholder.com/150/3b82f6/ffffff?text=DS',
                        membershipPlan: 'lpu'
                      };
                    } else {
                      demoUser = {
                        id: 'demo-user-123',
                        name: 'Demo User',
                        email: 'demo@normal.com',
                        photo: 'https://via.placeholder.com/150/6c757d/ffffff?text=DU',
                        membershipPlan: 'normal'
                      };
                    }

                    // Store demo user in localStorage
                    localStorage.setItem('demoUser', JSON.stringify(demoUser));
                    localStorage.setItem('token', 'demo-token-123');

                    // Use the login function
                    login('demo-token-123').then(() => {
                      navigate('/dashboard');
                    });
                  }
                }}
                disabled={!selectedPlan}
                className={`w-full flex items-center justify-center px-6 py-3 text-sm transition-colors duration-200 rounded-lg ${
                  selectedPlan
                    ? 'text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                🎮 Try Demo Mode (No Google Login Required)
              </motion.button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                By signing in, you agree to our{' '}
                <button className="text-primary-600 hover:text-primary-500 underline">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button className="text-primary-600 hover:text-primary-500 underline">
                  Privacy Policy
                </button>
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Designed for LPU Hostel Students
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
