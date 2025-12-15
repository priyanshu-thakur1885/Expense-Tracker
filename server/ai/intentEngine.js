// Deterministic intent detection using rules/keywords.
// Intent labels: ADD_EXPENSE, UPDATE_EXPENSE, DELETE_EXPENSE, SHOW_SUMMARY,
// CATEGORY_ANALYSIS, GENERAL_QUESTION, UNKNOWN

const INTENTS = {
  ADD_EXPENSE: 'ADD_EXPENSE',
  UPDATE_EXPENSE: 'UPDATE_EXPENSE',
  DELETE_EXPENSE: 'DELETE_EXPENSE',
  SHOW_SUMMARY: 'SHOW_SUMMARY',
  CATEGORY_ANALYSIS: 'CATEGORY_ANALYSIS',
  SET_BUDGET: 'SET_BUDGET',
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  UNKNOWN: 'UNKNOWN',
};

function detectIntent(text) {
  const msg = (text || '').toLowerCase();

  const hasAmount = /\b\d+(\.\d+)?\b/.test(msg);
  const hasExpenseKeywords = /(expense|spent|spend|cost|price|bought|purchase|pay|paid)/.test(msg);
  const hasAdd = /(add|record|create|log)/.test(msg);
  const hasUpdate = /(update|edit|change|modify)/.test(msg);
  const hasDelete = /(delete|remove)/.test(msg);
  const hasSummary = /(summary|total|how much|spent this month|month|weekly|daily)/.test(msg);
  const hasCategory = /(category|categories|food|travel|shopping|rent|grocery|groceries)/.test(msg);
  const hasBudget = /(budget|limit|cap|monthly limit|set budget|my budget)/.test(msg);
  const hasCurrencyNumber = /(rs|inr|₹)\s*\d+|\d+\s*(rs|inr|₹)/.test(msg) || /\b\d{3,}\b/.test(msg);

  if ((hasAdd || /i bought|i spent|i paid/.test(msg)) && hasExpenseKeywords && hasAmount) {
    return INTENTS.ADD_EXPENSE;
  }
  if (hasUpdate && hasExpenseKeywords) return INTENTS.UPDATE_EXPENSE;
  if (hasDelete && hasExpenseKeywords) return INTENTS.DELETE_EXPENSE;
  if (hasBudget && hasCurrencyNumber) return INTENTS.SET_BUDGET;
  if (hasSummary) return INTENTS.SHOW_SUMMARY;
  if (hasCategory && (hasSummary || /compare|comparison|vs/.test(msg))) return INTENTS.CATEGORY_ANALYSIS;
  if (hasExpenseKeywords) return INTENTS.GENERAL_QUESTION;
  return INTENTS.UNKNOWN;
}

module.exports = { INTENTS, detectIntent };

