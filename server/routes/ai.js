const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const AIChatHistory = require('../models/AIChatHistory');
const https = require('https');

const router = express.Router();

// Cache for available models (refresh every 1 hour)
let modelCache = {
  model: null,
  timestamp: null,
  ttl: 3600000 // 1 hour in milliseconds
};

// Helper function to parse expense from natural language
function parseExpenseFromMessage(message) {
  const expensePatterns = [
    // Pattern: "add an expense, food item- pizza, price - 100rs, food court - CSE food court"
    /(?:add|create|record)\s+(?:an\s+)?expense[,\s]+(?:food\s+)?item[-\s:]+(.+?)[,\s]+(?:price|cost|amount)[-\s:]+(?:rs|rupees|₹|inr)?\s*(\d+(?:\.\d+)?)(?:\s*(?:rs|rupees|₹|inr))?[,\s]+(?:food\s+)?court[-\s:]+(.+?)(?:$|,)/i,
    // Pattern: "food item- pizza, price - 100rs, food court - CSE food court"
    /(?:food\s+)?item[-\s:]+(.+?)[,\s]+(?:price|cost|amount)[-\s:]+(?:rs|rupees|₹|inr)?\s*(\d+(?:\.\d+)?)(?:\s*(?:rs|rupees|₹|inr))?[,\s]+(?:food\s+)?court[-\s:]+(.+?)(?:$|,)/i,
    // Pattern: "I had/bought [item] from [foodCourt] and it cost me [amount]" - handles currency before or after
    /(?:I\s+(?:had|bought|purchased|spent|got))\s+(.+?)\s+(?:from|at)\s+(.+?)\s+(?:and\s+it\s+cost\s+(?:me)?|for|costing|cost\s+(?:me)?)\s*(?:rs|rupees|₹|inr)?\s*(\d+(?:\.\d+)?)(?:\s*(?:rs|rupees|₹|inr))?/i,
    // Pattern: "Add expense: [item] [amount] from [foodCourt]" - handles currency before or after
    /(?:add|create|record)\s+(?:expense|spending)?:?\s*(.+?)\s+(?:rs|rupees|₹|inr)?\s*(\d+(?:\.\d+)?)(?:\s*(?:rs|rupees|₹|inr))?\s+(?:from|at)\s+(.+)/i,
    // Pattern: "[item] [amount] from [foodCourt]" - handles currency before or after
    /(.+?)\s+(?:rs|rupees|₹|inr)?\s*(\d+(?:\.\d+)?)(?:\s*(?:rs|rupees|₹|inr))?\s+(?:from|at)\s+(.+)/i,
  ];

  for (const pattern of expensePatterns) {
    const match = message.match(pattern);
    if (match) {
      // Pattern order: item, amount, foodCourt (for most patterns)
      // But some patterns might have different order, so we check
      let item, amount, foodCourt;
      
      if (match.length >= 4) {
        item = match[1]?.trim();
        amount = parseFloat(match[2]);
        foodCourt = match[3]?.trim();
      }

      if (item && amount && foodCourt && !isNaN(amount) && amount > 0) {
        // Try to detect category from item name
        const itemLower = item.toLowerCase();
        let category = 'other';
        
        if (itemLower.match(/\b(breakfast|coffee|tea|milk|bread|toast|paratha|idli|dosa)\b/)) {
          category = 'breakfast';
        } else if (itemLower.match(/\b(lunch|rice|dal|curry|thali|biryani|roti|naan)\b/)) {
          category = 'lunch';
        } else if (itemLower.match(/\b(dinner|pizza|burger|pasta|noodles|chinese)\b/)) {
          category = 'dinner';
        } else if (itemLower.match(/\b(snack|samosa|pakora|chips|biscuit|cookie)\b/)) {
          category = 'snacks';
        } else if (itemLower.match(/\b(drink|juice|cola|pepsi|coke|water|soda)\b/)) {
          category = 'drinks';
        } else if (itemLower.match(/\b(grocery|vegetable|fruit|milk|bread|egg)\b/)) {
          category = 'groceries';
        }

        return { item, amount, foodCourt, category };
      }
    }
  }

  return null;
}

