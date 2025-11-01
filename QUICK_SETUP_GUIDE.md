# Quick Razorpay Setup Guide

## ✅ Integration Status

Your upgrade buttons are **already fully integrated** with Razorpay! The code handles:
- ✅ Payment order creation
- ✅ Razorpay checkout modal
- ✅ Payment verification
- ✅ Subscription activation
- ✅ Error handling

## 🚀 Quick Setup Steps

### 1. Get Razorpay Keys (5 minutes)

1. Sign up at https://razorpay.com
2. Go to **Settings → API Keys**
3. Generate **Test Keys** (for testing)
4. Copy your **Key ID** and **Key Secret**

### 2. Add Keys Locally (2 minutes)

Edit `server/.env`:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_test_secret_key_here
```

### 3. Add Keys on Render (2 minutes)

1. Go to Render Dashboard → Your Web Service → Environment
2. Add variable: `RAZORPAY_KEY_ID` = your key ID
3. Add variable: `RAZORPAY_KEY_SECRET` = your key secret (mark as sensitive)
4. Save (auto-deploys)

### 4. Test Payment (1 minute)

1. Open Dashboard
2. Click **"Upgrade to Premium"** or **"Upgrade to Pro"**
3. Razorpay modal opens
4. Use test card:
   - Card: `4111 1111 1111 1111`
   - CVV: `123`
   - Expiry: Any future date
   - OTP: `123456`

## 📍 Where Upgrade Buttons Are Located

**Location**: Dashboard page (`/dashboard`)

**Button States**:
- **"Free Plan"** - Basic plan (no payment)
- **"Upgrade to Premium"** - ₹99/month
- **"Upgrade to Pro"** - ₹299/month
- **"Current Plan"** - Already on that plan
- **"Active Plan"** - Subscription active

## 🔧 Files Involved

1. **Frontend**: `client/src/pages/Dashboard.js`
   - Contains upgrade buttons
   - Handles payment flow

2. **Backend**: `server/routes/payment.js`
   - Creates payment orders
   - Verifies payments
   - Updates subscriptions

3. **Service**: `client/src/services/paymentService.js`
   - API communication functions

## 🧪 Testing Checklist

- [ ] Environment variables set
- [ ] Server restarted (after adding keys)
- [ ] Dashboard loads correctly
- [ ] Upgrade buttons visible
- [ ] Clicking "Upgrade" opens Razorpay modal
- [ ] Test payment completes successfully
- [ ] Subscription status updates after payment

## ⚠️ Important Notes

1. **Test Mode**: Use test keys for development/testing
2. **Production**: Switch to live keys after KYC verification
3. **Never commit** `.env` file to Git
4. **Never expose** Key Secret in frontend code
5. The server starts even without keys (payment disabled)

## 🆘 If Something Doesn't Work

1. **Check Environment Variables**:
   ```bash
   # On server, verify keys are loaded
   echo $RAZORPAY_KEY_ID
   ```

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for errors when clicking upgrade button

3. **Check Server Logs**:
   - Look for payment-related errors
   - Verify Razorpay is initialized

4. **Verify Keys Match**:
   - Test Key ID with Test Key Secret
   - Live Key ID with Live Key Secret
   - Don't mix test and live keys!

---

**That's it!** Once you add your Razorpay keys, everything will work automatically. 🎉

