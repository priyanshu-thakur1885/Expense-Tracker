const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Budget = require('../models/Budget');
const Expense = require('../models/Expense');
const https = require('https');

const router = express.Router();

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

    // Get user context
    const userContext = await getUserContext(req.user._id);
    
    if (!userContext) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error fetching user data' 
      });
    }

    // Prepare context for AI
    const contextPrompt = `You are a helpful AI assistant for an expense tracking app. The user's profile information:

User Profile:
- Name: ${userContext.user.name}
- Currency: ${userContext.user.currency}

Budget Information:
${userContext.budget ? `
- Monthly Budget: ${userContext.user.currency} ${userContext.budget.monthlyLimit}
- Current Spent: ${userContext.user.currency} ${userContext.budget.currentSpent}
- Remaining Budget: ${userContext.user.currency} ${userContext.budget.remainingBudget}
- Spending Percentage: ${userContext.budget.spendingPercentage.toFixed(1)}%
- Budget Status: ${userContext.budget.status}
` : 'No budget set yet.'}

Expense Statistics:
- Total Expenses: ${userContext.expenses.total}
- Total Spent: ${userContext.user.currency} ${userContext.expenses.totalSpent}
- Category Breakdown: ${JSON.stringify(userContext.expenses.categoryBreakdown)}

Recent Expenses:
${userContext.expenses.recent.length > 0 
  ? userContext.expenses.recent.map(exp => 
      `- ${exp.item} (${exp.category}) at ${exp.foodCourt}: ${userContext.user.currency} ${exp.amount} on ${new Date(exp.date).toLocaleDateString()}`
    ).join('\n')
  : 'No recent expenses.'}

Answer the user's question based on their profile and expense data. Be friendly, helpful, and provide specific insights based on their actual data. Keep responses concise and actionable.`;

    // Call AI API (Google Gemini, Groq, or Hugging Face)
    const aiResponse = await callAIAPI(message, contextPrompt);

    res.json({
      success: true,
      response: aiResponse
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing AI request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// AI API call function - supports multiple free APIs
async function callAIAPI(userMessage, contextPrompt) {
  const aiProvider = process.env.AI_PROVIDER || 'gemini'; // gemini, groq, or huggingface

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

  const fullPrompt = `${contextPrompt}\n\nUser Question: ${userMessage}\n\nAssistant Response:`;

  // Use Node's https module for compatibility
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
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
          reject(new Error(`Gemini API error (${res.statusCode}): ${responseData}`));
          return;
        }

        try {
          const jsonData = JSON.parse(responseData);
          const response = jsonData.candidates[0]?.content?.parts[0]?.text || 'Sorry, I could not generate a response.';
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse Gemini response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Gemini API request failed: ${error.message}`));
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

  const fullPrompt = `${contextPrompt}\n\nUser Question: ${userMessage}\n\nAssistant Response:`;

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