// Helper function to actually add an expense
async function addExpense(userId, expenseData) {
  try {
    const expense = new Expense({
      userId,
      item: expenseData.item,
      amount: expenseData.amount,
      category: expenseData.category || 'other',
      foodCourt: expenseData.foodCourt,
      description: expenseData.description || '',
      tags: expenseData.tags || [],
      date: expenseData.date ? new Date(expenseData.date) : new Date(),
    });

    await expense.save();

    // Update budget
    await Budget.findOneAndUpdate(
      { userId },
      { $inc: { currentSpent: expenseData.amount } },
      { upsert: true }
    );

    return { success: true, expense };
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
}

// Helper function to get user context data
async function getUserContext(userId) {
  try {
    const [user, budget, expenses] = await Promise.all([
      User.findById(userId).select('name email preferences'),
      Budget.findOne({ userId }),
      Expense.find({ userId })
        .sort({ date: -1 })
        .limit(50) // Get last 50 expenses for context
        .select('item amount category foodCourt description date tags')
    ]);

    // Calculate expense statistics
    const totalExpenses = expenses.length;
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categoryBreakdown = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});
    
    const recentExpenses = expenses.slice(0, 10).map(exp => ({
      item: exp.item,
      amount: exp.amount,
      category: exp.category,
      foodCourt: exp.foodCourt,
      date: exp.date
    }));

    return {
      user: {
        name: user?.name || 'User',
        email: user?.email || '',
        currency: user?.preferences?.currency || 'INR',
        theme: user?.preferences?.theme || 'light'
      },
      budget: budget ? {
        monthlyLimit: budget.monthlyLimit,
        currentSpent: budget.currentSpent,
        remainingBudget: budget.remainingBudget,
        spendingPercentage: budget.spendingPercentage,
        status: budget.status
      } : null,
      expenses: {
        total: totalExpenses,
        totalSpent: totalSpent,
        categoryBreakdown,
        recent: recentExpenses
      }
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return null;
  }
}

