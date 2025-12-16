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
    case 'CUSTOM_RANGE_SUMMARY': {
      if (!actionResult) return 'No data found for that range.';
      const { total, count, byCategory, period } = actionResult;
      const cats = Object.entries(byCategory || {})
        .map(([c, a]) => `${c} (₹${a.toFixed(2)})`)
        .join(', ') || 'no categories';
      return `From ${period?.start?.toLocaleDateString?.() || '?'} to ${period?.end?.toLocaleDateString?.() || '?'} you spent ₹${(total || 0).toFixed(2)} across ${count || 0} expenses. Top categories: ${cats}.`;
    }
    case 'MONTHLY_COMPARISON': {
      if (!actionResult) return 'No comparison data.';
      const { current, previous, delta, pct } = actionResult;
      const direction = delta < 0 ? 'more' : delta > 0 ? 'less' : 'the same as';
      return `This month you spent ₹${(current?.total || 0).toFixed(2)}and the last month expenses were ₹${(previous?.total || 0).toFixed(2)}. You spent ${direction} last month. Change: ₹${delta.toFixed(2)}${pct !== null && pct !== undefined ? ` (${pct.toFixed(1)}%)` : ''}.`;
    }
    case 'OVERSPENDING_CHECK': {
      if (!actionResult || actionResult.message === 'No budget set yet.') return 'You have not set a budget yet.';
      const { status, monthlyLimit, currentSpent, remaining, percent } = actionResult;
      const statusText = status === 'over' ? 'You are over budget.' :
        status === 'danger' ? 'You are very close to your budget.' :
        status === 'warning' ? 'You are approaching your budget.' :
        'You are within budget.';
      return `${statusText} Limit: ₹${monthlyLimit?.toFixed?.(2) || monthlyLimit}. Spent: ₹${currentSpent?.toFixed?.(2) || currentSpent}. Remaining: ₹${remaining?.toFixed?.(2) || remaining}. ${percent !== null && percent !== undefined ? `Used: ${percent.toFixed(1)}%.` : ''}`;
    }
    case 'TOP_CATEGORY': {
      if (!actionResult || !actionResult.categories?.length) return 'No category data yet.';
      const list = actionResult.categories.map(([c, a], idx) => `${idx + 1}) ${c}: ₹${a.toFixed(2)}`).join('\n');
      return `Top categories:\n${list}`;
    }
    case 'SEARCH_FILTER': {
      if (!actionResult) return 'No matching expenses found.';
      const { totalCount, sample } = actionResult;
      if (!totalCount) return 'No matching expenses found.';
      const lines = sample.map(e => `${e.item} - ₹${e.amount.toFixed(2)} (${e.category}) on ${new Date(e.date).toLocaleDateString()}`);
      return `Found ${totalCount} matching expenses. Recent matches:\n${lines.join('\n')}`;
    }
    case 'FORECAST': {
      if (!actionResult || actionResult.message) return actionResult?.message || 'Not enough data to forecast.';
      const { avgPerDay, daysConsidered, daysRemaining, spentThisMonth, projectedMonthTotal } = actionResult;
      return `Based on the last ${daysConsidered} days, you spend about ₹${avgPerDay.toFixed(2)} per day. You have ${daysRemaining} days left in this month. Spent so far this month: ₹${(spentThisMonth || 0).toFixed(2)}. Projected month total: ₹${(projectedMonthTotal || 0).toFixed(2)}.`;
    }
    case 'ADVICE':
      return actionResult?.text || 'Track a few more expenses and budgets so I can give tailored tips.';
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

