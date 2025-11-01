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
    duration: '1 month'
  },
  pro: {
    name: 'Pro',
    price: 299, // in rupees (paisa: 29900)
    duration: '1 month'
  }
};

// Create Razorpay order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ 
        success: false,
        message: 'Payment service is not configured. Please contact administrator.' 
      });
    }

    const { plan } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    if (plan === 'basic') {
      return res.status(400).json({ message: 'Basic plan is free, no payment required' });
    }

    const planConfig = PLANS[plan];
    const amount = planConfig.price * 100; // Convert to paisa

    // Create Razorpay order
    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `receipt_${req.user._id}_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        plan: plan,
        email: req.user.email
      }
    };

    const order = await razorpay.orders.create(options);

    // Save order details temporarily (you might want to use Redis or DB)
    await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        plan: plan,
        razorpayOrderId: order.id,
        amount: planConfig.price,
        status: 'inactive' // Will be active after payment verification
      },
      { upsert: true, new: true }
    );

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
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Error creating order', error: error.message });
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
        plan: plan,
        status: 'active',
        razorpayOrderId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId,
        razorpaySignature: razorpaySignature,
        amount: PLANS[plan].price,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
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
