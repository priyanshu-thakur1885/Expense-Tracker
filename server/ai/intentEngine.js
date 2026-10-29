const INTENTS = {
  GREETING: 'GREETING',
  SET_BUDGET: 'SET_BUDGET',
  GET_BUDGET: 'GET_BUDGET',
  SET_ASSISTANT_NAME: 'SET_ASSISTANT_NAME',
  ADD_EXPENSE: 'ADD_EXPENSE',
  UPDATE_EXPENSE: 'UPDATE_EXPENSE',
  DELETE_EXPENSE: 'DELETE_EXPENSE',
  SHOW_SUMMARY: 'SHOW_SUMMARY',
  CUSTOM_RANGE_SUMMARY: 'CUSTOM_RANGE_SUMMARY',
  MONTHLY_COMPARISON: 'MONTHLY_COMPARISON',
  OVERSPENDING_CHECK: 'OVERSPENDING_CHECK',
  TOP_CATEGORY: 'TOP_CATEGORY',
  SEARCH_FILTER: 'SEARCH_FILTER',
  FORECAST: 'FORECAST',
  ADVICE: 'ADVICE',
  CATEGORY_ANALYSIS: 'CATEGORY_ANALYSIS',
  GENERAL_QUESTION: 'GENERAL_QUESTION',
  UNKNOWN: 'UNKNOWN'
};

const normalize = (value = '') => String(value || '').toLowerCase().trim();

function detectIntent(message) {
  const text = normalize(message);
  if (!text) return INTENTS.UNKNOWN;

  if (/(hi|hello|hey|good (morning|afternoon|evening)|greetings)/.test(text)) {
    return INTENTS.GREETING;
  }

  if (/(set|update|change).*(budget|limit)|budget.*(is|=|to)\s*\d|monthly budget\s*\d/.test(text)) {
    return INTENTS.SET_BUDGET;
  }

  if (/(show|what|current|remaining|left).*budget|budget.*(left|remaining|current)|how much.*budget/.test(text)) {
    return INTENTS.GET_BUDGET;
  }

  if (/(call you|your name|name you|set your name|assistant name)/.test(text)) {
    return INTENTS.SET_ASSISTANT_NAME;
  }

  if (/(add|record|save|create).*(expense|spending)|spent .* on|bought .* for|purchased .* for|cost .*\d/.test(text)) {
    return INTENTS.ADD_EXPENSE;
  }

  if (/(delete|remove).*expense|remove this expense/.test(text)) {
    return INTENTS.DELETE_EXPENSE;
  }

  if (/(summary|total spent|this month|monthly spend|expense report)/.test(text)) {
    return INTENTS.SHOW_SUMMARY;
  }

  if (/(between|from .* to .*|last (7|30) days|last week|last month)/.test(text)) {
    return INTENTS.CUSTOM_RANGE_SUMMARY;
  }

  if (/(compare|vs|versus).*month|last month.*this month|month over month/.test(text)) {
    return INTENTS.MONTHLY_COMPARISON;
  }

  if (/(over budget|overspending|budget status|near.*limit|limit.*reach)/.test(text)) {
    return INTENTS.OVERSPENDING_CHECK;
  }

  if (/(top category|highest spending|where did i spend the most|category breakdown|which category)/.test(text)) {
    return INTENTS.TOP_CATEGORY;
  }

  if (/(search|find|filter).*expense|expenses (above|below|between)|with .*keyword/.test(text)) {
    return INTENTS.SEARCH_FILTER;
  }

  if (/(forecast|predict|projected|expected.*spend|expected.*monthly)/.test(text)) {
    return INTENTS.FORECAST;
  }

  if (/(save money|tips|advice|how can i reduce|spending healthy|financial advice)/.test(text)) {
    return INTENTS.ADVICE;
  }

  if (/(category|breakdown|compare categories|which category.*spend)/.test(text)) {
    return INTENTS.CATEGORY_ANALYSIS;
  }

  return INTENTS.GENERAL_QUESTION;
}

module.exports = {
  INTENTS,
  detectIntent
};
