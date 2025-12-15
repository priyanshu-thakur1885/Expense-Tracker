const mongoose = require('mongoose');

const aiFeedbackSchema = new mongoose.Schema({
  interactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AIInteraction', required: true, index: true },
  rating: { type: Number, enum: [-1, 0, 1], default: 0 },
  correction: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AIFeedback', aiFeedbackSchema);

