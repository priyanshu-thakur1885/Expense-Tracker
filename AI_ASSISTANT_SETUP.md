# AI Assistant Setup Guide

This guide will help you set up the AI Assistant feature using free AI APIs.

## Overview

The AI Assistant uses your expense data (profile, budget, and expenses) to provide personalized insights and answer questions about your spending patterns.

## Free AI Provider Options

### 1. Groq API (Recommended) ⭐
- **Free Tier**: 14,400 requests per day (much better than Gemini!)
- **Speed**: Extremely fast (uses optimized models)
- **Quality**: Excellent
- **Setup**: Easy

**Steps to get API key:**
1. Visit https://console.groq.com/
2. Sign up for a free account
3. Go to API Keys section
4. Create a new API key
5. Add to your `.env` file as `GROQ_API_KEY`
6. Set `AI_PROVIDER=groq` in your `.env` file

### 2. Google Gemini
- **Free Tier**: 20 requests per day (very limited!)
- **Speed**: Fast
- **Quality**: Excellent
- **Setup**: Easiest

**Steps to get API key:**
1. Visit https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key
5. Add to your `.env` file as `GEMINI_API_KEY`

### 3. Hugging Face Inference API

### 3. Hugging Face Inference API
- **Free Tier**: Limited but free
- **Speed**: Moderate
- **Quality**: Good
- **Setup**: Moderate

**Steps to get API key:**
1. Visit https://huggingface.co/settings/tokens
2. Sign up for a free account
3. Create a new token with "Read" permissions
4. Add to your `.env` file as `HUGGINGFACE_API_KEY`

## Configuration

1. **Choose your AI provider** by setting `AI_PROVIDER` in your `.env` file:
   ```env
   AI_PROVIDER=gemini  # or 'groq' or 'huggingface'
   ```

2. **Add the corresponding API key**:
   ```env
   # For Gemini (recommended)
   GEMINI_API_KEY=your_api_key_here
   
   # OR for Groq
   GROQ_API_KEY=your_api_key_here
   
   # OR for Hugging Face
   HUGGINGFACE_API_KEY=your_api_key_here
   ```

3. **Restart your server** after adding the environment variables.

## Features

The AI Assistant can help with:
- ✅ Analyzing spending patterns
- ✅ Budget recommendations based on your data
- ✅ Expense insights and trends
- ✅ Answering questions about your expenses
- ✅ Category-wise spending analysis
- ✅ Budget status and recommendations

## Example Questions

Users can ask questions like:
- "How much did I spend on food this month?"
- "What's my budget status?"
- "Which category do I spend the most on?"
- "Give me tips to save money"
- "What are my recent expenses?"

## Troubleshooting

### Error: "AI service is not configured"
- Make sure you've added the API key to your `.env` file
- Verify the API key is correct (no extra spaces)
- Restart your server after adding the key

### Error: "AI service is temporarily unavailable"
- Check your internet connection
- Verify your API key is valid
- Check if you've exceeded the free tier limits
- Try switching to a different AI provider

### Slow responses
- Groq is typically the fastest option
- Gemini is also quite fast
- Hugging Face may be slower depending on model load

## Switching Between Providers

You can easily switch between providers by:
1. Changing `AI_PROVIDER` in `.env`
2. Adding the corresponding API key
3. Restarting the server

No code changes needed!

## Security Notes

- Never commit your API keys to version control
- Keep your `.env` file in `.gitignore`
- API keys are only used server-side, never exposed to clients
- Each user's data is isolated and only accessible to them

## Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Verify your API key is valid
3. Try a different AI provider
4. Check the provider's status page for outages

