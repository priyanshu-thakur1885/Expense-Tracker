const patternStore = new Map();

function normalizeText(value = '') {
  return String(value || '').toLowerCase().trim();
}

function defaultPattern(seed) {
  return {
    patternId: seed.patternId,
    sampleQuestions: Array.isArray(seed.sampleQuestions) ? seed.sampleQuestions : [],
    embedding: Array.isArray(seed.embedding) ? seed.embedding : [],
    handler: seed.handler || 'general',
    confidence: Number(seed.baseConfidence ?? seed.confidence ?? 0.5),
    usageCount: Number(seed.usageCount ?? 0),
    createdAt: new Date().toISOString()
  };
}

async function upsertPattern(seed = {}) {
  const pattern = defaultPattern(seed);
  patternStore.set(pattern.patternId, pattern);
  return pattern;
}

async function findBestPattern(message) {
  const text = normalizeText(message);
  if (!text) {
    return { pattern: null, score: 0 };
  }

  let bestPattern = null;
  let bestScore = 0;

  for (const pattern of patternStore.values()) {
    const samples = pattern.sampleQuestions || [];
    const sampleText = samples.join(' ').toLowerCase();
    const combined = `${sampleText} ${pattern.patternId}`.toLowerCase();

    let score = 0;
    if (combined.includes(text) || text.includes(combined)) {
      score += 0.8;
    }

    for (const sample of samples) {
      const normalizedSample = normalizeText(sample);
      const overlap = text.includes(normalizedSample) || normalizedSample.includes(text);
      if (overlap) {
        score += 0.2;
      }
    }

    if (pattern.patternId.toLowerCase().includes(text) || text.includes(pattern.patternId.toLowerCase())) {
      score += 0.2;
    }

    score += Number(pattern.confidence || 0) * 0.5;

    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  if (!bestPattern) {
    return { pattern: { patternId: 'UNKNOWN', handler: 'unknown', confidence: 0 }, score: 0 };
  }

  return { pattern: bestPattern, score: Math.min(bestScore, 1) };
}

function isHighConfidence(score) {
  return Number(score || 0) >= 0.7;
}

module.exports = {
  patternStore,
  findBestPattern,
  upsertPattern,
  isHighConfidence
};
