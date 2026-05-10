# Razorpay Payment Debugging Guide

## Issue
Razorpay test payments work on localhost but fail on Netlify deployment.

## Confirmed Working
- ✅ Environment variables set on Netlify
- ✅ VITE_RAZORPAY_KEY_ID embedded in build
- ✅ API endpoint accessible (health check returns 200)

## Potential Issues to Check

### 1. Check Browser Console on Production
Open https://dietbyrd.buildc3.tech and try to make a payment. Check the browser console for errors:
- Look for Razorpay script loading errors
- Check for API call failures
- Look for CORS errors

### 2. Test the API Endpoint Directly
```bash
# Test creating a payment order on production
curl -X POST https://dietbyrd.buildc3.tech/api/payments/create-order \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,"package_id":1,"amount":149900}'
```

### 3. Common Issues and Solutions

#### Issue A: Razorpay Script Blocked by HTTPS
**Problem**: Razorpay might not load on some browsers if there's a mixed content warning
**Solution**: Ensure all resources load over HTTPS

#### Issue B: API Returns 404/500
**Check**: Navigate to Network tab during payment and see if API call fails
**Solution**: Check Netlify function logs

#### Issue C: Environment Variable Not Available at Build Time
**Check**: Run `netlify build` locally to see if VITE_ vars are included
**Solution**: Rebuild the site on Netlify dashboard

### 4. Check Netlify Function Logs
```bash
# View recent function invocations
netlify api listSiteFunctions --site-id=cb1161b2-2345-4857-b965-4ce30f27a47b
```

### 5. Test with Netlify Dev (Recommended)
```bash
# Run the app with Netlify's local environment
cd /Users/pikachu/Desktop/J/Create/dietbyrd/dietbyrd
netlify dev
```
This simulates the Netlify environment locally and can help identify issues.

## Quick Fix: Force Rebuild
Sometimes Netlify's cache can cause issues:

```bash
# Trigger a clean rebuild
netlify build --clear-cache
netlify deploy --prod --build
```

## Debug Info to Add
Add this console.log to PatientDashboard.tsx around line 312:

```javascript
console.log('Razorpay Config:', {
  key: (import.meta as any).env.VITE_RAZORPAY_KEY_ID,
  amount: order.amount,
  order_id: order.razorpay_order_id,
  environment: import.meta.env.MODE
});
```

This will help see what values are being used in production.