// Debug endpoint to check AI configuration (development only)
router.get('/config', authenticateToken, (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ message: 'Not available in production' });
  }
  
  const aiProvider = process.env.AI_PROVIDER || 'gemini';
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  const apiKeyLength = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0;
  const apiKeyPreview = process.env.GEMINI_API_KEY 
    ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...${process.env.GEMINI_API_KEY.substring(apiKeyLength - 4)}`
    : 'Not set';
  
  res.json({
    aiProvider,
    hasApiKey,
    apiKeyLength,
    apiKeyPreview,
    message: hasApiKey ? 'API key is configured' : 'API key is missing'
  });
});

// AI Chat endpoint
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message is required' 
      });
    }

    const userMessage = message.trim().toLowerCase();
    let expenseAdded = null;

    // Get recent chat history for context (last 5 messages)
    const recentChatHistory = await AIChatHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('userMessage aiResponse')
      .lean();

    // Check if user wants to add an expense
    // First, try to parse from current message - be proactive, try parsing any message
    let expenseData = parseExpenseFromMessage(message);
    
    // If current message is "add this expense" or similar, look in previous messages
    if (!expenseData && (userMessage.includes('add this') || userMessage.includes('add that') || 
        userMessage === 'add expense' || userMessage === 'add it' ||
        (userMessage.includes('add') && (userMessage.includes('expense') || userMessage.includes('it'))))) {
      // Look through recent chat history for expense details
      for (const chat of recentChatHistory) {
        expenseData = parseExpenseFromMessage(chat.userMessage);
        if (expenseData) {
          console.log('📝 Found expense in previous message:', chat.userMessage);
          break;
        }
      }
    }
    
    // If we found expense data, add it immediately
    if (expenseData) {
      console.log('📝 Parsed expense data:', expenseData);
      try {
        const result = await addExpense(req.user._id, expenseData);
        expenseAdded = result.expense;
        console.log('✅ Expense added via AI:', expenseAdded);
      } catch (error) {
        console.error('❌ Error adding expense:', error);
        // Continue to AI response - let AI explain the error
      }
    } else {
      // Log if we couldn't parse but message seems expense-related
      const seemsExpenseRelated = userMessage.includes('add') || userMessage.includes('expense') || 
                                   userMessage.includes('spent') || userMessage.includes('bought') ||
                                   userMessage.includes('had') || userMessage.includes('purchased') ||
                                   userMessage.includes('food item') || userMessage.includes('price') ||
                                   userMessage.includes('cost') || userMessage.includes('from') && /\d+/.test(userMessage);
      if (seemsExpenseRelated) {
        console.log('⚠️ Could not parse expense from message:', message);
      }
    }

    // Get user context (refresh to get updated data if expense was added)
    const userContext = await getUserContext(req.user._id);
    
    if (!userContext) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching user data' 
      });
    }

    // If expense was added, return direct confirmation instead of AI response
    if (expenseAdded) {
      const confirmationMessage = `Done! ✅ Added ${expenseAdded.item} for ${userContext.user.currency} ${expenseAdded.amount} from ${expenseAdded.foodCourt}.`;
      
      // Save chat history
      try {
        const chatHistory = new AIChatHistory({
          userId: req.user._id,
          userMessage: message,
          aiResponse: confirmationMessage,
          expenseAdded: true,
          expenseId: expenseAdded._id,
          metadata: {
            aiProvider: 'direct',
            responseTime: 0
          }
        });
        
        await chatHistory.save();
        console.log('✅ Chat history saved:', chatHistory._id);
      } catch (error) {
        console.error('❌ Error saving chat history:', error);
      }
      
      return res.json({
        success: true,
        response: confirmationMessage
      });
    }

    // Prepare context for AI - make it conversational and natural
    // Include recent chat history for context
    let chatContext = '';
    if (recentChatHistory.length > 0) {
      chatContext = '\n\nRecent conversation:\n' + recentChatHistory
        .reverse()
        .slice(0, 3)
        .map(chat => `User: ${chat.userMessage}\nAssistant: ${chat.aiResponse}`)
        .join('\n\n');
    }

    const contextPrompt = `You are a friendly, conversational AI assistant helping ${userContext.user.name} manage their expenses. 

IMPORTANT: Be natural, conversational, and respond like a helpful friend - NOT like a robot reading a report. Don't just list data. Have a real conversation!
${chatContext}

