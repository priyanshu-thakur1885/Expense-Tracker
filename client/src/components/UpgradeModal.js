import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Zap, Target, Check, Sparkles } from 'lucide-react';
import { createPaymentOrder, verifyPayment, getSubscription } from '../services/paymentService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from './LoadingSpinner';

const UpgradeModal = ({ isOpen, onClose, requiredPlan = 'premium', onPaymentSuccess }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // Load Razorpay script when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Check if Razorpay is already available
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    
    if (existingScript) {
      // Script exists, poll until Razorpay is available
      const checkInterval = setInterval(() => {
        if (window.Razorpay) {
          setRazorpayLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.Razorpay) {
          console.warn('Razorpay script loading timeout');
        }
      }, 5000);

      // Also listen for onload if script is still loading
      if (!existingScript.complete) {
        existingScript.onload = () => {
          setRazorpayLoaded(true);
          clearInterval(checkInterval);
        };
      }
      
      return () => clearInterval(checkInterval);
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      // Double-check Razorpay is available
      if (window.Razorpay) {
        setRazorpayLoaded(true);
        console.log('Razorpay script loaded successfully');
      } else {
        // Sometimes onload fires before Razorpay is available, poll for it
        const checkInterval = setInterval(() => {
          if (window.Razorpay) {
            setRazorpayLoaded(true);
            clearInterval(checkInterval);
          }
        }, 50);
        setTimeout(() => clearInterval(checkInterval), 2000);
      }
    };
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      setRazorpayLoaded(false);
    };
    document.body.appendChild(script);

    // Cleanup function (but don't remove script as it might be used elsewhere)
    return () => {
      // Don't remove script - it's shared across components
    };
  }, [isOpen]);

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

  // Fetch subscription when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSubscription();
    }
  }, [isOpen]);

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

    if (subscription && subscription.plan === planKey) {
      toast.info(`You're already on the ${planName} plan!`);
      return;
    }

    // Double-check Razorpay is available before proceeding
    if (!window.Razorpay) {
      toast.error('Payment system is not ready. Please wait a moment and try again.');
      setProcessingPayment(false);
      return;
    }

    setProcessingPayment(true);
    
    try {
      const orderResponse = await createPaymentOrder(planKey);
      
      if (!orderResponse.success || !orderResponse.order) {
        throw new Error(orderResponse.message || 'Failed to create payment order');
      }

      const { order } = orderResponse;

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
            console.log('Payment successful, verifying...', response);
            const verifyResponse = await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              plan: planKey
            });

            console.log('Verification response:', verifyResponse);

            if (verifyResponse.success) {
              toast.success(`🎉 ${planName} plan activated successfully!`);
              
              // Refresh subscription immediately
              await fetchSubscription();
              
              // Trigger global refresh - notify parent components to refresh subscription
              if (onPaymentSuccess) {
                await onPaymentSuccess();
              }
              
              // Dispatch custom event for other components listening
              window.dispatchEvent(new CustomEvent('subscription-updated'));
              
              // Small delay to ensure all updates complete
              setTimeout(() => {
                setProcessingPayment(false);
                onClose(); // Close modal after successful payment
              }, 500);
            } else {
              // Even if verification response says failed, check subscription in case it was updated
              console.warn('Verification response indicates failure, but checking subscription...');
              await fetchSubscription();
              window.dispatchEvent(new CustomEvent('subscription-updated'));
              
              throw new Error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            
            // Even on error, check if subscription was updated (payment might have succeeded)
            try {
              await fetchSubscription();
              const updatedSub = await getSubscription();
              if (updatedSub?.success && updatedSub?.subscription?.plan === planKey) {
                // Subscription was actually updated! Payment succeeded
                toast.success(`🎉 ${planName} plan activated successfully!`);
                window.dispatchEvent(new CustomEvent('subscription-updated'));
                if (onPaymentSuccess) {
                  await onPaymentSuccess();
                }
                setTimeout(() => {
                  setProcessingPayment(false);
                  onClose();
                }, 500);
                return;
              }
            } catch (checkError) {
              console.error('Error checking subscription after payment error:', checkError);
            }
            
            toast.error(error.response?.data?.message || error.message || 'Payment verification failed. Please refresh and check your subscription.');
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
      let errorMessage = 'Failed to create payment order';
      
      if (error.response?.data) {
        // Server returned an error response
        errorMessage = error.response.data.error || 
                      error.response.data.message || 
                      error.message;
      } else if (error.message) {
        // Network or other error
        errorMessage = error.message;
      }
      
      // Handle specific error cases
      if (error.response?.status === 503) {
        errorMessage = 'Payment service is not configured. Please contact support.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid payment request. Please try again.';
      } else if (!error.response) {
        errorMessage = 'Network error: Could not connect to payment server. Please check your internet connection.';
      }
      
      toast.error(`❌ ${errorMessage}`);
      setProcessingPayment(false);
      
      // Even if order creation fails, check if subscription was updated (in case of retry)
      setTimeout(async () => {
        await fetchSubscription();
        window.dispatchEvent(new CustomEvent('subscription-updated'));
      }, 1000);
    }
  };

  const plans = [
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
      popular: true,
      requiredFor: requiredPlan === 'premium'
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
      popular: false,
      requiredFor: requiredPlan === 'pro'
    }
  ];

  // For Premium features: Show both Premium and Pro (since Pro includes Premium features)
  // For Pro-only features: Show only Pro plan
  const filteredPlans = requiredPlan === 'pro' 
    ? plans.filter(plan => plan.name === 'Pro')  // Only Pro for Pro-only features
    : plans;  // Both Premium and Pro for Premium features

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                🔒 Upgrade Your Plan
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                This feature requires {requiredPlan === 'pro' ? 'Pro' : 'Premium'} plan or higher
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Plans Grid */}
          <div className="p-6">
            <div className={`grid gap-6 ${filteredPlans.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 max-w-md mx-auto'}`}>
              {filteredPlans.map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative bg-gradient-to-br ${plan.gradient} rounded-xl p-6 text-white ${
                    plan.requiredFor ? 'ring-4 ring-yellow-400 ring-offset-2' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>POPULAR</span>
                    </div>
                  )}

                  {plan.requiredFor && (
                    <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      RECOMMENDED
                    </div>
                  )}

                  {/* Plan Header */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-white/20 rounded-lg p-2">
                      {plan.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                      <div className="flex items-baseline space-x-1">
                        <span className="text-3xl font-bold">{plan.price}</span>
                        <span className="text-lg opacity-90">{plan.period}</span>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start space-x-2">
                        <Check className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm opacity-95">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Upgrade Button */}
                  <motion.button
                    whileHover={razorpayLoaded && !processingPayment && subscription?.plan !== plan.name.toLowerCase() ? { scale: 1.02 } : {}}
                    whileTap={razorpayLoaded && !processingPayment && subscription?.plan !== plan.name.toLowerCase() ? { scale: 0.98 } : {}}
                    onClick={() => handlePayment(plan.name)}
                    disabled={processingPayment || subscription?.plan === plan.name.toLowerCase() || !razorpayLoaded}
                    className={`w-full py-3 rounded-lg font-semibold text-base transition-colors ${
                      plan.popular
                        ? 'bg-white text-purple-600 hover:bg-gray-100 shadow-lg'
                        : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                    } ${processingPayment || !razorpayLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {!razorpayLoaded ? (
                      <span className="flex items-center justify-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <span>Loading payment system...</span>
                      </span>
                    ) : processingPayment ? (
                      <span className="flex items-center justify-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <span>Processing...</span>
                      </span>
                    ) : subscription?.plan === plan.name.toLowerCase() ? (
                      "✓ Active Plan"
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </motion.button>
                </motion.div>
              ))}
            </div>

            {/* Current Plan Info */}
            {subscription && (
              <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Current Plan:</strong> {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default UpgradeModal;

