const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { generateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Rate limiter for auth endpoints - more lenient to avoid false positives
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // allow more attempts within window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // If browser navigation, redirect back to login with message
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const acceptsHtml = (req.headers.accept || '').includes('text/html');
    const retryAfterSec = req.rateLimit?.resetTime instanceof Date
      ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
      : 60;

    if (acceptsHtml && !req.xhr) {
      return res.redirect(`${clientUrl}/login?error=rate_limited&retry=${retryAfterSec}`);
    }

    res.status(429).json({ 
      message: 'Too many login attempts, please try again later.',
      retryAfter: retryAfterSec
    });
  },
  skipSuccessfulRequests: true,
});

// Apply rate limiter to login endpoint
router.use('/google', authLimiter);

/* ======================
   GOOGLE AUTH LOGIN
   ====================== */
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: 'Google OAuth not configured. Please use demo mode.' 
    });
  }

  // Check if this is a retry after rate limit (prevent loops)
  if (req.headers['x-retry-attempt']) {
    return res.status(429).json({ 
      message: 'Too many requests, please wait a moment before trying again.',
      retryAfter: 60 // Wait 60 seconds
    });
  }

  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })(req, res, next);
});

/* ======================
   GOOGLE AUTH CALLBACK
   ====================== */
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/login` }),
  async (req, res) => {
    try {
      if (!req.user) {
        console.error('❌ Google auth failed: no user returned');
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=no_user`);
      }

      // Check admin role
      const isAdmin = req.user.email === 'fun2begin8988@gmail.com';

      // Generate JWT token
      const token = generateToken(req.user._id, isAdmin);

      console.log('✅ Google login successful:', {
        email: req.user.email,
        redirect: `${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token.substring(0, 15)}...`
      });

      // Redirect user to frontend with token
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
  }
);

/* ======================
   GET CURRENT USER
   ====================== */
router.get('/me', async (req, res) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(req.user._id).select('-__v');
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

/* ======================
   LOGOUT
   ====================== */
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

/* ======================
   VERIFY TOKEN
   ====================== */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId).select('-__v');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const isAdmin = user.email === 'fun2begin8988@gmail.com';

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        preferences: user.preferences,
        isAdmin
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
