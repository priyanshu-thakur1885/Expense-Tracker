const AIPattern = require('../models/AIPattern');
const AIInteraction = require('../models/AIInteraction');
const AIFeedback = require('../models/AIFeedback');

async function recordInteraction({ userId, question, detectedPattern, intent, success, metadata }) {
  const doc = new AIInteraction({
    userId,
    question,
    detectedPattern,
    intent,
    success,
    metadata,
  });
  await doc.save();
  return doc;
}

async function recordFeedback({ interactionId, rating, correction }) {
  const feedback = new AIFeedback({ interactionId, rating, correction });
  await feedback.save();
  return feedback;
}

async function adjustPatternConfidence(patternId, delta) {
  if (!patternId) return;
  await AIPattern.findOneAndUpdate(
    { patternId },
    {
      $inc: {
        confidence: delta,
        usageCount: 1,
      }
    },
    { new: true }
  );
}

module.exports = {
  recordInteraction,
  recordFeedback,
  adjustPatternConfidence,
};

