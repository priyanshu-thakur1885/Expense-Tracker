const express = require('express');
const passport = require('passport');
const { generateToken } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Google OAuth login
router.get('/google', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: 'Google OAuth not configured. Please use demo mode.' 
    });
  }
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })(req, res);
});

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      // Check if user is admin
      const isAdmin = req.user.email === 'fun2begin8988@gmail.com';

      // Determine membership plan based on query parameter or default logic
      let membershipPlan = 'normal';
      if (req.query.plan) {
        membershipPlan = req.query.plan;
      } else if (req.user.email.includes('@lpu.in') || req.user.email.includes('@lpunetwork.edu.in')) {
        membershipPlan = 'lpu';
      }

      // Update user's membership plan
      await User.findByIdAndUpdate(req.user._id, { membershipPlan });

      // Generate JWT token with admin role
      const token = generateToken(req.user._id, isAdmin);

      // Redirect to frontend with token
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Auth callback error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/login?error=auth_failed`);
    }
  }
);

// Get current user info
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

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token required' });
    }

    const jwt = require('jsonwebtoken');
    // Debug: log token length and prefix to diagnose malformed tokens (not the full token)
    try {
      console.log('Auth verify: token length', token.length, 'prefix', token.substring(0, 12));
    } catch (_) {}
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await User.findById(decoded.userId).select('-__v');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Check if user is admin
    const isAdmin = user.email === 'fun2begin8988@gmail.com';
    
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        preferences: user.preferences,
        isAdmin: isAdmin
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;
