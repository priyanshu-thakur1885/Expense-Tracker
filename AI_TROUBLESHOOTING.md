# AI Assistant Troubleshooting Guide

## Error: "AI service is temporarily unavailable"

If you're seeing this error, follow these steps:

### Step 1: Verify Environment Variables in Render

1. Go to your Render dashboard
2. Click on your **Web Service** (backend server)
3. Go to **Environment** tab
4. Verify these variables exist:
   - `AI_PROVIDER` = `gemini`
   - `GEMINI_API_KEY` = `AIzaSyAJmN61cinlR6HweWTxsKiRJveVN2G4WBk`

**Common Issues:**
- ❌ Variable name has typos (should be exactly `GEMINI_API_KEY`)
- ❌ Extra spaces before/after the value
- ❌ Missing `AI_PROVIDER` variable
- ❌ API key not saved (forgot to click "Save Changes")

### Step 2: Check Render Logs

1. In Render dashboard, go to your service
2. Click on **"Logs"** tab
3. Look for error messages that start with:
   - `❌ AI chat error:`
   - `❌ Gemini API error:`
   - `GEMINI_API_KEY not configured`

**What to look for:**
- If you see `GEMINI_API_KEY not configured` → API key is missing
- If you see `Gemini API error (400)` → Invalid API key
- If you see `Gemini API error (403)` → API key doesn't have permissions
- If you see `Gemini API error (429)` → Rate limit exceeded (wait a minute)

### Step 3: Verify API Key is Valid

1. Go to https://aistudio.google.com/app/apikey
2. Make sure your API key is active
3. Check if there are any restrictions on the key
4. Try creating a new key if needed

### Step 4: Redeploy Service

After adding/changing environment variables:

1. Go to your service in Render
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Wait for deployment to complete (1-2 minutes)
4. Try the AI Assistant again

### Step 5: Test API Key Directly

You can test if your API key works by making a direct API call:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Hello, say hi back"
      }]
    }]
  }'
```

Replace `YOUR_API_KEY` with your actual key.

### Common Error Messages and Solutions

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `GEMINI_API_KEY not configured` | API key missing | Add `GEMINI_API_KEY` in Render environment variables |
| `Gemini API error (400)` | Invalid request format | Check API endpoint (should be fixed in latest code) |
| `Gemini API error (403)` | Invalid API key | Verify API key is correct and active |
| `Gemini API error (429)` | Rate limit exceeded | Wait 1 minute and try again |
| `timeout` | Request took too long | Check internet connection, try again |
| `Failed to parse Gemini response` | Unexpected API response | Check Render logs for full error |

### Quick Checklist

- [ ] `AI_PROVIDER` is set to `gemini` in Render
- [ ] `GEMINI_API_KEY` is set with your actual API key in Render
- [ ] No extra spaces in variable names or values
- [ ] Service has been redeployed after adding variables
- [ ] API key is valid and active at aistudio.google.com
- [ ] Checked Render logs for specific error messages
- [ ] Tried waiting 1 minute (in case of rate limiting)

### Still Not Working?

1. **Check Render Logs** - This is the most important step!
   - Look for the exact error message
   - Copy the full error and check what it says

2. **Verify API Key Format**
   - Should start with `AIzaSy`
   - Should be about 39 characters long
   - No spaces or line breaks

3. **Test with a Simple Request**
   - Use the curl command above to test directly
   - If that works, the issue is in the server code
   - If that fails, the issue is with the API key

4. **Check Service Status**
   - Make sure your Render service is running (not sleeping)
   - Check if there are any deployment errors

### Need More Help?

If you've tried all the above:
1. Share the exact error message from Render logs
2. Confirm your API key format (first 10 and last 4 characters)
3. Check if the service is running and not sleeping

