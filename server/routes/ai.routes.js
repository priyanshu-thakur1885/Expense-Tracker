const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { INTENTS, detectIntent } = require('../ai/intentEngine');
const { findBestPattern, upsertPattern, isHighConfidence } = require('../ai/patternEngine');
const { recordInteraction, recordFeedback } = require('../ai/knowledgeEngine');
const { applyFeedback, planClarification } = require('../ai/learningEngine');
const { toNaturalLanguage } = require('../ai/languageEngine');
const actionEngine = require('../ai/actionEngine');
const { embedText } = require('../ai/sharedEmbedding');
const User = require('../models/User');
const AIInteraction = require('../models/AIInteraction');

const router = express.Router();

function extractDateRangeFromMessage(msg) {
  const text = (msg || '').toLowerCase();
  const dateRegex = /\d{4}-\d{2}-\d{2}/g;
  const matches = msg.match(dateRegex);
  if (matches && matches.length >= 2) {
    return { start: matches[0], end: matches[1] };
  }
  if (/last 7 days|last week/.test(text)) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return { start, end };
  }
  if (/last 30 days|last month/.test(text)) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { start, end };
  }
  return { start: null, end: null };
}

function extractSearchFilters(msg) {
  const text = (msg || '').toLowerCase();
  const filters = {};
  const between = text.match(/between\s+(\d+(?:\.\d+)?)\s+(?:and|to)\s+(\d+(?:\.\d+)?)/);
  if (between) {
    filters.minAmount = parseFloat(between[1]);
    filters.maxAmount = parseFloat(between[2]);
  } else {
    const above = text.match(/(above|over|greater than|more than)\s+(\d+(?:\.\d+)?)/);
    const below = text.match(/(below|under|less than)\s+(\d+(?:\.\d+)?)/);
    if (above) filters.minAmount = parseFloat(above[2]);
    if (below) filters.maxAmount = parseFloat(below[2]);
  }
  const catMatch = text.match(/\b(in|for)\s+([a-z]+)\b/);
  if (catMatch) filters.category = catMatch[2];

  const keywordMatch = text.match(/with\s+([\w\s]+)/) || text.match(/containing\s+([\w\s]+)/) || text.match(/about\s+([\w\s]+)/);
  if (keywordMatch) filters.keyword = keywordMatch[1].trim();

  const { start, end } = extractDateRangeFromMessage(msg);
  filters.startDate = start;
  filters.endDate = end;
  return filters;
}

// Bootstrap a few patterns on startup
async function ensureBasePatterns() {
  const seeds = [
    { patternId: 'MONTHLY_SUMMARY', handler: 'summary', sampleQuestions: ['how much did i spend this month', 'monthly expense total', 'show this month’s spending', 'monthly spend', 'total spent this month', 'what is my monthly expense'], baseConfidence: 0.72 },
    { patternId: 'CATEGORY_ANALYSIS', handler: 'category', sampleQuestions: ['which category do i spend the most on', 'category breakdown', 'compare categories'], baseConfidence: 0.7 },
    { patternId: 'SET_BUDGET', handler: 'setBudget', sampleQuestions: ['my monthly budget is 6000rs', 'set my budget to 8000', 'monthly limit 5000', 'set budget 4000', 'budget 3000'], baseConfidence: 0.7 },
    { patternId: 'GET_BUDGET', handler: 'getBudget', sampleQuestions: ['what is my monthly budget', 'show my budget', 'current budget amount', 'budget left', 'remaining budget', 'how much budget do i have'], baseConfidence: 0.7 },
    { patternId: 'SET_ASSISTANT_NAME', handler: 'setAssistantName', sampleQuestions: ['i want to name you', 'set your name to hyperx', 'i will call you buddy', 'your name is hyperx', 'call you hyperx'], baseConfidence: 0.7 },
    { patternId: 'CUSTOM_RANGE_SUMMARY', handler: 'summaryRange', sampleQuestions: ['show my expenses from 2024-01-01 to 2024-01-15', 'total spent between 2024-02-01 and 2024-02-10', 'last 30 days spend', 'last week expenses'], baseConfidence: 0.65 },
    { patternId: 'MONTHLY_COMPARISON', handler: 'compareMonths', sampleQuestions: ['compare this month to last month', 'month vs month spending', 'did i spend more than last month'], baseConfidence: 0.65 },
    { patternId: 'OVERSPENDING_CHECK', handler: 'overspending', sampleQuestions: ['am i over budget', 'am i overspending', 'budget status', 'near my limit'], baseConfidence: 0.65 },
    { patternId: 'TOP_CATEGORY', handler: 'topCategories', sampleQuestions: ['top spending category', 'which category is highest', 'where did i spend the most', 'lowest spending category'], baseConfidence: 0.65 },
    { patternId: 'SEARCH_FILTER', handler: 'searchExpenses', sampleQuestions: ['show expenses above 500', 'find expenses below 200 in food', 'search groceries between 100 and 300', 'filter expenses with coffee'], baseConfidence: 0.65 },
    { patternId: 'FORECAST', handler: 'forecast', sampleQuestions: ['forecast my spending', 'predict this month total', 'expected monthly spend', 'projected savings'], baseConfidence: 0.6 },
    { patternId: 'ADVICE', handler: 'advice', sampleQuestions: ['how can i save money', 'am i overspending', 'give me tips to spend less', 'is my spending healthy'], baseConfidence: 0.6 },
  ];
  for (const seed of seeds) {
    await upsertPattern(seed);
  }
}
ensureBasePatterns().catch(err => console.error('Pattern seed error', err));