Here's ${userContext.user.name}'s expense data (use this naturally in conversation, don't just dump it):

${userContext.budget ? `
Budget: ${userContext.user.currency} ${userContext.budget.monthlyLimit} per month
Spent so far: ${userContext.user.currency} ${userContext.budget.currentSpent}
Remaining: ${userContext.user.currency} ${userContext.budget.remainingBudget}
Status: ${userContext.budget.status === 'safe' ? 'doing well' : userContext.budget.status === 'warning' ? 'getting close to limit' : userContext.budget.status === 'danger' ? 'almost at limit' : 'over budget'}
` : 'No budget set yet.'}

${userContext.expenses.total > 0 ? `
Total expenses: ${userContext.expenses.total}
Top spending categories: ${Object.entries(userContext.expenses.categoryBreakdown)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3)
  .map(([cat, amount]) => `${cat} (${userContext.user.currency} ${amount})`)
  .join(', ')}

Recent expenses:
${userContext.expenses.recent.slice(0, 5).map(exp => 
  `${exp.item} - ${userContext.user.currency} ${exp.amount} (${exp.category})`
).join('\n')}
` : 'No expenses recorded yet.'}

Guidelines:
- Match the user's energy and tone - if they're brief, be brief. If they're casual, be casual.
- If they say "ok", "thanks", "cool" - just say "You're welcome!" or "Anytime!" or similar. ONE sentence max.
- Only mention budget/expense data if they ASK about it. Don't volunteer it.
- Answer what they actually asked, nothing more.
- Be conversational, like texting a friend - not a business report.
- Keep it short unless they ask for details.`;

    // Call AI API (Google Gemini, Groq, or Hugging Face)
    const startTime = Date.now();
    const aiProvider = process.env.AI_PROVIDER || 'gemini'; // Default to groq for better free tier
    const aiResponse = await callAIAPI(message, contextPrompt);
    const responseTime = Date.now() - startTime;

    // Save chat history to database
    try {
      const chatHistory = new AIChatHistory({
        userId: req.user._id,
        userMessage: message,
        aiResponse: aiResponse,
        expenseAdded: !!expenseAdded,
        expenseId: expenseAdded ? expenseAdded._id : null,
        metadata: {
          aiProvider: aiProvider,
          responseTime: responseTime
        }
      });
      
      await chatHistory.save();
      console.log('✅ Chat history saved:', chatHistory._id);
    } catch (error) {
      // Don't fail the request if history saving fails
      console.error('❌ Error saving chat history:', error);
    }

    res.json({
      success: true,
      response: aiResponse
    });

  } catch (error) {
    console.error('❌ AI chat error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    
    // Provide more helpful error messages
    let errorMessage = 'AI service is temporarily unavailable. Please try again later.';
    
    if (error.message.includes('quota exceeded') || error.message.includes('Quota exceeded')) {
      // Use the detailed quota error message from the retry function
      errorMessage = error.message;
    } else if (error.message.includes('GEMINI_API_KEY not configured')) {
      errorMessage = 'AI service is not configured. Please contact support.';
    } else if (error.message.includes('API key')) {
      errorMessage = 'Invalid API key. Please check the configuration.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'AI service request timed out. Please try again.';
    } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
      errorMessage = 'Unable to connect to AI service. Please check your internet connection.';
    }
    
    res.status(500).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get chat history for the authenticated user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const chatHistory = await AIChatHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select('userMessage aiResponse expenseAdded expenseId metadata createdAt')
      .populate('expenseId', 'item amount category foodCourt');

    const total = await AIChatHistory.countDocuments({ userId: req.user._id });

    res.json({
      success: true,
      chatHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat history'
    });
  }
});

// Get chat statistics for the authenticated user
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalChats = await AIChatHistory.countDocuments({ userId: req.user._id });
    const expensesAdded = await AIChatHistory.countDocuments({ 
      userId: req.user._id, 
      expenseAdded: true 
    });
    
    const avgResponseTime = await AIChatHistory.aggregate([
      { $match: { userId: req.user._id } },
      { $group: {
        _id: null,
        avgResponseTime: { $avg: '$metadata.responseTime' }
      }}
    ]);

    const recentChats = await AIChatHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('createdAt userMessage')
      .lean();

    res.json({
      success: true,
      stats: {
        totalChats,
        expensesAdded,
        avgResponseTime: avgResponseTime[0]?.avgResponseTime || 0,
        recentChats
      }
    });
  } catch (error) {
    console.error('Error fetching chat stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat statistics'
    });
  }
});

// AI API call function - supports multiple free APIs
async function callAIAPI(userMessage, contextPrompt) {
  // Default to groq for better free tier limits (gemini only has 20/day)
  const aiProvider = process.env.AI_PROVIDER || 'groq'; // groq (recommended), gemini, or huggingface

  try {
    switch (aiProvider) {
      case 'gemini':
        return await callGeminiAPI(userMessage, contextPrompt);
      case 'groq':
        return await callGroqAPI(userMessage, contextPrompt);
      case 'huggingface':
        return await callHuggingFaceAPI(userMessage, contextPrompt);
      default:
        return await callGeminiAPI(userMessage, contextPrompt);
    }
  } catch (error) {
    console.error(`Error calling ${aiProvider} API:`, error);
    throw error;
  }
}

// Google Gemini API (Free tier: 60 requests/minute)
async function callGeminiAPI(userMessage, contextPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured. Get a free API key from https://makersuite.google.com/app/apikey');
  }

  // More conversational format - just context and user message
  const fullPrompt = `${contextPrompt}\n\nUser: ${userMessage}\n\nYou:`;

  const requestBody = {
    contents: [{
      parts: [{
        text: fullPrompt
      }]
    }]
  };

  const data = JSON.stringify(requestBody);

  // First, try to get available models (use cache if available)
  let availableModel = null;
  
  // Check cache first
  if (modelCache.model && modelCache.timestamp && 
      (Date.now() - modelCache.timestamp) < modelCache.ttl) {
    availableModel = modelCache.model;
    console.log(`✅ Using cached model: ${availableModel}`);
  } else {
    // Cache expired or doesn't exist, fetch fresh
    try {
      availableModel = await getAvailableGeminiModel(apiKey);
      // Update cache
      modelCache.model = availableModel;
      modelCache.timestamp = Date.now();
      console.log(`✅ Found available model: ${availableModel}`);
    } catch (error) {
      console.log(`⚠️ Could not list models: ${error.message}`);
      // If cache exists but expired, use it anyway as fallback
      if (modelCache.model) {
        availableModel = modelCache.model;
        console.log(`⚠️ Using stale cached model: ${availableModel}`);
      }
    }
  }

  // Try endpoints - use discovered model first, then fallbacks
  // Note: API keys from aistudio.google.com might need Generative Language API enabled
  const endpoints = availableModel 
    ? [{ version: 'v1beta', model: availableModel }]
    : [
        // Try common model names that work with aistudio.google.com API keys
        { version: 'v1beta', model: 'gemini-pro' },
        { version: 'v1beta', model: 'gemini-1.5-flash' },
        { version: 'v1beta', model: 'gemini-1.5-pro' },
        { version: 'v1', model: 'gemini-1.5-flash' },
        { version: 'v1', model: 'gemini-1.5-pro' },
        { version: 'v1', model: 'gemini-pro' }
      ];

  for (const endpoint of endpoints) {
    try {
      const result = await tryGeminiEndpointWithRetry(apiKey, data, endpoint.version, endpoint.model);
      return result;
    } catch (error) {
      // If it's a quota error, don't try other endpoints
      if (error.message.includes('quota') || error.message.includes('Quota exceeded')) {
        throw error;
      }
      console.log(`⚠️ Failed with ${endpoint.version}/${endpoint.model}: ${error.message}`);
      // Continue to next endpoint
      continue;
    }
  }

  // If all endpoints failed
  throw new Error('All Gemini API endpoints failed. Please verify your API key is valid and has access to Gemini models.');
}

// Helper function to retry with exponential backoff for quota errors
async function tryGeminiEndpointWithRetry(apiKey, data, version, model, maxRetries = 1) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await tryGeminiEndpoint(apiKey, data, version, model);
    } catch (error) {
      // Check if it's a quota error with retry time
      if (error.quotaExceeded || error.message.includes('quota') || error.message.includes('Quota exceeded')) {
        const retrySeconds = error.retryAfter || 15;
        
        if (attempt < maxRetries) {
          const waitTime = Math.min(retrySeconds * 1000, 30000); // Max 30 seconds
          console.log(`⏳ Quota exceeded, waiting ${waitTime/1000}s before retry (attempt ${attempt + 1}/${maxRetries + 1})...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          // Max retries reached - provide helpful error message
          const waitTime = Math.ceil(retrySeconds);
          throw new Error(`API quota exceeded. Free tier has a limit of 20 requests. Please wait ${waitTime} seconds and try again, or consider upgrading your API plan at https://ai.google.dev/pricing`);
        }
      }
      // Not a quota error, throw immediately
      throw error;
    }
  }
}

