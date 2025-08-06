# Integration Examples

## PayFlow Integration in InvoiceFlow

### 1. Invoice Payment Button Component
```typescript
// invoiceflow/src/components/InvoicePaymentButton.tsx
import React from 'react';
import { PaymentButton } from '../../shared/components/PaymentButton';
import { Invoice } from '../../shared/types';

interface InvoicePaymentButtonProps {
  invoice: Invoice;
  onPaymentSuccess?: () => void;
}

export const InvoicePaymentButton: React.FC<InvoicePaymentButtonProps> = ({
  invoice,
  onPaymentSuccess
}) => {
  return (
    <PaymentButton
      type="invoice"
      itemId={invoice.id}
      amount={invoice.total}
      payerEmail={invoice.clientEmail}
      onSuccess={(transactionId) => {
        console.log('Invoice paid:', transactionId);
        onPaymentSuccess?.();
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
      }}
    />
  );
};
```

### 2. Invoice Service Integration
```typescript
// invoiceflow/src/services/invoiceService.ts
import { InvoiceFlowSDK } from '../../shared/sdk/core';
import { IntegrationService } from '../../shared/services/integrationService';

export class InvoiceService {
  static async createInvoice(invoiceData: any) {
    return InvoiceFlowSDK.createInvoice(invoiceData);
  }

  static async sendPaymentRequest(invoiceId: string, clientEmail: string) {
    return InvoiceFlowSDK.requestPayment(invoiceId, clientEmail);
  }

  static async getCompanyInvoices(companyId: string) {
    return InvoiceFlowSDK.getCompanyInvoices(companyId);
  }
}
```

## PayFlow Integration in StockFlow

### 1. Product Purchase Component
```typescript
// stockflow/src/components/ProductPurchaseButton.tsx
import React from 'react';
import { PaymentButton } from '../../shared/components/PaymentButton';
import { Order } from '../../shared/types';

interface ProductPurchaseButtonProps {
  order: Order;
  onPaymentSuccess?: () => void;
}

export const ProductPurchaseButton: React.FC<ProductPurchaseButtonProps> = ({
  order,
  onPaymentSuccess
}) => {
  return (
    <PaymentButton
      type="order"
      itemId={order.id}
      amount={order.total}
      payerEmail={order.customerEmail}
      onSuccess={(transactionId) => {
        console.log('Order paid:', transactionId);
        onPaymentSuccess?.();
      }}
      onError={(error) => {
        console.error('Payment failed:', error);
      }}
    />
  );
};
```

### 2. Order Service Integration
```typescript
// stockflow/src/services/orderService.ts
import { StockFlowSDK } from '../../shared/sdk/core';
import { IntegrationService } from '../../shared/services/integrationService';

export class OrderService {
  static async createOrder(orderData: any) {
    return StockFlowSDK.createOrder(orderData);
  }

  static async requestPayment(orderId: string, customerEmail: string) {
    return StockFlowSDK.requestPayment(orderId, customerEmail);
  }

  static async getCompanyProducts(companyId: string) {
    return StockFlowSDK.getCompanyProducts(companyId);
  }
}
```

## Cross-App Authentication

### 1. Shared Auth Hook Usage
```typescript
// invoiceflow/src/hooks/useAuth.ts
import { useMultiAppAuth } from '../../shared/hooks/useMultiAppAuth';

export const useAuth = () => {
  return useMultiAppAuth('invoiceflow');
};
```

```typescript
// stockflow/src/hooks/useAuth.ts
import { useMultiAppAuth } from '../../shared/hooks/useMultiAppAuth';

export const useAuth = () => {
  return useMultiAppAuth('stockflow');
};
```

### 2. Protected Route Component
```typescript
// shared/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useMultiAppAuth } from '../hooks/useMultiAppAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredApp: 'payflow' | 'invoiceflow' | 'stockflow';
  requiredRole?: 'admin' | 'general_user';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredApp,
  requiredRole
}) => {
  const { user, loading, hasRequiredAccess } = useMultiAppAuth(requiredApp);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!hasRequiredAccess) {
    return (
      <div className="text-center p-8">
        <h2>Access Denied</h2>
        <p>You don't have permission to access {requiredApp}</p>
      </div>
    );
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="text-center p-8">
        <h2>Insufficient Permissions</h2>
        <p>This feature requires {requiredRole} access</p>
      </div>
    );
  }

  return <>{children}</>;
};
```

## Real-time Data Synchronization

### 1. Transaction Updates
```typescript
// payflow/services/realtimeService.ts
import { RealtimeService } from '../../shared/services/realtimeService';

export class PayFlowRealtimeService extends RealtimeService {
  static subscribeToWalletBalance(userId: string, callback: (balance: number) => void) {
    return this.subscribeToUserProfile(userId, (user) => {
      if (user) {
        callback(user.walletBalance);
      }
    });
  }

  static subscribeToPaymentNotifications(userId: string, callback: (notifications: any[]) => void) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(notifications);
    });
  }
}
```

### 2. Invoice Status Updates
```typescript
// invoiceflow/services/realtimeService.ts
export class InvoiceFlowRealtimeService {
  static subscribeToInvoicePayments(companyId: string, callback: (invoices: Invoice[]) => void) {
    return RealtimeService.subscribeToCompanyInvoices(companyId, callback);
  }
}
```

