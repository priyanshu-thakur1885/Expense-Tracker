const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  photo: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  preferences: {
    currency: {
      type: String,
      default: 'INR'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
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
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
userSchema.index({ googleId: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