// Helper function to get available Gemini models
function getAvailableGeminiModel(apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models?key=${apiKey}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    console.log('🔍 Listing available Gemini models...');

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          const errorMsg = responseData ? JSON.parse(responseData).error?.message || `Status ${res.statusCode}` : `Status ${res.statusCode}`;
          reject(new Error(`Failed to list models: ${errorMsg}`));
          return;
        }

        try {
          const jsonData = JSON.parse(responseData);
          console.log('📋 Models response:', JSON.stringify(jsonData).substring(0, 500));
          
          if (jsonData.models && jsonData.models.length > 0) {
            // Find a model that supports generateContent
            const model = jsonData.models.find(m => 
              m.supportedGenerationMethods && 
              m.supportedGenerationMethods.includes('generateContent')
            );
            
            if (model) {
              // Extract just the model name (remove version prefix if any)
              const modelName = model.name.split('/').pop();
              console.log(`✅ Found model with generateContent: ${modelName}`);
              console.log(`📋 All available models: ${jsonData.models.map(m => m.name.split('/').pop()).join(', ')}`);
              resolve(modelName);
            } else {
              // If no model with generateContent, try the first model
              const firstModel = jsonData.models[0];
              const modelName = firstModel.name.split('/').pop();
              console.log(`⚠️ No model with generateContent found, trying first model: ${modelName}`);
              resolve(modelName);
            }
          } else {
            reject(new Error('No models found in response'));
          }
        } catch (error) {
          console.error('❌ Failed to parse models response:', responseData.substring(0, 200));
          reject(new Error(`Failed to parse models response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Failed to list models: ${error.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('List models request timeout'));
    });

    req.end();
  });
}

// Helper function to try a specific Gemini endpoint
function tryGeminiEndpoint(apiKey, data, version, model) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/${version}/models/${model}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log(`🔵 Trying Gemini API: ${version}/${model}`);

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          let errorMessage = `Gemini API error (${res.statusCode})`;
          let isQuotaError = false;
          let retryAfter = null;
          
          try {
            const errorData = JSON.parse(responseData);
            if (errorData.error && errorData.error.message) {
              errorMessage = errorData.error.message;
              // Check if it's a quota error
              if (errorMessage.includes('quota') || errorMessage.includes('Quota exceeded')) {
                isQuotaError = true;
                // Extract retry time from message
                const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);
                if (retryMatch) {
                  retryAfter = parseFloat(retryMatch[1]);
                }
              }
            }
          } catch (e) {
            // Not JSON, use raw response
          }
          
          const error = new Error(errorMessage);
          if (isQuotaError) {
            error.quotaExceeded = true;
            error.retryAfter = retryAfter;
          }
          reject(error);
          return;
        }

        try {
          const jsonData = JSON.parse(responseData);
          
          if (!jsonData.candidates || jsonData.candidates.length === 0) {
            reject(new Error('No response generated from Gemini API'));
            return;
          }

          const response = jsonData.candidates[0]?.content?.parts[0]?.text;
          
          if (!response) {
            reject(new Error('Empty response from Gemini API'));
            return;
          }
          
          console.log(`✅ Success with ${version}/${model}`);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse Gemini response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Gemini API request failed: ${error.message}`));
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Gemini API request timeout'));
    });

    req.write(data);
    req.end();
  });
}

