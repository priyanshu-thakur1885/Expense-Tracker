const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const User = require('../models/User');

const router = express.Router();

// Initialize Razorpay - Uses environment variables or fallback to hardcoded keys
// ⚠️ WARNING: Hardcoded keys are for testing only! Remove before production!
let razorpay = null;

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_RaazbbSiu68KmJ';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'iBcyzQkAj51Snyu8T2LamalG';

if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized successfully');
} else {
  console.warn('⚠️  Razorpay keys not configured. Payment functionality will be disabled.');
}

// Plan configurations
const PLANS = {
  basic: {
    name: 'Basic',
    price: 0,
    duration: 'lifetime'
  },
  premium: {
    name: 'Premium',
    price: 99, // in rupees (paisa: 9900)
    duration: '1 year'
  },
  pro: {
    name: 'Pro',
    price: 299, // in rupees (paisa: 29900)
    duration: '1 year'
  }
};

// Create Razorpay order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    console.log('📦 Creating payment order request:', {
      plan: req.body.plan,
      userId: req.user._id,
      userEmail: req.user.email
    });

    // Validate Razorpay initialization
    if (!razorpay) {
      console.error('❌ Razorpay not initialized');
      console.error('Razorpay keys check:', {
        keyId: RAZORPAY_KEY_ID ? 'Present' : 'Missing',
        keySecret: RAZORPAY_KEY_SECRET ? 'Present' : 'Missing'
      });
      return res.status(503).json({ 
        success: false,
        message: 'Payment service is not configured. Please contact administrator.',
        error: 'Razorpay not initialized'
      });
    }

    // Test Razorpay connection by checking if it has required methods
    if (typeof razorpay.orders?.create !== 'function') {
      console.error('❌ Razorpay orders API not available');
      return res.status(503).json({ 
        success: false,
        message: 'Payment service is not properly configured. Please contact administrator.',
        error: 'Razorpay API unavailable'
      });
    }

    const { plan } = req.body;

    if (!plan || !PLANS[plan]) {
      console.error('❌ Invalid plan:', plan);
      return res.status(400).json({ 
        success: false,
        message: `Invalid plan selected: ${plan}. Available plans: ${Object.keys(PLANS).join(', ')}` 
      });
    }

    if (plan === 'basic') {
      return res.status(400).json({ 
        success: false,
        message: 'Basic plan is free, no payment required' 
      });
    }

    const planConfig = PLANS[plan];
    const amount = planConfig.price * 100; // Convert to paisa

    console.log('💰 Plan configuration:', {
      plan: plan,
      price: planConfig.price,
      amount: amount
    });

    // Create Razorpay order
    // Generate short receipt ID (must be <= 40 characters)
    // Format: rcpt_<userId_last8chars>_<timestamp_last8chars>
    const userIdShort = req.user._id.toString().slice(-8);
    const timestampShort = Date.now().toString().slice(-8);
    const receiptId = `rcpt_${userIdShort}_${timestampShort}`; // Max 27 chars
    
    const options = {
      amount: amount,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        userId: req.user._id.toString(),
        plan: plan,
        email: req.user.email
      }
    };

    console.log('🔄 Calling Razorpay API to create order...');
    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);

    // Save order details temporarily (you might want to use Redis or DB)
    console.log('💾 Saving order to database...');
    await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        userName: req.user.name || '',
        userEmail: req.user.email || '',
        plan: plan,
        razorpayOrderId: order.id,
        amount: planConfig.price,
        status: 'inactive' // Will be active after payment verification
      },
      { upsert: true, new: true }
    );
    console.log('✅ Order saved to database');

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('❌ Create order error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      error_description: error.error?.description,
      description: error.description,
      httpStatusCode: error.httpStatusCode
    });
    
    // Determine the appropriate HTTP status code
    let statusCode = 500;
    let errorMessage = 'Error creating order';
    
    // Handle Razorpay specific errors
    if (error.httpStatusCode) {
      statusCode = error.httpStatusCode;
      errorMessage = error.error?.description || error.description || error.message;
    } else if (error.statusCode) {
      statusCode = error.statusCode;
      errorMessage = error.error?.description || error.description || error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Provide user-friendly error messages
    if (errorMessage.includes('Invalid') || errorMessage.includes('authentication')) {
      errorMessage = 'Payment service configuration error. Please contact support.';
      statusCode = 503;
    } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      errorMessage = 'Network error connecting to payment gateway. Please try again.';
    } else if (errorMessage.includes('amount') || errorMessage.includes('currency')) {
      errorMessage = 'Invalid payment amount. Please try again.';
      statusCode = 400;
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        originalError: error.message,
        stack: error.stack,
        code: error.code
      } : undefined
    });
  }
});

// Verify payment and update subscription
router.post('/verify-payment', authenticateToken, async (req, res) => {
  try {
    if (!razorpay || !RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ 
        success: false,
        message: 'Payment service is not configured. Please contact administrator.' 
      });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !plan) {
      return res.status(400).json({ message: 'Missing payment details' });
    }

    // Verify signature
    const text = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Verify payment with Razorpay
    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return res.status(400).json({ message: 'Payment not successful' });
    }

    // Update subscription
    const subscription = await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        userName: req.user.name || '',
        userEmail: req.user.email || '',
        plan: plan,
        status: 'active',
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
        amount: PLANS[plan].price,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 365 days (1 year) from now
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
});

// Get user's current subscription
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    let subscription = await Subscription.findOne({ userId: req.user._id });

    if (!subscription) {
      // Create basic plan subscription
      subscription = new Subscription({
        userId: req.user._id,
        userName: req.user.name || '',
        userEmail: req.user.email || '',
        plan: 'basic',
        status: 'active'
      });
      await subscription.save();
    }

    // Check if subscription is expired
    if (subscription.endDate && new Date() > subscription.endDate && subscription.plan !== 'basic') {
      subscription.status = 'expired';
      subscription.plan = 'basic';
      await subscription.save();
    }

    res.json({
      success: true,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Error fetching subscription' });
  }
});

module.exports = router;
