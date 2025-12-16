const https = require('https');
const { URL } = require('url');

// Lightweight language generator with optional Ollama (local) support.

function serializeContext(ctx) {
  if (!ctx) return '';
  return Object.entries(ctx)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n');
}

function templateResponse({ intent, patternId, actionResult, clarification }) {
  if (clarification) return clarification;

  switch (intent) {
    case 'GREETING':
      return 'Hey there! I can help with budgets, expenses, summaries, and category breakdowns. Try: "What is my monthly budget?" or "How much did I spend this month?"';
    case 'GET_BUDGET': {
      if (!actionResult || actionResult.message === 'No budget set yet.') {
        return 'You have not set a budget yet.';
      }
      const { monthlyLimit, currentSpent, remainingBudget, status } = actionResult;
      return `Budget: ${monthlyLimit?.toFixed ? monthlyLimit.toFixed(2) : monthlyLimit}\nSpent: ${currentSpent?.toFixed ? currentSpent.toFixed(2) : currentSpent}\nRemaining: ${remainingBudget?.toFixed ? remainingBudget.toFixed(2) : remainingBudget}\nStatus: ${status || '—'}`;
    }
    case 'SET_ASSISTANT_NAME':
      return actionResult?.assistantName
        ? `Got it — call me ${actionResult.assistantName}.`
        : 'What name would you like to give me?';
    case 'ADD_EXPENSE':
      return `Added expense: ${actionResult?.item} for ${actionResult?.amount}.`;
    case 'UPDATE_EXPENSE':
      return `Updated expense ${actionResult?._id}.`;
    case 'DELETE_EXPENSE':
      return `Deleted expense ${actionResult?._id}.`;
    case 'SHOW_SUMMARY':
      if (!actionResult) return 'No summary available.';
      return `You’ve spent ₹${actionResult.total.toFixed(2)} during this period across ${actionResult.count} expenses.
Your top spending categories were ${Object.entries(actionResult.byCategory)
  .map(([c, a]) => `${c} (₹${a.toFixed(2)})`)
  .join(', ') || 'not available'}.
Would you like a daily breakdown or a comparison with last month?`;

    case 'CATEGORY_ANALYSIS':
      if (!actionResult) return 'No category data.';
      return `Category totals: ${actionResult.byCategory.map(([c,a])=>`${c}:${a.toFixed(2)}`).join(', ')}`;
    default:
      return actionResult?.text || 'Here to help with your expenses.';
  }
}

function postJson(urlString, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const data = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      path: url.pathname + (url.search || ''),
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    if (process.env.OLLAMA_TOKEN) {
      options.headers.Authorization = `Bearer ${process.env.OLLAMA_TOKEN}`;
    }
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode >= 400) return reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
          resolve(parsed);
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('LLM request timeout')));
    req.write(data);
    req.end();
  });
}

async function generateWithLLM({ prompt }) {
  if (!process.env.OLLAMA_URL || !process.env.OLLAMA_MODEL) {
    return null; // LLM optional
  }
  const body = { model: process.env.OLLAMA_MODEL, prompt, stream: false };
  const result = await postJson(process.env.OLLAMA_URL, body);
  const text = result?.response || result?.choices?.[0]?.text;
  return text || null;
}

async function toNaturalLanguage({ intent, patternId, actionResult, context, clarification }) {
  // If LLM unavailable, use templates
  if (!process.env.OLLAMA_URL || !process.env.OLLAMA_MODEL) {
    return templateResponse({ intent, patternId, actionResult, clarification });
  }

  const base = templateResponse({ intent, patternId, actionResult, clarification });
  const ctxText = serializeContext(context);
  const prompt = [
    'Rewrite the given structured response in a concise, friendly tone.',
    'Stay factual; do not invent data.',
    context?.assistantName ? `Assistant name: ${context.assistantName}` : '',
    context?.userName ? `User name: ${context.userName}` : '',
    `Structured response: ${base}`,
    ctxText ? `Context:\n${ctxText}` : ''
  ].join('\n');

  const llmText = await generateWithLLM({ prompt });
  return llmText || base;
}

module.exports = { toNaturalLanguage };

