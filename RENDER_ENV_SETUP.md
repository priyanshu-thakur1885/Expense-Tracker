# Adding Environment Variables on Render

This guide shows you how to add the AI Assistant API keys to your Render deployment.

## Steps to Add Environment Variables on Render

### 1. Go to Your Render Dashboard
- Visit https://dashboard.render.com
- Log in to your account

### 2. Select Your Service
- Click on your **Web Service** (the one running your Node.js server)
- This should be your backend/server service

### 3. Navigate to Environment Tab
- In the left sidebar, click on **"Environment"**
- Or scroll down to the **"Environment Variables"** section

### 4. Add AI Assistant Variables

Click **"Add Environment Variable"** and add these variables:

#### Required Variables:

1. **AI Provider** (choose one):
   ```
   Key: AI_PROVIDER
   Value: gemini
   ```
   (Options: `gemini`, `groq`, or `huggingface`)

2. **API Key** (based on your chosen provider):

   **For Google Gemini** (Recommended):
   ```
   Key: GEMINI_API_KEY
   Value: your_actual_gemini_api_key_here
   ```
   Get your key from: https://makersuite.google.com/app/apikey

   **OR For Groq**:
   ```
   Key: GROQ_API_KEY
   Value: your_actual_groq_api_key_here
   ```
   Get your key from: https://console.groq.com/

   **OR For Hugging Face**:
   ```
   Key: HUGGINGFACE_API_KEY
   Value: your_actual_huggingface_api_key_here
   ```
   Get your key from: https://huggingface.co/settings/tokens

### 5. Save and Redeploy
- Click **"Save Changes"** at the bottom
- Render will automatically trigger a new deployment
- Wait for the deployment to complete (usually 1-2 minutes)

### 6. Verify It's Working
- Once deployed, test the AI Assistant by clicking the chat button
- If you see an error, check the Render logs for any issues

## Important Notes

✅ **DO:**
- Add the actual API key values (not placeholders)
- Make sure there are no extra spaces in the key or value
- Use the same provider for both `AI_PROVIDER` and the corresponding API key

❌ **DON'T:**
- Don't commit your `.env` file to Git (it's already in `.gitignore`)
- Don't share your API keys publicly
- Don't add the keys to `env.example` (that's just a template)

## Example Configuration

If you're using Google Gemini, your Render environment variables should look like:

```
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyC...your_actual_key_here
```

## Troubleshooting

### "AI service is not configured" error
- Make sure you added both `AI_PROVIDER` and the corresponding API key
- Verify the API key is correct (no typos)
- Check that you saved the changes and the service redeployed

### Check Render Logs
- Go to your service → **"Logs"** tab
- Look for any error messages related to AI or API keys
- Common issues: missing keys, invalid keys, or network errors

### Test Locally First
- Before deploying to Render, test with a local `.env` file
- Make sure it works locally, then add the same keys to Render

## Security Best Practices

1. **Never commit API keys** to Git (already handled by `.gitignore`)
2. **Use different keys** for development and production if possible
3. **Rotate keys** if you suspect they've been compromised
4. **Monitor usage** on the AI provider's dashboard to detect unusual activity

## Need Help?

If you're still having issues:
1. Check the Render deployment logs
2. Verify your API key is valid on the provider's website
3. Make sure the service has been redeployed after adding variables
4. Check `AI_ASSISTANT_SETUP.md` for more detailed setup instructions

