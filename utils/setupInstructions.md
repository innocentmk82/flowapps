# PayFlow - Production Setup Guide

## Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it "PayFlow" or your preferred name
4. Enable Google Analytics (optional)

### 2. Enable Authentication
1. In Firebase Console, go to Authentication
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password"
5. Disable "Email link (passwordless sign-in)"

### 3. Create Firestore Database
1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in production mode"
4. Select your preferred location (closest to Eswatini: europe-west1)

### 4. Set up Firebase Functions
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. In your project root: `firebase init functions`
4. Choose TypeScript
5. Install dependencies

### 5. Configure Environment Variables
Create `.env` file in your project root:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# MoMo API Configuration (get from MTN Developer Portal)
EXPO_PUBLIC_MOMO_SUBSCRIPTION_KEY=your_momo_subscription_key
EXPO_PUBLIC_MOMO_API_USER_ID=your_momo_api_user_id
EXPO_PUBLIC_MOMO_API_KEY=your_momo_api_key
EXPO_PUBLIC_MOMO_CALLBACK_URL=https://your-domain.com/momo-callback
```

### 6. Deploy Firestore Rules and Indexes
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 7. Deploy Firebase Functions
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## MTN MoMo Integration

### 1. Register with MTN Developer Portal
1. Go to [MTN Developer Portal](https://momodeveloper.mtn.com/)
2. Create an account
3. Subscribe to Collections API
4. Get your subscription key

### 2. Create API User
1. Use the sandbox environment for testing
2. Create API user and get API key
3. Configure callback URL for payment notifications

### 3. Production Integration
Replace the mock MoMo service in `functions/src/index.ts` with actual MTN MoMo API calls:

```typescript
// Example MTN MoMo API integration
const momoApiCall = async (phoneNumber: string, amount: number) => {
  const response = await fetch(`${MOMO_API_CONFIG.baseUrl}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Reference-Id': transactionRef,
      'X-Target-Environment': 'sandbox', // Change to 'live' for production
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': MOMO_API_CONFIG.subscriptionKey,
    },
    body: JSON.stringify({
      amount: amount.toString(),
      currency: 'SZL',
      externalId: transactionRef,
      payer: {
        partyIdType: 'MSISDN',
        partyId: phoneNumber,
      },
      payerMessage: description,
      payeeNote: `PayFlow wallet top-up`,
    }),
  });
  
  return response.json();
};
```

## Bank Integration Setup

### 1. Standard Bank Eswatini Integration
1. Contact Standard Bank for API access
2. Set up merchant account
3. Configure webhook endpoints for payment notifications

### 2. FNB Eswatini Integration
1. Apply for FNB Connect API access
2. Set up business banking account
3. Configure payment gateway

## Production Deployment

### 1. Build for Production
```bash
# Build web version
npm run build:web

# Build mobile app
expo build:android
expo build:ios
```

### 2. Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

### 3. Configure Custom Domain
1. In Firebase Console, go to Hosting
2. Add custom domain
3. Follow DNS configuration instructions

### 4. Set up SSL Certificate
Firebase Hosting automatically provides SSL certificates for custom domains.

## Security Configuration

### 1. Firestore Security Rules
The rules are already configured in `firestore.rules`. Deploy them:
```bash
firebase deploy --only firestore:rules
```

### 2. Environment Variables for Functions
Set environment variables for Firebase Functions:
```bash
firebase functions:config:set momo.subscription_key="your_key"
firebase functions:config:set momo.api_user_id="your_user_id"
firebase functions:config:set momo.api_key="your_api_key"
firebase functions:config:set bank.webhook_secret="your_webhook_secret"
```

### 3. Enable App Check (Recommended)
1. Go to Firebase Console > App Check
2. Enable for your web and mobile apps
3. Configure reCAPTCHA for web
4. Configure App Attest for iOS and Play Integrity for Android

## Monitoring and Analytics

### 1. Set up Firebase Analytics
Already configured in the app. View analytics in Firebase Console.

### 2. Set up Crashlytics (Mobile)
```bash
expo install expo-firebase-crashlytics
```

### 3. Set up Performance Monitoring
```bash
expo install expo-firebase-performance
```

## Testing

### 1. Test with Demo Accounts
- Client: client@demo.com / demo123
- Merchant: merchant@demo.com / demo123

### 2. Test MoMo Integration
Use MTN MoMo sandbox environment with test phone numbers.

### 3. Test Manual Deposits
Create test references and verify the admin approval flow.

## Go Live Checklist

- [ ] Firebase project configured
- [ ] MTN MoMo API credentials obtained
- [ ] Bank integration completed
- [ ] Security rules deployed
- [ ] Functions deployed and tested
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] App Check enabled
- [ ] Analytics configured
- [ ] Test transactions completed
- [ ] Admin panel tested
- [ ] Mobile apps built and ready for app stores

## Support and Maintenance

### 1. Monitor Function Logs
```bash
firebase functions:log
```

### 2. Monitor Firestore Usage
Check Firebase Console for database usage and billing.

### 3. Regular Security Updates
- Update Firebase SDK regularly
- Review and update security rules
- Monitor for suspicious activity

### 4. Backup Strategy
- Firestore automatically backs up data
- Export important data regularly for additional security

## Compliance and Legal

### 1. Eswatini Financial Regulations
- Register with Central Bank of Eswatini
- Comply with Anti-Money Laundering (AML) regulations
- Implement Know Your Customer (KYC) procedures

### 2. Data Protection
- Comply with Eswatini Data Protection Act
- Implement proper data encryption
- Set up data retention policies

### 3. Payment Service Provider License
- Apply for PSP license if required
- Ensure compliance with payment regulations
- Set up proper financial reporting