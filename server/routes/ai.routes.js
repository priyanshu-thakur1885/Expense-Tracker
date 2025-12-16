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

// Bootstrap a few patterns on startup
async function ensureBasePatterns() {
  const seeds = [
    { patternId: 'MONTHLY_SUMMARY', handler: 'summary', sampleQuestions: ['how much did i spend this month', 'monthly expense total', 'show this month’s spending', 'monthly spend', 'total spent this month', 'what is my monthly expense'], baseConfidence: 0.72 },
    { patternId: 'CATEGORY_ANALYSIS', handler: 'category', sampleQuestions: ['which category do i spend the most on', 'category breakdown', 'compare categories'], baseConfidence: 0.7 },
    { patternId: 'SET_BUDGET', handler: 'setBudget', sampleQuestions: ['my monthly budget is 6000rs', 'set my budget to 8000', 'monthly limit 5000', 'set budget 4000', 'budget 3000'], baseConfidence: 0.7 },
    { patternId: 'GET_BUDGET', handler: 'getBudget', sampleQuestions: ['what is my monthly budget', 'show my budget', 'current budget amount', 'budget left', 'remaining budget', 'how much budget do i have'], baseConfidence: 0.7 },
    { patternId: 'SET_ASSISTANT_NAME', handler: 'setAssistantName', sampleQuestions: ['i want to name you', 'set your name to hyperx', 'i will call you buddy', 'your name is hyperx', 'call you hyperx'], baseConfidence: 0.7 },
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

    // 3) Clarification if low confidence (default)
    let clarification = intent === INTENTS.GREETING ? null : planClarification({ confidence, intent });
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

