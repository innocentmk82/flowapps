import { onRequest, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import { PayFlowSDK } from '../../shared/sdk/core';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const auth = getAuth();

/**
 * Payment processing functions
 */
export const processPayment = onCall(async (request) => {
  const { auth: authContext, data } = request;
  
  if (!authContext) {
    throw new Error('Authentication required');
  }
  
  try {
    // Validate user permissions
    const userDoc = await db.collection('users').doc(authContext.uid).get();
    
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    if (!userData?.isActive) {
      throw new Error('Account is deactivated');
    }
    
    // Process payment through SDK
    const result = await PayFlowSDK.processPayment({
      payerId: authContext.uid,
      ...data
    });
    
    return result;
  } catch (error) {
    logger.error('Payment processing error:', error);
    throw new Error(error instanceof Error ? error.message : 'Payment processing failed');
  }
});

export const processInvoicePayment = onCall(async (request) => {
  const { auth: authContext, data } = request;
  
  if (!authContext) {
    throw new Error('Authentication required');
  }
  
  try {
    const result = await PayFlowSDK.payInvoice(data.invoiceId, authContext.uid);
    return result;
  } catch (error) {
    logger.error('Invoice payment error:', error);
    throw new Error(error instanceof Error ? error.message : 'Invoice payment failed');
  }
});

export const processOrderPayment = onCall(async (request) => {
  const { auth: authContext, data } = request;
  
  if (!authContext) {
    throw new Error('Authentication required');
  }
  
  try {
    const result = await PayFlowSDK.payOrder(data.orderId, authContext.uid);
    return result;
  } catch (error) {
    logger.error('Order payment error:', error);
    throw new Error(error instanceof Error ? error.message : 'Order payment failed');
  }
});

/**
 * MTN MoMo integration
 */
export const processMoMoPayment = onRequest({ cors: true }, async (req, res) => {
  try {
    const { phoneNumber, amount, userId, description } = req.body;
    
    // Validate input
    if (!phoneNumber || !amount || !userId) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
      return;
    }
    
    // Validate Eswatini phone number
    const phoneRegex = /^(\+268|268|0)?[67]\d{7}$/;
    if (!phoneRegex.test(phoneNumber)) {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid Eswatini phone number format' 
      });
      return;
    }
    
    // Generate transaction reference
    const transactionRef = `MOMO${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // In production, integrate with MTN MoMo API
    // For now, simulate the payment
    const momoResult = await simulateMoMoPayment(phoneNumber, amount, transactionRef);
    
    if (momoResult.success) {
      // Process wallet top-up through PayFlow SDK
      const result = await PayFlowSDK.topUpWallet(userId, amount, 'momo', {
        phoneNumber,
        momoReference: transactionRef
      });
      
      if (result.success) {
        res.json({
          success: true,
          transactionId: result.transactionId,
          momoReference: transactionRef
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error || 'Wallet top-up failed'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: momoResult.error || 'MoMo payment failed'
      });
    }
  } catch (error) {
    logger.error('MoMo payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Webhook handlers for external integrations
 */
export const momoWebhook = onRequest({ cors: true }, async (req, res) => {
  try {
    const { transactionId, status, amount, reference } = req.body;
    
    // Verify webhook signature (implement in production)
    
    // Update transaction status
    const transactionsQuery = await db.collection('transactions')
      .where('metadata.momoReference', '==', reference)
      .limit(1)
      .get();
    
    if (!transactionsQuery.empty) {
      const transactionDoc = transactionsQuery.docs[0];
      await transactionDoc.ref.update({
        status: status === 'SUCCESSFUL' ? 'completed' : 'failed',
        updatedAt: new Date()
      });
      
      // Send notification
      await PayFlowSDK.sendPaymentNotification(
        transactionDoc.id, 
        status === 'SUCCESSFUL' ? 'success' : 'failed'
      );
    }
    
    res.status(200).send('OK');
  } catch (error) {
    logger.error('MoMo webhook error:', error);
    res.status(500).send('Error');
  }
});

/**
 * Real-time triggers for cross-app synchronization
 */
export const onTransactionCreated = onDocumentCreated('transactions/{transactionId}', async (event) => {
  try {
    const transaction = event.data?.data();
    
    if (!transaction) return;
    
    // Send notifications based on transaction type
    if (transaction.type === 'invoice_payment') {
      // Notify InvoiceFlow about payment
      await db.collection('notifications').add({
        userId: transaction.receiverId,
        type: 'invoice_notification',
        title: 'Invoice Payment Received',
        message: `Invoice payment of ${transaction.amount} SZL received`,
        data: { transactionId: event.params.transactionId, invoiceId: transaction.metadata.invoiceId },
        read: false,
        createdAt: new Date()
      });
    } else if (transaction.type === 'product_purchase') {
      // Notify StockFlow about order payment
      await db.collection('notifications').add({
        userId: transaction.receiverId,
        type: 'order_notification',
        title: 'Order Payment Received',
        message: `Order payment of ${transaction.amount} SZL received`,
        data: { transactionId: event.params.transactionId, orderId: transaction.metadata.orderId },
        read: false,
        createdAt: new Date()
      });
    }
    
    logger.info(`Transaction created: ${event.params.transactionId}`);
  } catch (error) {
    logger.error('Error processing transaction creation:', error);
  }
});

export const onInvoiceStatusChanged = onDocumentUpdated('invoices/{invoiceId}', async (event) => {
  try {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    if (!before || !after) return;
    
    // Check if invoice was paid
    if (before.status !== 'paid' && after.status === 'paid') {
      // Send notification to company owner
      const companyDoc = await db.collection('companies').doc(after.companyId).get();
      
      if (companyDoc.exists()) {
        const company = companyDoc.data();
        
        await db.collection('notifications').add({
          userId: company?.ownerId,
          type: 'payment_notification',
          title: 'Invoice Paid',
          message: `Invoice ${after.invoiceNumber} has been paid by ${after.clientEmail}`,
          data: { invoiceId: event.params.invoiceId },
          read: false,
          createdAt: new Date()
        });
      }
    }
  } catch (error) {
    logger.error('Error processing invoice status change:', error);
  }
});

export const onOrderStatusChanged = onDocumentUpdated('orders/{orderId}', async (event) => {
  try {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    if (!before || !after) return;
    
    // Check if order was paid
    if (before.status !== 'paid' && after.status === 'paid') {
      // Send notification to company owner
      const companyDoc = await db.collection('companies').doc(after.companyId).get();
      
      if (companyDoc.exists()) {
        const company = companyDoc.data();
        
        await db.collection('notifications').add({
          userId: company?.ownerId,
          type: 'payment_notification',
          title: 'Order Paid',
          message: `Order ${event.params.orderId} has been paid by ${after.customerEmail}`,
          data: { orderId: event.params.orderId },
          read: false,
          createdAt: new Date()
        });
      }
    }
  } catch (error) {
    logger.error('Error processing order status change:', error);
  }
});

/**
 * Analytics and reporting functions
 */
export const getCompanyAnalytics = onCall(async (request) => {
  const { auth: authContext, data } = request;
  
  if (!authContext) {
    throw new Error('Authentication required');
  }
  
  try {
    // Verify user is admin of the company
    const userDoc = await db.collection('users').doc(authContext.uid).get();
    
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new Error('Admin access required');
    }
    
    const company = await PayFlowSDK.getCompanyByOwner(authContext.uid);
    
    if (!company) {
      throw new Error('Company not found');
    }
    
    const analytics = await PayFlowSDK.getCompanyAnalytics(
      company.id,
      data.startDate ? new Date(data.startDate) : undefined,
      data.endDate ? new Date(data.endDate) : undefined
    );
    
    return analytics;
  } catch (error) {
    logger.error('Analytics error:', error);
    throw new Error(error instanceof Error ? error.message : 'Analytics failed');
  }
});

/**
 * User management functions
 */
export const grantAppPermission = onCall(async (request) => {
  const { auth: authContext, data } = request;
  
  if (!authContext) {
    throw new Error('Authentication required');
  }
  
  try {
    const result = await AuthService.grantAppPermission(
      authContext.uid,
      data.userId,
      data.app
    );
    
    return result;
  } catch (error) {
    logger.error('Permission grant error:', error);
    throw new Error(error instanceof Error ? error.message : 'Permission grant failed');
  }
});

/**
 * Helper functions
 */
async function simulateMoMoPayment(
  phoneNumber: string, 
  amount: number, 
  reference: string
): Promise<{ success: boolean; error?: string }> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate 95% success rate
  const isSuccessful = Math.random() > 0.05;
  
  if (isSuccessful) {
    logger.info(`MoMo payment successful: ${amount} SZL from ${phoneNumber}, ref: ${reference}`);
    return { success: true };
  } else {
    logger.warn(`MoMo payment failed: ${amount} SZL from ${phoneNumber}, ref: ${reference}`);
    return { success: false, error: 'Payment declined by MoMo service' };
  }
}