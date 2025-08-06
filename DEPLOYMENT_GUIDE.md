# Multi-App Deployment Guide

## Overview

This guide covers deploying the PayFlow ecosystem with three interconnected applications sharing a single Firebase backend.

## Prerequisites

1. **Firebase CLI**: `npm install -g firebase-tools`
2. **Node.js**: Version 18 or higher
3. **Domain**: Main domain for PayFlow (e.g., payflow.sz)
4. **Subdomains**: For InvoiceFlow and StockFlow

## Firebase Project Setup

### 1. Create Firebase Project
```bash
firebase login
firebase projects:create payflow-production
firebase use payflow-production
```

### 2. Enable Required Services
```bash
# Enable Authentication
firebase auth:enable

# Enable Firestore
firebase firestore:create

# Enable Functions
firebase functions:create
```

### 3. Configure Authentication
- Go to Firebase Console > Authentication
- Enable Email/Password provider
- Add authorized domains:
  - payflow.sz
  - invoices.payflow.sz
  - stock.payflow.sz

## Database Setup

### 1. Deploy Security Rules
```bash
firebase deploy --only firestore:rules
```

### 2. Create Indexes
```bash
firebase deploy --only firestore:indexes
```

### 3. Initialize Demo Data (Optional)
```bash
node scripts/initializeData.js
```

## Application Deployment

### 1. PayFlow (Main App) - Expo/React Native
```bash
cd payflow

# Build for web
npm run build:web

# Deploy to Firebase Hosting
firebase deploy --only hosting:payflow

# Build mobile apps
expo build:android
expo build:ios
```

### 2. InvoiceFlow - React Web App
```bash
cd invoiceflow

# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting:invoiceflow
```

### 3. StockFlow - React Web App with Capacitor
```bash
cd stockflow

# Build for web
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting:stockflow

# Build mobile apps (optional)
npx cap build android
npx cap build ios
```

### 4. Shared Functions
```bash
cd functions

# Install dependencies
npm install

# Deploy functions
firebase deploy --only functions
```

## Domain Configuration

### 1. Firebase Hosting Configuration
```json
{
  "hosting": [
    {
      "target": "payflow",
      "public": "payflow/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "invoiceflow", 
      "public": "invoiceflow/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    },
    {
      "target": "stockflow",
      "public": "stockflow/dist", 
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

### 2. Set Up Hosting Targets
```bash
firebase target:apply hosting payflow payflow-production
firebase target:apply hosting invoiceflow invoiceflow-production  
firebase target:apply hosting stockflow stockflow-production
```

### 3. Configure Custom Domains
```bash
# Add custom domains in Firebase Console
# payflow.sz -> payflow target
# invoices.payflow.sz -> invoiceflow target
# stock.payflow.sz -> stockflow target
```

## Environment Variables

### 1. Shared Environment (.env.shared)
```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=payflow-production.firebaseapp.com
FIREBASE_PROJECT_ID=payflow-production
FIREBASE_STORAGE_BUCKET=payflow-production.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# App URLs
PAYFLOW_BASE_URL=https://payflow.sz
INVOICEFLOW_BASE_URL=https://invoices.payflow.sz
STOCKFLOW_BASE_URL=https://stock.payflow.sz

# MTN MoMo Configuration
MOMO_SUBSCRIPTION_KEY=your_momo_key
MOMO_API_USER_ID=your_momo_user_id
MOMO_API_KEY=your_momo_api_key
MOMO_CALLBACK_URL=https://payflow.sz/api/momo/callback

# Banking Configuration
BANK_WEBHOOK_SECRET=your_bank_webhook_secret
```

### 2. App-Specific Environment Variables

**PayFlow (.env)**
```env
EXPO_PUBLIC_APP_NAME=PayFlow
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_SUPPORT_EMAIL=support@payflow.sz
EXPO_PUBLIC_SUPPORT_PHONE=+268 2404 2000
```

**InvoiceFlow (.env)**
```env
VITE_APP_NAME=InvoiceFlow
VITE_PAYFLOW_INTEGRATION=true
VITE_PDF_GENERATION=true
```

**StockFlow (.env)**
```env
VITE_APP_NAME=StockFlow
VITE_PAYFLOW_INTEGRATION=true
VITE_BARCODE_SCANNING=true
```

## Security Configuration

### 1. Firebase Functions Environment
```bash
firebase functions:config:set \
  momo.subscription_key="your_key" \
  momo.api_user_id="your_user_id" \
  momo.api_key="your_api_key" \
  bank.webhook_secret="your_secret"
