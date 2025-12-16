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
  GET_BUDGET: 'GET_BUDGET',
  SET_ASSISTANT_NAME: 'SET_ASSISTANT_NAME',
  CUSTOM_RANGE_SUMMARY: 'CUSTOM_RANGE_SUMMARY',
  MONTHLY_COMPARISON: 'MONTHLY_COMPARISON',
  OVERSPENDING_CHECK: 'OVERSPENDING_CHECK',
  TOP_CATEGORY: 'TOP_CATEGORY',
  SEARCH_FILTER: 'SEARCH_FILTER',
  FORECAST: 'FORECAST',
  ADVICE: 'ADVICE',
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  GREETING: 'GREETING',
  UNKNOWN: 'UNKNOWN',
};

function detectIntent(text) {
  const msg = (text || '').toLowerCase();

  const hasAmount = /\b\d+(\.\d+)?\b/.test(msg);
  const hasExpenseKeywords = /(expense|spent|spend|cost|price|bought|purchase|pay|paid)/.test(msg);
  const hasAdd = /(add|record|create|log)/.test(msg);
  const hasUpdate = /(update|edit|change|modify)/.test(msg);
  const hasDelete = /(delete|remove)/.test(msg);
  const hasSummary = /(summary|total|how much|spent this month|monthly spend|monthly expense|month|weekly|daily|this month)/.test(msg);
  const hasCategory = /(category|categories|food|travel|shopping|rent|grocery|groceries)/.test(msg);
  const hasBudget = /(budget|limit|cap|monthly limit|set budget|my budget|remaining budget|budget left|current budget)/.test(msg);
  const hasCurrencyNumber = /(rs|inr|₹)\s*\d+|\d+\s*(rs|inr|₹)/.test(msg) || /\b\d{3,}\b/.test(msg);
  const wantsName = /(name you|call you|your name|set your name|give you a name|rename you)/.test(msg);
  const greeting = /^(hi|hello|hey|yo|sup|good morning|good afternoon|good evening)\b/.test(msg);
  const hasCompare = /(compare|versus|vs|difference|more than last month|less than last month)/.test(msg);
  const hasRange = /(from\s+\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}|between\s+\d{4}-\d{2}-\d{2}\s+and\s+\d{4}-\d{2}-\d{2}|last\s+\d+\s+days|last week|last month|last 7 days|last 30 days)/.test(msg);
  const hasForecast = /(forecast|predict|expected|projected|estimate|projection|forecasting)/.test(msg);
  const wantsAdvice = /(save money|overspending|spending healthy|tips|advice|improve spending|spend less|am i broke|am i overspending|is my spending healthy)/.test(msg);
  const wantsSearch = /(show|find|filter|search).*(above|below|over|under|greater than|less than|between|containing|with|about)/.test(msg);
  const wantsTopCategory = /(top category|highest category|most spent category|biggest spending|largest spend|lowest category|least spent)/.test(msg);
  const wantsOverspend = /(overspend|over spend|over budget|near budget|almost hit budget|budget status)/.test(msg);

  if (greeting) return INTENTS.GREETING;
  if ((hasAdd || /i bought|i spent|i paid/.test(msg)) && hasExpenseKeywords && hasAmount) {
    return INTENTS.ADD_EXPENSE;
  }
  if (hasUpdate && hasExpenseKeywords) return INTENTS.UPDATE_EXPENSE;
  if (hasDelete && hasExpenseKeywords) return INTENTS.DELETE_EXPENSE;
  if (hasBudget && hasCurrencyNumber && (hasAdd || /set/.test(msg))) return INTENTS.SET_BUDGET;
  if (hasBudget && !hasCurrencyNumber) return INTENTS.GET_BUDGET;
  if (hasCompare || /month vs|vs last month|compare months/.test(msg)) return INTENTS.MONTHLY_COMPARISON;
  if (hasRange) return INTENTS.CUSTOM_RANGE_SUMMARY;
  if (wantsOverspend) return INTENTS.OVERSPENDING_CHECK;
  if (wantsTopCategory) return INTENTS.TOP_CATEGORY;
  if (hasForecast) return INTENTS.FORECAST;
  if (wantsAdvice) return INTENTS.ADVICE;
  if (wantsSearch) return INTENTS.SEARCH_FILTER;
  if (wantsName) return INTENTS.SET_ASSISTANT_NAME;
  if (hasSummary) return INTENTS.SHOW_SUMMARY;
  if (hasCategory && (hasSummary || /compare|comparison|vs/.test(msg))) return INTENTS.CATEGORY_ANALYSIS;
  if (hasExpenseKeywords) return INTENTS.GENERAL_QUESTION;
  return INTENTS.UNKNOWN;
}

module.exports = { INTENTS, detectIntent };

