# Email Setup Guide

## Prerequisites

To enable email functionality in your application, you need to set up Resend (email service provider).

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your domain or use the provided test domain

### 2. Get Your API Key

1. In your Resend dashboard, go to the API Keys section
2. Create a new API key
3. Copy the API key (it starts with `re_`)

### 3. Set Up Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Email Configuration (Resend)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=your_verified_email@yourdomain.com

# Server Configuration
PORT=3000
```

### 4. Verify Your Email Domain

- If using a custom domain, add it to your Resend account
- If using the test domain, verify your email address in Resend

### 5. Test the Setup

1. Start your server: `npm start`
2. Try sending a receipt or invoice via email
3. Check the console for any error messages

## Troubleshooting

### Common Issues

1. **"Email service not configured" error**
   - Make sure you have created the `.env` file
   - Verify that `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set correctly

2. **"Failed to send email" error**
   - Check that your email domain is verified in Resend
   - Ensure your API key is valid
   - Check the server console for detailed error messages

3. **"Unexpected token '<'" error**
   - This usually means the API endpoint is returning HTML instead of JSON
   - Check that your server is running on port 3000
   - Verify the proxy configuration in `vite.config.ts`

### Development vs Production

- For development: Use the test domain provided by Resend
- For production: Use your own verified domain

## Alternative Email Providers

If you prefer to use a different email service:

1. Update the `sendEmailWithPDF` function in `src/lib/resendEmail.ts`
2. Replace the Resend SDK with your preferred email service SDK
3. Update the environment variable names accordingly

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Use different API keys for development and production
- Regularly rotate your API keys 