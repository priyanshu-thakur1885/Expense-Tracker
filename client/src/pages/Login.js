import React from 'react';
import { motion } from 'framer-motion';
import { Receipt, Users, TrendingUp, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    // Check if we're in demo mode
    const isDemo = window.location.search.includes('demo=true');
    if (isDemo) {
      // Demo mode - create a fake user
      const demoUser = {
        id: 'demo-user-123',
        name: 'Demo Student',
        email: 'demo@lpu.in',
        photo: 'https://via.placeholder.com/150/3b82f6/ffffff?text=DS'
      };
      
      // Store demo user in localStorage
      localStorage.setItem('demoUser', JSON.stringify(demoUser));
      localStorage.setItem('token', 'demo-token-123');
      
      // Use the login function
      login('demo-token-123').then(() => {
        navigate('/dashboard');
      });
      return;
    }
    
    // Normal Google OAuth flow
    window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/google`;
  };

  const features = [
    {
      icon: Receipt,
      title: 'Track Expenses',
      description: 'Monitor your daily food court expenses with detailed categorization'
    },
    {
      icon: TrendingUp,
      title: 'Smart Analytics',
      description: 'Get insights and recommendations to optimize your spending'
    },
    {
      icon: Users,
      title: 'Campus Focused',
      description: 'Designed specifically for LPU hostel students and food courts'
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

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome Back!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Sign in to track your campus expenses
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center px-6 py-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors duration-200"
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
              Continue with Google
            </motion.button>

            <div className="mt-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  // Demo mode - create a fake user
                  const demoUser = {
                    id: '507f1f77bcf86cd799439011', // Valid ObjectId format
                    name: 'Demo Student',
                    email: 'demo@lpu.in',
                    photo: 'https://via.placeholder.com/150/3b82f6/ffffff?text=DS'
                  };
                  
                  // Store demo user in localStorage
                  localStorage.setItem('demoUser', JSON.stringify(demoUser));
                  localStorage.setItem('token', 'demo-token-123');
                  
                  // Use the login function
                  login('demo-token-123').then(() => {
                    navigate('/dashboard');
                  });
                }}
                className="w-full flex items-center justify-center px-6 py-3 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-200"
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