```

### 2. CORS Configuration
```typescript
// functions/src/cors.ts
export const corsOptions = {
  origin: [
    'https://payflow.sz',
    'https://invoices.payflow.sz', 
    'https://stock.payflow.sz',
    'http://localhost:3000', // Development
    'http://localhost:3001',
    'http://localhost:3002'
  ],
  credentials: true
};
```

## Testing Strategy

### 1. Integration Tests
```bash
# Test cross-app payment flows
npm run test:integration

# Test individual app functionality
npm run test:payflow
npm run test:invoiceflow
npm run test:stockflow
```

### 2. End-to-End Testing
```bash
# Test complete user journeys
npm run test:e2e
```

### 3. Load Testing
```bash
# Test payment processing under load
npm run test:load
```

## Monitoring and Analytics

### 1. Firebase Analytics
- Enable Analytics in Firebase Console
- Configure custom events for each app
- Set up conversion tracking

### 2. Error Monitoring
```bash
# Install Sentry for error tracking
npm install @sentry/react-native @sentry/react
```

### 3. Performance Monitoring
- Enable Firebase Performance Monitoring
- Monitor function execution times
- Track database query performance

## Backup and Recovery

### 1. Automated Backups
```bash
# Set up automated Firestore backups
gcloud firestore export gs://payflow-backups/$(date +%Y%m%d)
```

### 2. Data Export Scripts
```typescript
// scripts/exportData.ts
export async function exportAllData() {
  const collections = ['users', 'companies', 'transactions', 'invoices', 'products', 'orders'];
  
  for (const collectionName of collections) {
    const snapshot = await db.collection(collectionName).get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    fs.writeFileSync(
      `backups/${collectionName}-${new Date().toISOString()}.json`,
      JSON.stringify(data, null, 2)
    );
  }
}
```

## Production Checklist

### Pre-Deployment
- [ ] Firebase project configured
- [ ] Security rules tested
- [ ] Environment variables set
- [ ] Domain DNS configured
- [ ] SSL certificates ready

### Deployment
- [ ] Shared functions deployed
- [ ] PayFlow app deployed
- [ ] InvoiceFlow app deployed  
- [ ] StockFlow app deployed
- [ ] Database rules deployed
- [ ] Indexes created

### Post-Deployment
- [ ] Cross-app payment flows tested
- [ ] User registration/login tested
- [ ] Invoice payment integration tested
- [ ] Order payment integration tested
- [ ] Mobile apps tested
- [ ] Performance monitoring enabled
- [ ] Error tracking configured

### Go-Live
- [ ] Demo accounts created
- [ ] User documentation ready
- [ ] Support team trained
- [ ] Monitoring dashboards active
- [ ] Backup systems running

## Maintenance

### Regular Tasks
1. **Weekly**: Review error logs and performance metrics
2. **Monthly**: Update dependencies and security patches
3. **Quarterly**: Review and optimize database queries
4. **Annually**: Security audit and penetration testing

### Scaling Considerations
1. **Database**: Monitor Firestore usage and optimize queries
2. **Functions**: Monitor execution times and memory usage
3. **Hosting**: Monitor bandwidth and CDN performance
4. **Authentication**: Monitor user growth and session management

## Support and Documentation

### User Guides
- PayFlow user manual
- InvoiceFlow business guide
- StockFlow inventory guide
- Cross-app integration guide

### Developer Documentation
- API reference
- SDK documentation
- Integration examples
- Troubleshooting guide

### Contact Information
- Technical Support: tech@payflow.sz
- Business Support: support@payflow.sz
- Emergency Contact: +268 2404 2000