const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  userName: {
    type: String,
    default: ''
  },
  userEmail: {
    type: String,
    default: ''
  },
  plan: {
    type: String,
    enum: ['basic', 'premium', 'pro'],
    default: 'basic'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'cancelled'],
    default: 'active'
  },
  razorpayOrderId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  razorpaySignature: {
    type: String
  },
  amount: {
    type: Number,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
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

subscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set end date based on plan (1 year from start)
  if (this.plan !== 'basic' && this.status === 'active' && !this.endDate) {
    const endDate = new Date(this.startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    this.endDate = endDate;
  }
  
  next();
});

subscriptionSchema.index({ userId: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
