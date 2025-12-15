const mongoose = require('mongoose');

const aiPatternSchema = new mongoose.Schema({
  patternId: { type: String, required: true, unique: true, index: true },
  sampleQuestions: { type: [String], default: [] },
  embedding: { type: [Number], default: [] },
  handler: { type: String, required: true }, // maps to action/analysis handler
  confidence: { type: Number, default: 0.5, min: 0, max: 1 },
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AIPattern', aiPatternSchema);

