import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// MoMo API Configuration (Mock for demo - replace with actual MTN MoMo API)
const MOMO_API_CONFIG = {
  baseUrl: 'https://sandbox.momodeveloper.mtn.com',
  subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY,
  apiUserId: process.env.MOMO_API_USER_ID,
  apiKey: process.env.MOMO_API_KEY,
};

// Process MoMo payment request
export const processMoMoPayment = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { phoneNumber, amount, userId, description } = request.body;

      // Validate input
      if (!phoneNumber || !amount || !userId) {
        response.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
        return;
      }

      // Validate Eswatini phone number
      const phoneRegex = /^(\+268|268|0)?[67]\d{7}$/;
      if (!phoneRegex.test(phoneNumber)) {
        response.status(400).json({ 
          success: false, 
          error: 'Invalid Eswatini phone number format' 
        });
        return;
      }

      // Generate transaction reference
      const transactionRef = `MOMO${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // In production, integrate with MTN MoMo API
      // For demo, we'll simulate the payment
      const momoResult = await simulateMoMoPayment(phoneNumber, amount, transactionRef);

      if (momoResult.success) {
        // Update user wallet balance
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
          response.status(404).json({ 
            success: false, 
            error: 'User not found' 
          });
          return;
        }

        const userData = userDoc.data()!;
        const newBalance = userData.walletBalance + amount;

        await userRef.update({
          walletBalance: newBalance,
          updatedAt: new Date(),
        });

        // Create transaction record
        await db.collection('transactions').add({
          payerId: userId,
          receiverId: userId,
          amount,
          type: 'topup',
          description: description || `MoMo Top-up - ${phoneNumber}`,
          status: 'completed',
          createdAt: new Date(),
          metadata: {
            paymentMethod: 'momo',
            phoneNumber,
            momoReference: transactionRef,
          },
        });

        response.json({
          success: true,
          transactionId: transactionRef,
          newBalance,
        });
      } else {
        response.status(400).json({
          success: false,
          error: momoResult.error || 'MoMo payment failed',
        });
      }
    } catch (error) {
      logger.error('MoMo payment error:', error);
      response.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// Verify manual deposit
export const verifyManualDeposit = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { referenceNumber, adminId, approved } = request.body;

      if (!referenceNumber || !adminId || approved === undefined) {
        response.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
        return;
      }

      // Find payment reference
      const referencesQuery = await db.collection('payment_references')
        .where('referenceNumber', '==', referenceNumber)
        .limit(1)
        .get();

      if (referencesQuery.empty) {
        response.status(404).json({ 
          success: false, 
          error: 'Reference not found' 
        });
        return;
      }

      const referenceDoc = referencesQuery.docs[0];
      const referenceData = referenceDoc.data();

      if (referenceData.status !== 'pending') {
        response.status(400).json({ 
          success: false, 
          error: 'Reference already processed' 
        });
        return;
      }

      // Update reference status
      await referenceDoc.ref.update({
        status: approved ? 'verified' : 'rejected',
        verifiedAt: new Date(),
        verifiedBy: adminId,
      });

      if (approved) {
        // Update user balance
        const userRef = db.collection('users').doc(referenceData.userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const userData = userDoc.data()!;
          await userRef.update({
            walletBalance: userData.walletBalance + referenceData.amount,
            updatedAt: new Date(),
          });

          // Update pending transaction
          const transactionsQuery = await db.collection('transactions')
            .where('metadata.referenceNumber', '==', referenceNumber)
            .limit(1)
            .get();

          if (!transactionsQuery.empty) {
            await transactionsQuery.docs[0].ref.update({
              status: 'completed',
              updatedAt: new Date(),
            });
          }
        }
      }

      response.json({ success: true });
    } catch (error) {
      logger.error('Manual deposit verification error:', error);
      response.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

// Send notification when payment is received
export const onPaymentReceived = onDocumentCreated(
  'transactions/{transactionId}',
  async (event) => {
    try {
      const transaction = event.data?.data();
      
      if (!transaction || transaction.type === 'topup') {
        return;
      }

      // In production, send push notification to receiver
      logger.info(`Payment received: ${transaction.amount} SZL to user ${transaction.receiverId}`);
      
      // You could integrate with FCM (Firebase Cloud Messaging) here
      // to send push notifications to the receiver
    } catch (error) {
      logger.error('Error processing payment notification:', error);
    }
  }
);

// Monitor failed transactions
export const onTransactionUpdated = onDocumentUpdated(
  'transactions/{transactionId}',
  async (event) => {
    try {
      const before = event.data?.before.data();
      const after = event.data?.after.data();

      if (before?.status !== 'failed' && after?.status === 'failed') {
        logger.warn(`Transaction failed: ${event.params.transactionId}`);
        
        // In production, you might want to:
        // 1. Send notification to user
        // 2. Trigger refund process
        // 3. Log for investigation
      }
    } catch (error) {
      logger.error('Error monitoring transaction update:', error);
    }
  }
);

// Simulate MoMo payment (replace with actual MTN MoMo API integration)
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

// Get payment statistics for admin dashboard
export const getPaymentStats = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { adminId } = request.query;

      if (!adminId) {
        response.status(401).json({ 
          success: false, 
          error: 'Unauthorized' 
        });
        return;
      }

      // Get all transactions from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const transactionsSnapshot = await db.collection('transactions')
        .where('createdAt', '>=', thirtyDaysAgo)
        .get();

      const transactions = transactionsSnapshot.docs.map(doc => doc.data());

      const stats = {
        totalTransactions: transactions.length,
        totalVolume: transactions.reduce((sum, t) => sum + t.amount, 0),
        momoTransactions: transactions.filter(t => t.metadata?.paymentMethod === 'momo').length,
        manualDeposits: transactions.filter(t => t.metadata?.referenceNumber).length,
        failedTransactions: transactions.filter(t => t.status === 'failed').length,
      };

      response.json({ success: true, stats });
    } catch (error) {
      logger.error('Error getting payment stats:', error);
      response.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);