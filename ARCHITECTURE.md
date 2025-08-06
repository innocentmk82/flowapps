# Multi-App Architecture: PayFlow, InvoiceFlow, StockFlow

## Overview

This architecture implements three interconnected applications sharing a single Firebase backend:

- **PayFlow**: Central payment processing app (main)
- **InvoiceFlow**: Invoice management for services
- **StockFlow**: Inventory management and goods sales

## Database Schema

### Core Collections

#### 1. Users Collection (`/users/{userId}`)
```typescript
interface User {
  id: string;
  email: string;
  role: 'admin' | 'general_user';
  profile: {
    firstName: string;
    lastName: string;
    businessName?: string; // For admin users
    phone?: string;
    address?: string;
  };
  walletBalance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // App-specific permissions
  permissions: {
    payflow: boolean;
    invoiceflow: boolean;
    stockflow: boolean;
  };
}
```

#### 2. Companies Collection (`/companies/{companyId}`)
```typescript
interface Company {
  id: string;
  name: string;
  ownerId: string; // Admin user ID
  settings: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    address: string;
    phone: string;
    email: string;
    vatNumber?: string;
  };
  integrations: {
    payflow: { enabled: boolean; merchantId: string };
    invoiceflow: { enabled: boolean };
    stockflow: { enabled: boolean };
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3. Transactions Collection (`/transactions/{transactionId}`)
```typescript
interface Transaction {
  id: string;
  payerId: string;
  receiverId: string;
  companyId?: string;
  amount: number;
  type: 'wallet_topup' | 'invoice_payment' | 'product_purchase' | 'transfer';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  sourceApp: 'payflow' | 'invoiceflow' | 'stockflow';
  metadata: {
    invoiceId?: string;
    productId?: string;
    orderId?: string;
    paymentMethod?: 'wallet' | 'momo' | 'bank_transfer';
    reference?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. Invoices Collection (`/invoices/{invoiceId}`)
```typescript
interface Invoice {
  id: string;
  companyId: string;
  clientId?: string;
  clientEmail: string;
  invoiceNumber: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidAt?: Date;
  paymentTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5. Products Collection (`/products/{productId}`)
```typescript
interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 6. Orders Collection (`/orders/{orderId}`)
```typescript
interface Order {
  id: string;
  companyId: string;
  customerId: string;
  customerEmail: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  paymentTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Authentication & Authorization

### Firebase Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isAdmin() {
      return isAuthenticated() && getUserData().role == 'admin';
    }
    
    function isActiveUser() {
      return isAuthenticated() && getUserData().isActive == true;
    }
    
    function hasAppPermission(app) {
      return getUserData().permissions[app] == true;
    }
    
    function isCompanyOwner(companyId) {
      return get(/databases/$(database)/documents/companies/$(companyId)).data.ownerId == request.auth.uid;
    }

    // Users collection
    match /users/{userId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
      allow read: if isAuthenticated() && isAdmin();
    }

    // Companies collection
    match /companies/{companyId} {
      allow read: if isActiveUser() && hasAppPermission('payflow');
      allow write: if isAuthenticated() && isCompanyOwner(companyId);
    }

    // Transactions collection
    match /transactions/{transactionId} {
      allow read: if isActiveUser() && 
        (request.auth.uid == resource.data.payerId || 
         request.auth.uid == resource.data.receiverId ||
         isCompanyOwner(resource.data.companyId));
      allow create: if isActiveUser() && request.auth.uid == request.resource.data.payerId;
    }

    // Invoices collection
    match /invoices/{invoiceId} {
      allow read, write: if isActiveUser() && 
        (isCompanyOwner(resource.data.companyId) || 
         hasAppPermission('invoiceflow'));
    }

    // Products collection
    match /products/{productId} {
      allow read: if isActiveUser();
      allow write: if isActiveUser() && 
        (isCompanyOwner(resource.data.companyId) || 
         hasAppPermission('stockflow'));
    }

    // Orders collection
    match /orders/{orderId} {
      allow read: if isActiveUser() && 
        (request.auth.uid == resource.data.customerId ||
         isCompanyOwner(resource.data.companyId));
      allow create: if isActiveUser() && request.auth.uid == request.resource.data.customerId;
      allow update: if isActiveUser() && isCompanyOwner(resource.data.companyId);
    }
  }
}
```

## Shared SDK for Inter-App Communication

### Core SDK (`shared/sdk/core.ts`)
```typescript
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  runTransaction 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class PayFlowSDK {
  // Payment processing
  static async processPayment(data: {
    payerId: string;
    receiverId: string;
    amount: number;
    type: 'invoice_payment' | 'product_purchase' | 'transfer';
    sourceApp: 'invoiceflow' | 'stockflow' | 'payflow';
    metadata?: any;
  }) {
    return runTransaction(db, async (transaction) => {
      // Get payer and receiver
      const payerRef = doc(db, 'users', data.payerId);
      const receiverRef = doc(db, 'users', data.receiverId);
      
      const payerDoc = await transaction.get(payerRef);
      const receiverDoc = await transaction.get(receiverRef);
      
      if (!payerDoc.exists() || !receiverDoc.exists()) {
        throw new Error('User not found');
      }
      
      const payerData = payerDoc.data();
      const receiverData = receiverDoc.data();
      
      if (payerData.walletBalance < data.amount) {
        throw new Error('Insufficient funds');
      }
      
      // Update balances
      transaction.update(payerRef, {
        walletBalance: payerData.walletBalance - data.amount,
        updatedAt: new Date()
      });
      
      transaction.update(receiverRef, {
        walletBalance: receiverData.walletBalance + data.amount,
        updatedAt: new Date()
      });
      
      // Create transaction record
      const transactionRef = doc(collection(db, 'transactions'));
      transaction.set(transactionRef, {
        ...data,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return transactionRef.id;
    });
  }

  // Invoice operations
  static async createInvoice(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'invoices'), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  }

  static async payInvoice(invoiceId: string, payerId: string) {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceDoc = await getDoc(invoiceRef);
    
    if (!invoiceDoc.exists()) {
      throw new Error('Invoice not found');
    }
    
    const invoice = invoiceDoc.data();
    
    if (invoice.status === 'paid') {
      throw new Error('Invoice already paid');
    }
    
    // Get company owner (receiver)
    const companyRef = doc(db, 'companies', invoice.companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      throw new Error('Company not found');
    }
    
    const company = companyDoc.data();
    
    // Process payment
    const transactionId = await this.processPayment({
      payerId,
      receiverId: company.ownerId,
      amount: invoice.total,
      type: 'invoice_payment',
      sourceApp: 'invoiceflow',
      metadata: { invoiceId }
    });
    
    // Update invoice status
    await updateDoc(invoiceRef, {
      status: 'paid',
      paidAt: new Date(),
      paymentTransactionId: transactionId,
      updatedAt: new Date()
    });
    
    return transactionId;
  }

  // Product/Order operations
  static async createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'orders'), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  }

  static async payOrder(orderId: string, payerId: string) {
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }
    
    const order = orderDoc.data();
    
    if (order.status === 'paid') {
      throw new Error('Order already paid');
    }
    
    // Get company owner (receiver)
    const companyRef = doc(db, 'companies', order.companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      throw new Error('Company not found');
    }
    
    const company = companyDoc.data();
    
    // Process payment
    const transactionId = await this.processPayment({
      payerId,
      receiverId: company.ownerId,
      amount: order.total,
      type: 'product_purchase',
      sourceApp: 'stockflow',
      metadata: { orderId }
    });
    
    // Update order status
    await updateDoc(orderRef, {
      status: 'paid',
      paymentTransactionId: transactionId,
      updatedAt: new Date()
    });
    
    return transactionId;
  }

  // User operations
  static async getUserProfile(userId: string) {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    return { id: userDoc.id, ...userDoc.data() };
  }

  // Company operations
  static async getCompanyByOwner(ownerId: string) {
    const q = query(collection(db, 'companies'), where('ownerId', '==', ownerId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
}
```

## App-Specific Configurations

### PayFlow Configuration
```typescript
// config/payflow.ts
export const PAYFLOW_CONFIG = {
  appName: 'PayFlow',
  appId: 'payflow',
  features: {
    walletManagement: true,
    paymentProcessing: true,
    transactionHistory: true,
    adminDashboard: true,
    userManagement: true
  },
  integrations: {
    invoiceflow: true,
    stockflow: true,
    momo: true,
    banking: true
  }
};
```

### InvoiceFlow Configuration
```typescript
// config/invoiceflow.ts
export const INVOICEFLOW_CONFIG = {
  appName: 'InvoiceFlow',
  appId: 'invoiceflow',
  features: {
    invoiceManagement: true,
    clientManagement: true,
    paymentIntegration: true,
    pdfGeneration: true,
    emailNotifications: true
  },
  paymentIntegration: {
    payflowSDK: true,
    directPayments: false // All payments go through PayFlow
  }
};
```

### StockFlow Configuration
```typescript
// config/stockflow.ts
export const STOCKFLOW_CONFIG = {
  appName: 'StockFlow',
  appId: 'stockflow',
  features: {
    inventoryManagement: true,
    salesProcessing: true,
    orderManagement: true,
    stockTracking: true,
    barcodeScanning: true
  },
  paymentIntegration: {
    payflowSDK: true,
    directPayments: false // All payments go through PayFlow
  }
};
```

## Inter-App Communication

### 1. Payment Flow from InvoiceFlow
```typescript
// invoiceflow/services/paymentService.ts
import { PayFlowSDK } from '../../shared/sdk/core';

export class InvoicePaymentService {
  static async requestPayment(invoiceId: string, payerEmail: string) {
    try {
      // Find payer by email
      const payer = await PayFlowSDK.getUserByEmail(payerEmail);
      if (!payer) {
        throw new Error('Payer not found in PayFlow system');
      }
      
      // Process payment through PayFlow
      const transactionId = await PayFlowSDK.payInvoice(invoiceId, payer.id);
      
      return {
        success: true,
        transactionId,
        message: 'Payment processed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

### 2. Payment Flow from StockFlow
```typescript
// stockflow/services/paymentService.ts
import { PayFlowSDK } from '../../shared/sdk/core';

export class ProductPaymentService {
  static async processOrderPayment(orderId: string, payerEmail: string) {
    try {
      // Find payer by email
      const payer = await PayFlowSDK.getUserByEmail(payerEmail);
      if (!payer) {
        throw new Error('Customer not found in PayFlow system');
      }
      
      // Process payment through PayFlow
      const transactionId = await PayFlowSDK.payOrder(orderId, payer.id);
      
      return {
        success: true,
        transactionId,
        message: 'Order payment processed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

## Deployment Architecture

### 1. Shared Firebase Project
- Single Firebase project hosts all three apps
- Shared Firestore database with unified schema
- Shared Authentication system
- Shared Cloud Functions for payment processing

### 2. App Deployment Strategy
- **PayFlow**: Main domain (e.g., payflow.sz)
- **InvoiceFlow**: Subdomain (e.g., invoices.payflow.sz)
- **StockFlow**: Subdomain (e.g., stock.payflow.sz)

### 3. Environment Configuration
```typescript
// shared/config/environment.ts
export const ENVIRONMENT = {
  production: {
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: 'payflow-production.firebaseapp.com',
      projectId: 'payflow-production',
      // ... other config
    },
    apps: {
      payflow: 'https://payflow.sz',
      invoiceflow: 'https://invoices.payflow.sz',
      stockflow: 'https://stock.payflow.sz'
    }
  },
  development: {
    firebase: {
      // Development config
    },
    apps: {
      payflow: 'http://localhost:3000',
      invoiceflow: 'http://localhost:3001',
      stockflow: 'http://localhost:3002'
    }
  }
};
```

## Security Implementation

### 1. Role-Based Access Control
```typescript
// shared/middleware/auth.ts
export const requireAuth = (requiredRole?: 'admin' | 'general_user') => {
  return async (req: any, res: any, next: any) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(decodedToken.uid)
        .get();
      
      if (!userDoc.exists) {
        return res.status(401).json({ error: 'User not found' });
      }
      
      const userData = userDoc.data();
      
      if (!userData.isActive) {
        return res.status(403).json({ error: 'Account deactivated' });
      }
      
      if (requiredRole && userData.role !== requiredRole) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      req.user = { id: decodedToken.uid, ...userData };
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
};
```

### 2. App-Specific Permissions
```typescript
// shared/middleware/appPermissions.ts
export const requireAppAccess = (appName: 'payflow' | 'invoiceflow' | 'stockflow') => {
  return (req: any, res: any, next: any) => {
    if (!req.user.permissions[appName]) {
      return res.status(403).json({ 
        error: `Access denied to ${appName}` 
      });
    }
    next();
  };
};
```

## Data Synchronization

### Real-time Listeners
```typescript
// shared/services/realtimeService.ts
export class RealtimeService {
  static subscribeToUserTransactions(userId: string, callback: (transactions: Transaction[]) => void) {
    const q = query(
      collection(db, 'transactions'),
      where('payerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      }));
      callback(transactions);
    });
  }

  static subscribeToCompanyInvoices(companyId: string, callback: (invoices: Invoice[]) => void) {
    const q = query(
      collection(db, 'invoices'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const invoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      }));
      callback(invoices);
    });
  }

  static subscribeToCompanyOrders(companyId: string, callback: (orders: Order[]) => void) {
    const q = query(
      collection(db, 'orders'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      }));
      callback(orders);
    });
  }
}
```

## Folder Structure

```
payflow-ecosystem/
├── shared/
│   ├── sdk/
│   │   ├── core.ts
│   │   ├── auth.ts
│   │   ├── payments.ts
│   │   └── types.ts
│   ├── config/
│   │   ├── firebase.ts
│   │   ├── environment.ts
│   │   └── constants.ts
│   ├── services/
│   │   ├── realtimeService.ts
│   │   ├── notificationService.ts
│   │   └── validationService.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── appPermissions.ts
│   │   └── validation.ts
│   └── types/
│       ├── user.ts
│       ├── transaction.ts
│       ├── invoice.ts
│       ├── product.ts
│       └── index.ts
├── payflow/ (main app)
│   ├── app/
│   ├── components/
│   ├── contexts/
│   ├── services/
│   └── config/
├── invoiceflow/
│   ├── src/
│   ├── components/
│   ├── services/
│   └── config/
├── stockflow/
│   ├── src/
│   ├── components/
│   ├── services/
│   └── config/
├── functions/ (shared Firebase Functions)
│   ├── src/
│   │   ├── payments/
│   │   ├── notifications/
│   │   ├── webhooks/
│   │   └── index.ts
│   └── package.json
└── docs/
    ├── api/
    ├── deployment/
    └── security/
```

## API Endpoints (Firebase Functions)

### Payment Processing
```typescript
// functions/src/payments/index.ts
export const processPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  return PayFlowSDK.processPayment({
    payerId: context.auth.uid,
    ...data
  });
});

export const processInvoicePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  return PayFlowSDK.payInvoice(data.invoiceId, context.auth.uid);
});

export const processOrderPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  return PayFlowSDK.payOrder(data.orderId, context.auth.uid);
});
```

### Webhook Handlers
```typescript
// functions/src/webhooks/index.ts
export const momoWebhook = functions.https.onRequest(async (req, res) => {
  // Handle MTN MoMo payment notifications
  const { transactionId, status, amount } = req.body;
  
  // Update transaction status in database
  await admin.firestore()
    .collection('transactions')
    .doc(transactionId)
    .update({
      status: status === 'SUCCESSFUL' ? 'completed' : 'failed',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  
  res.status(200).send('OK');
});
```

## Development Workflow

### 1. Local Development Setup
```bash
# Install dependencies for all apps
npm run install:all

# Start all apps in development
npm run dev:all

# Start individual apps
npm run dev:payflow
npm run dev:invoiceflow
npm run dev:stockflow
```

### 2. Testing Strategy
```typescript
// tests/integration/paymentFlow.test.ts
describe('Payment Flow Integration', () => {
  test('should process invoice payment from InvoiceFlow', async () => {
    // Create test invoice in InvoiceFlow
    const invoiceId = await InvoiceService.createInvoice(testInvoiceData);
    
    // Process payment through PayFlow SDK
    const result = await PayFlowSDK.payInvoice(invoiceId, testPayerId);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
  
  test('should process order payment from StockFlow', async () => {
    // Create test order in StockFlow
    const orderId = await OrderService.createOrder(testOrderData);
    
    // Process payment through PayFlow SDK
    const result = await PayFlowSDK.payOrder(orderId, testPayerId);
    
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
```

## Production Deployment

### 1. Firebase Project Setup
- Single Firebase project for all apps
- Shared Firestore database
- Shared Authentication
- Shared Cloud Functions

### 2. Domain Configuration
- Main domain: payflow.sz
- Invoice subdomain: invoices.payflow.sz
- Stock subdomain: stock.payflow.sz

### 3. CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Multi-App
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm run install:all
      
      - name: Build all apps
        run: npm run build:all
      
      - name: Deploy to Firebase
        run: |
          npm install -g firebase-tools
          firebase deploy --only hosting,functions,firestore
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

This architecture provides:
- ✅ Unified authentication across all apps
- ✅ Shared database with proper security rules
- ✅ Clean separation of concerns
- ✅ Scalable payment processing
- ✅ Real-time data synchronization
- ✅ Production-ready deployment strategy
- ✅ Comprehensive testing framework
- ✅ Secure inter-app communication