router.post('/chat', authenticateToken, async (req, res) => {
  const started = Date.now();
  try {
    const { message, expense } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }
    const cleanMsg = message.trim();

    // Fetch user for personalization
    const userDoc = await User.findById(req.user._id).select('preferences name');
    const assistantName = userDoc?.preferences?.assistantName || 'AI Assistant';
    // Last interaction to allow follow-ups (e.g., naming flow)
    const lastInteraction = await AIInteraction.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('detectedPattern intent success')
      .lean();

    // 1) Intent
    const intent = detectIntent(cleanMsg);

    // 2) Pattern match
    const { pattern, score } = await findBestPattern(cleanMsg);
    const patternId = pattern?.patternId || 'UNKNOWN';
    const confidence = score || 0;

    // 3) Clarification will be decided after attempting action
    let clarification = null;
    let actionResult = null;
    let success = false;

    // 4) Action routing (deterministic)
    try {
      if (intent === INTENTS.GREETING) {
        actionResult = { text: `Hi there! I'm ${assistantName}.` };
        success = true;
        clarification = null;
      } else if (intent === INTENTS.SET_BUDGET || patternId === 'SET_BUDGET') {
        const amount = expense?.amount || cleanMsg.match(/(\d+(?:\.\d+)?)/)?.[1];
        if (amount) {
          actionResult = await actionEngine.setBudget(req.user._id, amount);
          success = true;
          clarification = null; // we have what we need
        } else {
          clarification = 'What budget amount should I set?';
        }
      } else if (intent === INTENTS.GET_BUDGET || patternId === 'GET_BUDGET') {
        actionResult = await actionEngine.getBudget(req.user._id);
        success = true;
        clarification = null;
      } else if (
        intent === INTENTS.SET_ASSISTANT_NAME ||
        patternId === 'SET_ASSISTANT_NAME' ||
        (lastInteraction?.detectedPattern === 'SET_ASSISTANT_NAME' && !lastInteraction.success)
      ) {
        const extracted =
          expense?.assistantName ||
          cleanMsg.match(/call you\s+(.+)/i)?.[1] ||
          cleanMsg.match(/name\s+(?:is|to|as)\s+(.+)/i)?.[1] ||
          cleanMsg;
        if (extracted) {
          actionResult = await actionEngine.setAssistantName(req.user._id, extracted);
          success = true;
          clarification = null; // we have the data
        } else {
          clarification = 'What name would you like to give me?';
        }
      } else if (intent === INTENTS.ADD_EXPENSE && expense) {
        actionResult = await actionEngine.addExpense(req.user._id, expense);
        success = true;
      } else if (intent === INTENTS.UPDATE_EXPENSE && expense?.id) {
        const { id, ...updates } = expense;
        actionResult = await actionEngine.updateExpense(req.user._id, id, updates);
        success = true;
      } else if (intent === INTENTS.DELETE_EXPENSE && expense?.id) {
        actionResult = await actionEngine.deleteExpense(req.user._id, expense.id);
        success = true;
      } else if (intent === INTENTS.SHOW_SUMMARY || patternId === 'MONTHLY_SUMMARY') {
        actionResult = await actionEngine.getMonthlySummary(req.user._id, 0);
        success = true;
        clarification = null;
      } else if (intent === INTENTS.CUSTOM_RANGE_SUMMARY || patternId === 'CUSTOM_RANGE_SUMMARY') {
        const { start, end } = extractDateRangeFromMessage(cleanMsg);
        actionResult = await actionEngine.getSummaryByRange(req.user._id, start, end);
        success = true;
        clarification = null;
      } else if (intent === INTENTS.MONTHLY_COMPARISON || patternId === 'MONTHLY_COMPARISON') {
        actionResult = await actionEngine.compareMonths(req.user._id, 0, -1);
        success = true;
        clarification = null;
      } else if (intent === INTENTS.OVERSPENDING_CHECK || patternId === 'OVERSPENDING_CHECK') {
        actionResult = await actionEngine.getOverspendingStatus(req.user._id);
        success = true;
        clarification = null;
      } else if (intent === INTENTS.TOP_CATEGORY || patternId === 'TOP_CATEGORY') {
        actionResult = await actionEngine.getTopCategories(req.user._id, {});
        success = true;
        clarification = null;
      } else if (intent === INTENTS.SEARCH_FILTER || patternId === 'SEARCH_FILTER') {
        const filters = extractSearchFilters(cleanMsg);
        actionResult = await actionEngine.searchExpenses(req.user._id, filters);
        success = true;
        clarification = null;
      } else if (intent === INTENTS.FORECAST || patternId === 'FORECAST') {
        actionResult = await actionEngine.forecastSpend(req.user._id);
        success = true;
        clarification = null;
      } else if (intent === INTENTS.ADVICE || patternId === 'ADVICE') {
        actionResult = await actionEngine.advice(req.user._id);
        success = true;
        clarification = null;
      } else if (intent === INTENTS.CATEGORY_ANALYSIS || patternId === 'CATEGORY_ANALYSIS') {
        actionResult = await actionEngine.getCategoryComparison(req.user._id);
        success = true;
      } else if (intent === INTENTS.GENERAL_QUESTION && patternId !== 'UNKNOWN') {
        // Use pattern handler if any, else fallback to nothing
        if (pattern?.handler === 'summary') {
          actionResult = await actionEngine.getMonthlySummary(req.user._id, 0);
          success = true;
        } else if (pattern?.handler === 'category') {
          actionResult = await actionEngine.getCategoryComparison(req.user._id);
          success = true;
        }
      }
    } catch (err) {
      actionResult = { error: err.message };
    }

    // Fallback: if still not successful and the message looks budget-related (no amount), return current budget
    if (!success) {
      const budgety = /\b(budget|remaining budget|budget left|current budget|budget status)\b/.test(userMessage);
      const hasNumber = /\d/.test(userMessage);
      if (budgety && !hasNumber) {
        actionResult = await actionEngine.getBudget(req.user._id);
        success = true;
        clarification = null;
        intent = INTENTS.GET_BUDGET;
        patternId = 'GET_BUDGET';
      }
    }

    // If no success and no clarification yet, provide a targeted clarification
    if (!success && !clarification) {
      clarification = planClarification({ confidence, intent });
    }

    // 5) Response generation (LLM optional, only for phrasing)
    const responseText = await toNaturalLanguage({
      intent,
      patternId,
      actionResult,
      context: { confidence, patternId, assistantName, userName: userDoc?.name },
      clarification,
    });

    // 6) Store interaction
    const interaction = await recordInteraction({
      userId: req.user._id,
      question: cleanMsg,
      detectedPattern: patternId,
      intent,
      success,
      metadata: {
        retrievedPatterns: patternId === 'UNKNOWN' ? [] : [patternId],
        confidence,
        modelUsed: process.env.OLLAMA_MODEL || 'template',
        responseTime: Date.now() - started,
      }
    });

    return res.json({
      success: true,
      response: responseText,
      interactionId: interaction._id,
      confidence,
      patternId,
      intent,
      clarification: !!clarification
    });
  } catch (error) {
    console.error('AI chat error:', {
      message: error.message,
      intent: req?.body?.message,
      stack: error.stack
    });
    return res.status(500).json({ success: false, message: error.message || 'Chat failed' });
  }
});

router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const { interactionId, rating, correction, patternId } = req.body;
    if (rating !== -1 && rating !== 0 && rating !== 1) {
      return res.status(400).json({ success: false, message: 'rating must be -1,0,1' });
    }
    await recordFeedback({ interactionId, rating, correction });
    await applyFeedback({ patternId, rating });
    return res.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Feedback failed' });
  }
});

module.exports = router;

