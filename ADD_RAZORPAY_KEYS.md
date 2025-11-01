# Add Your Razorpay Keys - Step by Step

## Your Razorpay Test Keys

```
Key ID: rzp_test_RaazbbSiu68KmJ
Key Secret: iBcyzQkAj51Snyu8T2LamalG
```

## ✅ Step 1: Add Keys Locally (Local Development)

1. Navigate to your `server` directory:
   ```bash
   cd server
   ```

2. Create or edit the `.env` file:
   ```bash
   # If .env doesn't exist, copy from example:
   cp env.example .env
   ```

3. Open `.env` file and add your keys:
   ```env
   RAZORPAY_KEY_ID=rzp_test_RaazbbSiu68KmJ
   RAZORPAY_KEY_SECRET=iBcyzQkAj51Snyu8T2LamalG
   ```

4. Make sure these lines are in your `.env` file (update if they already exist)

5. Save the file

6. Restart your server:
   ```bash
   npm start
   ```

## ✅ Step 2: Add Keys on Render (Production)

1. Go to [Render Dashboard](https://dashboard.render.com)

2. Click on your **Web Service** (backend service)

3. Go to **Environment** tab (left sidebar)

4. Click **"Add Environment Variable"**

5. Add the first variable:
   - **Key**: `RAZORPAY_KEY_ID`
   - **Value**: `rzp_test_RaazbbSiu68KmJ`
   - Click **"Save Changes"**

6. Add the second variable:
   - **Key**: `RAZORPAY_KEY_SECRET`
   - **Value**: `iBcyzQkAj51Snyu8T2LamalG`
   - **⚠️ IMPORTANT**: Check the box **"Mark as Sensitive"** (hides value)
   - Click **"Save Changes"**

7. Render will automatically redeploy your service

8. Wait for deployment to complete (usually 2-3 minutes)

## ✅ Step 3: Verify Setup

### Local Verification:
1. Start your server: `cd server && npm start`
2. Look for this message in console:
   - ✅ **Good**: Server starts without errors
   - ❌ **Bad**: If you see "Razorpay keys not configured" warning, keys aren't loaded

### Test Payment Flow:
1. Start your frontend: `cd client && npm start`
2. Log in to your application
3. Go to Dashboard
4. Click **"Upgrade to Premium"** or **"Upgrade to Pro"**
5. Razorpay checkout modal should open
6. Use test card:
   - Card: `4111 1111 1111 1111`
   - CVV: `123`
   - Expiry: Any future date (e.g., `12/25`)
   - Name: Any name
   - OTP: `123456`

## ⚠️ Security Reminders

1. **NEVER commit** `.env` file to Git
2. **NEVER share** your Key Secret publicly
3. **NEVER hardcode** keys in source files
4. Always mark Key Secret as **"Sensitive"** on Render

## 🔍 Troubleshooting

### Issue: Server still shows "keys not configured"
- **Solution**: Make sure `.env` file is in `server/` directory (not root)
- Restart server after adding keys
- Check for typos in variable names

### Issue: Payment modal doesn't open
- **Solution**: Check browser console (F12) for errors
- Verify Razorpay script is loaded
- Check if keys are sent correctly from backend

### Issue: "Invalid payment signature"
- **Solution**: Verify you're using matching test keys
- Don't mix test Key ID with live Key Secret

## ✅ Quick Checklist

- [ ] Added keys to local `server/.env` file
- [ ] Added `RAZORPAY_KEY_ID` on Render
- [ ] Added `RAZORPAY_KEY_SECRET` on Render (marked as sensitive)
- [ ] Restarted local server
- [ ] Render deployment completed
- [ ] Tested payment flow locally
- [ ] Verified upgrade buttons work

---

**Your keys are now configured!** 🎉 Try making a test payment to verify everything works.

