const { adjustPatternConfidence } = require('./knowledgeEngine');

const POS_DELTA = 0.02;
const NEG_DELTA = -0.05;
const MAX_CONF = 0.98;
const MIN_CONF = 0.1;

async function applyFeedback({ patternId, rating }) {
  if (!patternId || rating === 0) return;
  const delta = rating > 0 ? POS_DELTA : NEG_DELTA;
  await adjustPatternConfidence(patternId, delta);
}

function planClarification({ confidence, intent }) {
  if (confidence >= 0.75) return null;
  return `I’m not fully sure about your request (${intent}). Could you clarify what you want to do?`;
}

function capConfidence(conf) {
  return Math.min(MAX_CONF, Math.max(MIN_CONF, conf));
}

module.exports = { applyFeedback, planClarification, capConfidence };

