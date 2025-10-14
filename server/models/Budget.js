const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  monthlyLimit: {
    type: Number,
    required: true,
    min: 100, // Minimum ₹100
    max: 50000 // Maximum ₹50,000
  },
  currentSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  dailyTarget: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  startDate: {
    type: Date,
    default: function() {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  },
  endDate: {
    type: Date,
    default: function() {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
  },
  notifications: {
    at50Percent: {
      type: Boolean,
      default: true
    },
    at80Percent: {
      type: Boolean,
      default: true
    },
    at100Percent: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
budgetSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  // Calculate daily target based on remaining days in month
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate() + 1;
  const remainingBudget = this.monthlyLimit - this.currentSpent;
  
  if (daysRemaining > 0) {
    this.dailyTarget = Math.max(0, remainingBudget / daysRemaining);
  } else {
    this.dailyTarget = 0;
  }
  
  next();
});

// Index for better query performance
budgetSchema.index({ userId: 1 });

// Virtual for remaining budget
budgetSchema.virtual('remainingBudget').get(function() {
  return Math.max(0, this.monthlyLimit - this.currentSpent);
});

// Virtual for spending percentage
budgetSchema.virtual('spendingPercentage').get(function() {
  return (this.currentSpent / this.monthlyLimit) * 100;
});

// Virtual for budget status
budgetSchema.virtual('status').get(function() {
  const percentage = this.spendingPercentage;
  if (percentage < 50) return 'safe';
  if (percentage < 80) return 'warning';
  if (percentage < 100) return 'danger';
  return 'exceeded';
});

module.exports = mongoose.model('Budget', budgetSchema);
