# Railway Deployment Guide

## Current Issues & Solutions

### Issue 1: Railway URL Not Visible

**Solution:**
1. Go to your Railway project dashboard
2. Click on your deployed service
3. Look for the "Domains" tab or "Settings" tab
4. The URL should be listed there (usually something like `https://your-project-name-production.up.railway.app`)

If you still don't see the URL:
1. Check the "Deployments" tab
2. Look at the latest deployment logs
3. The URL is usually shown in the deployment output

### Issue 2: Email Service Not Working

**Root Cause:** Missing environment variables in Railway

**Solution:**

#### Step 1: Set Up Resend Email Service
1. Go to [resend.com](https://resend.com)
2. Create a free account
3. Get your API key from the dashboard
4. Verify your email domain or use the test domain

#### Step 2: Add Environment Variables to Railway
1. Go to your Railway project
2. Click on your service
3. Go to the "Variables" tab
4. Add these environment variables:

```
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=your_verified_email@yourdomain.com
PORT=3000
NODE_ENV=production
```

#### Step 3: Redeploy
1. After adding the environment variables, Railway will automatically redeploy
2. Check the deployment logs for any errors

### Issue 3: Testing the Email Functionality

Once deployed with environment variables:

1. **Test the API endpoint:**
   ```bash
   curl -X POST https://your-railway-url/api/send-email \
     -H "Content-Type: application/json" \
     -d '{
       "to": "test@example.com",
       "subject": "Test Email",
       "html": "<h1>Test</h1>",
       "pdfBase64": "base64_encoded_pdf_content",
       "pdfFilename": "test.pdf"
     }'
   ```

2. **Check Railway logs:**
   - Go to your Railway service
   - Click on "Deployments"
   - View the latest deployment logs
   - Look for any error messages

## Railway-Specific Configuration

### Build Command
Railway should automatically detect this is a Node.js project, but if needed:
- Build Command: `npm install`
- Start Command: `npm start`

### Environment Variables Summary
```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=your_verified_email@yourdomain.com
PORT=3000
NODE_ENV=production
```

### Troubleshooting

#### If deployment fails:
1. Check Railway logs for errors
2. Ensure all environment variables are set
3. Verify the Resend API key is valid
4. Make sure the from email is verified in Resend

#### If email still doesn't work:
1. Check Railway logs for detailed error messages
2. Test the API endpoint directly
3. Verify Resend account status and limits
4. Check if the email domain is properly verified

## Next Steps

1. **Set up environment variables in Railway**
2. **Redeploy the application**
3. **Test email functionality**
4. **Update your frontend to use the Railway backend URL**

## Frontend Configuration

Once you have the Railway URL, update your frontend to point to it:

```javascript
// In your frontend code, update the API base URL
const API_BASE_URL = 'https://your-railway-url';
```

This will ensure your frontend communicates with the Railway backend for email functionality.