// Groq API (Free tier: Very fast responses)
async function callGroqAPI(userMessage, contextPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured. Get a free API key from https://console.groq.com/');
  }

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'llama-3.1-8b-instant', // Free and fast model
      messages: [
        {
          role: 'system',
          content: contextPrompt
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Groq API error (${res.statusCode}): ${responseData}`));
          return;
        }

        try {
          const jsonData = JSON.parse(responseData);
          const response = jsonData.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse Groq response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Groq API request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

// Hugging Face Inference API (Free tier)
async function callHuggingFaceAPI(userMessage, contextPrompt) {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY not configured. Get a free API key from https://huggingface.co/settings/tokens');
  }

  // More conversational format - just context and user message
  const fullPrompt = `${contextPrompt}\n\nUser: ${userMessage}\n\nYou:`;

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      inputs: {
        past_user_inputs: [],
        generated_responses: [],
        text: fullPrompt
      }
    });

    const options = {
      hostname: 'api-inference.huggingface.co',
      path: '/models/microsoft/DialoGPT-large',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Hugging Face API error (${res.statusCode}): ${responseData}`));
          return;
        }

        try {
          const jsonData = JSON.parse(responseData);
          const response = jsonData.generated_text || 'Sorry, I could not generate a response.';
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse Hugging Face response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Hugging Face API request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

module.exports = router;

