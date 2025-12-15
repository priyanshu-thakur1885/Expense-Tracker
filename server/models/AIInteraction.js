const mongoose = require('mongoose');

const aiInteractionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  question: { type: String, required: true },
  detectedPattern: { type: String, default: 'UNKNOWN', index: true },
  intent: { type: String, default: 'UNKNOWN', index: true },
  success: { type: Boolean, default: false },
  metadata: {
    retrievedPatterns: { type: [String], default: [] },
    confidence: { type: Number, default: 0 },
    modelUsed: { type: String, default: '' },
    responseTime: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('AIInteraction', aiInteractionSchema);

