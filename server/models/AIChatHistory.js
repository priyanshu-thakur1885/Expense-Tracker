const mongoose = require('mongoose');

const aiChatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userMessage: {
    type: String,
    required: true,
    trim: true
  },
  aiResponse: {
    type: String,
    required: true,
    trim: true
  },
  expenseAdded: {
    type: Boolean,
    default: false
  },
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    default: null
  },
  metadata: {
    aiProvider: {
      type: String,
      enum: ['gemini', 'groq', 'huggingface'],
      default: 'gemini'
    },
    responseTime: {
      type: Number, // in milliseconds
      default: 0
    },
    tokensUsed: {
      type: Number,
      default: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Index for better query performance
aiChatHistorySchema.index({ userId: 1, createdAt: -1 });
aiChatHistorySchema.index({ createdAt: -1 });

// Virtual for formatted date
aiChatHistorySchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN');
});

// Virtual for formatted time
aiChatHistorySchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
});

// Enable virtual fields in JSON responses
aiChatHistorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('AIChatHistory', aiChatHistorySchema);