### 3. Order Status Updates
```typescript
// stockflow/services/realtimeService.ts
export class StockFlowRealtimeService {
  static subscribeToOrderPayments(companyId: string, callback: (orders: Order[]) => void) {
    return RealtimeService.subscribeToCompanyOrders(companyId, callback);
  }
}
```

## Error Handling and Fallbacks

### 1. Network Error Handling
```typescript
// shared/utils/errorHandler.ts
export class ErrorHandler {
  static handlePaymentError(error: any, context: string) {
    console.error(`Payment error in ${context}:`, error);
    
    if (error.message?.includes('Insufficient funds')) {
      return 'Insufficient wallet balance. Please top up your PayFlow wallet.';
    }
    
    if (error.message?.includes('User not found')) {
      return 'Customer not found in PayFlow system. Please register first.';
    }
    
    if (error.message?.includes('Network')) {
      return 'Network error. Please check your connection and try again.';
    }
    
    return 'Payment processing failed. Please try again.';
  }

  static handleIntegrationError(error: any, app: string) {
    console.error(`Integration error with ${app}:`, error);
    
    return `Failed to communicate with ${app}. Please try again later.`;
  }
}
```

### 2. Offline Support
```typescript
// shared/utils/offlineHandler.ts
export class OfflineHandler {
  static queuePaymentForSync(paymentData: any) {
    const queue = JSON.parse(localStorage.getItem('paymentQueue') || '[]');
    queue.push({
      ...paymentData,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    });
    localStorage.setItem('paymentQueue', JSON.stringify(queue));
  }

  static async syncQueuedPayments() {
    const queue = JSON.parse(localStorage.getItem('paymentQueue') || '[]');
    
    for (const payment of queue) {
      try {
        await PayFlowSDK.processPayment(payment);
        // Remove from queue on success
        const updatedQueue = queue.filter((p: any) => p.id !== payment.id);
        localStorage.setItem('paymentQueue', JSON.stringify(updatedQueue));
      } catch (error) {
        console.error('Failed to sync payment:', error);
      }
    }
  }
}
```

## Testing Examples

### 1. Integration Test
```typescript
// tests/integration/paymentFlow.test.ts
import { PayFlowSDK, InvoiceFlowSDK, StockFlowSDK } from '../../shared/sdk/core';

describe('Cross-App Payment Integration', () => {
  test('should process invoice payment from InvoiceFlow', async () => {
    // Create test invoice
    const invoiceId = await InvoiceFlowSDK.createInvoice({
      companyId: 'test-company',
      clientEmail: 'customer@test.com',
      invoiceNumber: 'TEST-001',
      items: [{ id: '1', description: 'Test Service', quantity: 1, rate: 100, total: 100 }],
      subtotal: 100,
      tax: 15,
      total: 115,
      status: 'sent',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    
    // Process payment
    const result = await PayFlowSDK.payInvoice(invoiceId, 'test-payer-id');
    
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
  });

  test('should process order payment from StockFlow', async () => {
    // Create test order
    const orderId = await StockFlowSDK.createOrder({
      companyId: 'test-company',
      customerId: 'test-customer-id',
      customerEmail: 'customer@test.com',
      items: [{ productId: 'test-product', productName: 'Test Product', quantity: 1, price: 50, total: 50 }],
      subtotal: 50,
      tax: 7.5,
      total: 57.5,
      status: 'pending'
    });
    
    // Process payment
    const result = await PayFlowSDK.payOrder(orderId, 'test-payer-id');
    
    expect(result.success).toBe(true);
    expect(result.transactionId).toBeDefined();
  });
});
```

### 2. End-to-End Test
```typescript
// tests/e2e/userJourney.test.ts
describe('Complete User Journey', () => {
  test('should complete full payment flow', async () => {
    // 1. User registers in PayFlow
    const user = await AuthService.register(
      'test@example.com',
      'password123',
      { firstName: 'Test', lastName: 'User' },
      'general_user'
    );
    
    // 2. User tops up wallet
    const topUpResult = await PayFlowSDK.topUpWallet(user.user!.id, 1000, 'momo');
    expect(topUpResult.success).toBe(true);
    
    // 3. Company creates invoice in InvoiceFlow
    const invoiceId = await InvoiceFlowSDK.createInvoice(testInvoiceData);
    
    // 4. User pays invoice through PayFlow
    const paymentResult = await PayFlowSDK.payInvoice(invoiceId, user.user!.id);
    expect(paymentResult.success).toBe(true);
    
    // 5. Verify invoice is marked as paid
    const invoice = await getDoc(doc(db, 'invoices', invoiceId));
    expect(invoice.data()?.status).toBe('paid');
  });
});
```

This comprehensive architecture provides:

✅ **Unified Authentication**: Single sign-on across all three apps
✅ **Shared Database**: Consistent data model with proper security
✅ **Payment Integration**: Seamless payment flows between apps  
✅ **Real-time Sync**: Live updates across all applications
✅ **Role-based Access**: Proper permissions and security
✅ **Production Ready**: Complete deployment and monitoring setup
✅ **Scalable Architecture**: Modular design for future expansion
✅ **Error Handling**: Comprehensive error management and fallbacks