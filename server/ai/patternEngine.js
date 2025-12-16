const AIPattern = require('../models/AIPattern');
const { embedText, cosineSimilarity } = require('./sharedEmbedding');

const DEFAULT_THRESHOLD = 0.6;
const MAX_CANDIDATES = 50;

async function findBestPattern(question) {
  const patterns = await AIPattern.find({}).limit(MAX_CANDIDATES).lean();
  if (patterns.length === 0) return { pattern: null, score: 0 };

  const qEmbedding = await embedText(question);
  if (!qEmbedding) {
    // Fallback: naive keyword match
    const lower = question.toLowerCase();
    const hit = patterns.find(p => p.sampleQuestions.some(sq => lower.includes(sq.toLowerCase())));
    return hit ? { pattern: hit, score: 0.5 } : { pattern: null, score: 0 };
  }

  let best = null;
  let bestScore = 0;
  for (const p of patterns) {
    if (!p.embedding || p.embedding.length !== qEmbedding.length) continue;
    const score = cosineSimilarity(qEmbedding, p.embedding);
    if (score > bestScore) {
      best = p;
      bestScore = score;
    }
  }

  return { pattern: best, score: bestScore };
}

async function upsertPattern({ patternId, sampleQuestions, handler, baseConfidence = 0.5 }) {
  const textForEmbedding = sampleQuestions && sampleQuestions.length ? sampleQuestions.join('\n') : patternId;
  const embedding = await embedText(textForEmbedding);
  return AIPattern.findOneAndUpdate(
    { patternId },
    {
      $set: {
        patternId,
        handler,
        embedding: embedding || [],
      },
      $addToSet: { sampleQuestions: { $each: sampleQuestions || [] } },
      $setOnInsert: { confidence: baseConfidence, usageCount: 0 },
    },
    { upsert: true, new: true }
  );
}

function isHighConfidence(score, pattern) {
  const baseline = pattern?.confidence || 0.5;
  return score >= Math.max(DEFAULT_THRESHOLD, baseline);
}

module.exports = {
  findBestPattern,
  upsertPattern,
  isHighConfidence,
};

