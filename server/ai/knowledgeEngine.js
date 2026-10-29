async function recordInteraction(payload = {}) {
  return {
    _id: `interaction_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    userId: payload.userId,
    question: payload.question || '',
    detectedPattern: payload.detectedPattern || 'UNKNOWN',
    intent: payload.intent || 'UNKNOWN',
    success: Boolean(payload.success),
    metadata: payload.metadata || {},
    createdAt: new Date()
  };
}

async function recordFeedback(payload = {}) {
  return {
    _id: `feedback_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
    interactionId: payload.interactionId || null,
    rating: payload.rating || 0,
    correction: payload.correction || '',
    createdAt: new Date()
  };
}

module.exports = {
  recordInteraction,
  recordFeedback
};
