const https = require('https');

let localEmbedder = null;
let loading = false;
let embedderWarningShown = false;

// Attempt to use @xenova/transformers if available (pure JS, no external API).
async function loadLocalEmbedder() {
  if (loading) return localEmbedder;
  if (localEmbedder !== null) return localEmbedder; // Already tried
  loading = true;
  try {
    // Dynamic import to avoid hard dependency if not installed.
    const { pipeline } = await import('@xenova/transformers');
    localEmbedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('✅ Local embedder loaded (Xenova transformers)');
  } catch (err) {
    localEmbedder = false; // Mark as failed so we don't retry
    if (!embedderWarningShown) {
      console.warn('⚠️ Local embedder not available (using keyword fallback). Install with: npm install @xenova/transformers');
      console.warn('   Or set OLLAMA_EMBED_MODEL for Ollama embeddings');
      embedderWarningShown = true;
    }
  } finally {
    loading = false;
  }
  return localEmbedder;
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return -1;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData || '{}');
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function embedText(text) {
  if (!text || !text.trim()) return null;

  // 1) Try local embedder
  if (!localEmbedder) await loadLocalEmbedder();
  if (localEmbedder) {
    const output = await localEmbedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  // 2) Try Ollama embeddings if available (no API key needed)
  if (process.env.OLLAMA_EMBED_MODEL) {
    const url = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/embeddings';
    const payload = { model: process.env.OLLAMA_EMBED_MODEL, prompt: text };
    const result = await postJson(url, payload);
    if (result && result.embedding) return result.embedding;
  }

  // 3) Fallback: none
  return null;
}

module.exports = { embedText, cosineSimilarity };

