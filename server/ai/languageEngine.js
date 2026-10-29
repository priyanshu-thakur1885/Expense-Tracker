async function toNaturalLanguage({
  intent,
  patternId,
  actionResult,
  context,
  clarification
} = {}) {
  if (clarification) {
    return clarification;
  }

  if (actionResult?.text) {
    return actionResult.text;
  }

  if (actionResult?.error) {
    return `I hit a snag while processing that request: ${actionResult.error}`;
  }

  if (actionResult?.summary) {
    return actionResult.summary;
  }

  const assistantName = context?.assistantName || 'AI Assistant';
  const userName = context?.userName || 'there';

  if (intent === 'GREETING') {
    return `Hi ${userName}! I'm ${assistantName}. I can help with budgets, summaries, and spending insights.`;
  }

  if (patternId) {
    return `I found a ${patternId} pattern and am ready to help with your spending details.`;
  }

  return `Hi ${userName}! I can help with budgets, expense summaries, spending trends, and category analysis.`;
}

module.exports = {
  toNaturalLanguage
};
