# Razorpay Payment Integration Setup Guide

This guide will help you set up Razorpay payment gateway for your expense tracker application.

## Step 1: Create Razorpay Account

1. Go to [https://razorpay.com](https://razorpay.com)
2. Click **"Sign Up"** or **"Get Started"**
3. Fill in your business details:
   - Business name
   - Email address
   - Password
   - Phone number
   - Business type
4. Verify your email address
5. Complete KYC (Know Your Customer) verification (may take 24-48 hours)

## Step 2: Get Your API Keys

### ⚠️ Important: Account Approval Required

Before you can generate API keys, Razorpay requires account approval. Here's what to do:

### Option 1: Complete KYC Verification (Recommended for Production)

1. **Go to Razorpay Dashboard** → **Account & Settings** → **Account Details**
2. **Complete KYC (Know Your Customer) Verification**:
   - Provide business details
   - Upload required documents:
     - Business registration certificate
     - Bank account details
     - PAN card
     - Address proof
   - Submit for verification
3. **Wait for Approval** (typically 24-48 hours)
4. Once approved, go to **Settings** → **API Keys**
5. Click **"Generate Test Key"** for testing
6. Click **"Generate Live Key"** for production

### Option 2: Use Test Mode (If Available)

Some Razorpay accounts allow test mode without full approval:

1. Check if there's a **"Test Mode"** toggle in your dashboard
2. Enable test mode
3. Try generating test keys again
4. If still restricted, proceed with Option 1

### Option 3: Contact Razorpay Support (For Quick Approval)

1. Email: **support@razorpay.com**
2. Subject: "Request for API Key Access"
3. Mention:
   - Your business use case (expense tracker app)
   - You need test keys for development
   - Request expedited approval

### After Approval:

1. Go to **Settings** → **API Keys**
2. Click **"Generate Test Key"** (for testing)
3. You'll see:
   - **Key ID** (starts with `rzp_test_...`)
   - **Key Secret** (starts with `rzp_test_...`)
4. Copy both keys - you'll need them in the next steps

### For Production:

1. After KYC verification is complete
2. Go to **Settings** → **API Keys**
3. Click **"Generate Live Key"**
4. You'll get:
   - **Key ID** (starts with `rzp_live_...`)
   - **Key Secret** (starts with `rzp_live_...`)
5. **⚠️ Important**: Never share your Key Secret publicly

## Step 3: Configure Environment Variables Locally

1. Navigate to your `server` directory
2. Copy the example environment file (if you haven't already):
   ```bash
   cp env.example .env
   ```
3. Open the `.env` file and add your Razorpay keys:
   ```env
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=your_secret_key_here
   ```
4. Replace the values with your actual test keys from Step 2

## Step 4: Configure Environment Variables on Render (Production)

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Select your **Web Service** (backend)
3. Go to **Environment** tab
4. Click **"Add Environment Variable"**
5. Add the following variables:

   **Variable 1:**
   - **Key**: `RAZORPAY_KEY_ID`
   - **Value**: Your Razorpay Key ID (use `rzp_live_...` for production)

   **Variable 2:**
   - **Key**: `RAZORPAY_KEY_SECRET`
   - **Value**: Your Razorpay Key Secret (use live secret for production)
   - **⚠️ Make sure to mark this as "Sensitive"**

6. Click **"Save Changes"**
7. Your service will automatically redeploy

## Step 5: Configure Webhook (Optional but Recommended)

Webhooks allow Razorpay to notify your server about payment status changes.

1. In Razorpay Dashboard, go to **Settings** → **Webhooks**
2. Click **"Add New Webhook"**
3. Enter your webhook URL:
   - For local testing: `http://localhost:5000/api/payment/webhook`
   - For production: `https://your-domain.com/api/payment/webhook`
4. Select events to listen to:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
5. Save the webhook

## Step 6: Test the Integration

### Local Testing:

1. Make sure your local `.env` file has test keys
2. Start your server:
   ```bash
   cd server
   npm start
   ```
3. Start your frontend:
   ```bash
   cd client
   npm start
   ```
4. Log in to your application
5. Navigate to the Dashboard
6. Try clicking an "Upgrade" button on any subscription plan
7. You should see the Razorpay checkout modal
8. Use Razorpay test cards:
   - **Card Number**: `4111 1111 1111 1111`
   - **CVV**: Any 3 digits (e.g., `123`)
   - **Expiry**: Any future date (e.g., `12/25`)
   - **Name**: Any name
   - **OTP**: Enter `123456` for Razorpay test mode

### Test Cards for Different Scenarios:

- **Successful Payment**: `4111 1111 1111 1111`
- **Payment Failure**: `4012 8888 8888 1881`
- **3D Secure**: Any card will prompt for OTP in test mode

## Step 7: Verify Upgrade Button Integration

The upgrade buttons are already integrated in `client/src/pages/Dashboard.js`. They:

1. Show different states:
   - "Free Plan" for Basic plan
   - "Upgrade to Premium" for Premium plan
   - "Upgrade to Pro" for Pro plan
   - "Current Plan" if user already has that plan
   - "Active Plan" if user has an active subscription

2. When clicked, they:
   - Create a Razorpay order
   - Open Razorpay checkout modal
   - Handle payment verification
   - Update user's subscription status

3. Display payment processing status

## Step 8: Switch to Production Keys

When you're ready to go live:

1. **⚠️ Important**: Only switch after completing KYC verification
2. Generate live keys in Razorpay Dashboard
3. Update environment variables on Render:
   - Replace `RAZORPAY_KEY_ID` with live key ID
   - Replace `RAZORPAY_KEY_SECRET` with live key secret
4. Update webhook URL to your production domain
5. Test with real small amounts first

## Troubleshooting

### Issue: "Payment service is not configured"

**Solution**: 
- Check if environment variables are set correctly
- Restart your server after adding environment variables
- On Render, make sure variables are saved and service is redeployed

### Issue: "Invalid payment signature"

**Solution**:
- Verify `RAZORPAY_KEY_SECRET` is correct
- Ensure you're using matching test/live keys (don't mix test Key ID with live Secret)

### Issue: Checkout modal doesn't open

**Solution**:
- Check browser console for errors
- Verify Razorpay script is loaded: `https://checkout.razorpay.com/v1/checkout.js`
- Check if `RAZORPAY_KEY_ID` is being sent from backend correctly

### Issue: Payment succeeds but subscription not updated

**Solution**:
- Check server logs for payment verification errors
- Verify database connection
- Check if Subscription model is working correctly

## Security Best Practices

1. ✅ **Never commit** `.env` file to Git
2. ✅ **Never expose** Key Secret in frontend code
3. ✅ **Always verify** payment signatures on backend
4. ✅ **Use HTTPS** in production
5. ✅ **Implement webhooks** for payment status updates
6. ✅ **Log all** payment attempts for audit trail

## Current Plan Prices

- **Basic**: Free
- **Premium**: ₹99/month
- **Pro**: ₹299/month

These are configured in `server/routes/payment.js` and can be changed if needed.

## Support

- Razorpay Documentation: https://razorpay.com/docs/
- Razorpay Support: support@razorpay.com
- Test Mode Guide: https://razorpay.com/docs/payments/test-card-details/

---

**Note**: The integration is already complete in your codebase. You just need to add your Razorpay API keys to start accepting payments!

