async function applyFeedback({ patternId, rating } = {}) {
  return {
    patternId: patternId || 'UNKNOWN',
    rating: Number(rating || 0),
    applied: true
  };
}

function planClarification({ confidence, intent } = {}) {
  const value = Number(confidence || 0);

  if (intent === 'SET_BUDGET') {
    return 'What budget amount should I set?';
  }

  if (intent === 'SET_ASSISTANT_NAME') {
    return 'What name would you like me to use?';
  }

  if (intent === 'ADD_EXPENSE') {
    return 'Please share the expense item, amount, and place you spent it.';
  }

  if (value >= 0.7) {
    return 'I can help with monthly totals, category breakdowns, budgets, and spending trends.';
  }

  return 'Could you tell me more about the spending detail you want to check?';
}

module.exports = {
  applyFeedback,
  planClarification
};
