import { collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Transaction } from '@/types';
import { MoMoService } from './momoService';

export class PaymentService {
  static async processPayment(
    payerId: string,
    receiverId: string,
    amount: number,
    type: 'payment' | 'invoice' | 'product' | 'topup',
    description: string,
    metadata?: any
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const result = await runTransaction(db, async (transaction) => {
        const payerRef = doc(db, 'users', payerId);
        const receiverRef = doc(db, 'users', receiverId);

        const payerDoc = await transaction.get(payerRef);
        
        if (!payerDoc.exists()) {
          throw new Error('Payer not found');
        }

        const payerData = payerDoc.data();

        // For topup, we don't need a receiver
        if (type !== 'topup') {
          const receiverDoc = await transaction.get(receiverRef);
          if (!receiverDoc.exists()) {
            throw new Error('Receiver not found');
          }

          if (payerData.walletBalance < amount) {
            throw new Error('Insufficient funds');
          }

          const receiverData = receiverDoc.data();

          // Update payer balance
          transaction.update(payerRef, {
            walletBalance: payerData.walletBalance - amount,
            updatedAt: new Date(),
          });

          // Update receiver balance
          transaction.update(receiverRef, {
            walletBalance: receiverData.walletBalance + amount,
            updatedAt: new Date(),
          });
        } else {
          // For topup, just add to payer balance
          transaction.update(payerRef, {
            walletBalance: payerData.walletBalance + amount,
            updatedAt: new Date(),
          });
        }

        // Create transaction record
        const transactionData: Omit<Transaction, 'id'> = {
          payerId,
          receiverId: type === 'topup' ? payerId : receiverId,
          amount,
          type,
          description,
          status: 'completed',
          createdAt: new Date(),
          metadata,
        };

        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, transactionData);

        return transactionRef.id;
      });

      return { success: true, transactionId: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Transaction failed' };
    }
  }

  static async topUpWallet(userId: string, amount: number): Promise<{ success: boolean; error?: string }> {
    // For now, we'll use the existing method but in production this would be replaced
    // with proper MoMo or manual deposit flows
    try {
      const result = await this.processPayment(
        userId,
        userId,
        amount,
        'topup',
        `Wallet Top-up - SZL ${amount.toFixed(2)}`
      );
      return { success: result.success, error: result.error };
    } catch (error) {
      return { success: false, error: 'Top-up failed' };
    }
  }

  static async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      // Get transactions where user is either payer or receiver
      const payerQuery = query(
        collection(db, 'transactions'),
        where('payerId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const receiverQuery = query(
        collection(db, 'transactions'),
        where('receiverId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const [payerSnapshot, receiverSnapshot] = await Promise.all([
        getDocs(payerQuery),
        getDocs(receiverQuery)
      ]);

      const transactions: Transaction[] = [];
      const transactionIds = new Set();

      // Add payer transactions
      payerSnapshot.forEach((doc) => {
        if (!transactionIds.has(doc.id)) {
          const data = doc.data();
          transactions.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          } as Transaction);
          transactionIds.add(doc.id);
        }
      });

      // Add receiver transactions (avoid duplicates)
      receiverSnapshot.forEach((doc) => {
        if (!transactionIds.has(doc.id)) {
          const data = doc.data();
          transactions.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          } as Transaction);
          transactionIds.add(doc.id);
        }
      });

      // Sort by date descending
      return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  // MoMo payment integration
  static async processMoMoTopUp(
    userId: string,
    phoneNumber: string,
    amount: number
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    return MoMoService.processMoMoPayment({
      phoneNumber,
      amount,
      description: `MoMo Wallet Top-up - SZL ${amount.toFixed(2)}`,
      userId,
    });
  }

  // Manual deposit request
  static async createManualDepositRequest(
    userId: string,
    amount: number,
    method: 'bank_transfer' | 'momo_send'
  ): Promise<{ success: boolean; referenceNumber?: string; error?: string }> {
    return MoMoService.createManualDepositRequest({
      userId,
      amount,
      method,
      description: `Manual ${method === 'bank_transfer' ? 'Bank Transfer' : 'MoMo Send'} - SZL ${amount.toFixed(2)}`,
    });
  }

  static async findUserByEmail(email: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: 'User not found' };
      }

      const userDoc = querySnapshot.docs[0];
      return { success: true, userId: userDoc.id };
    } catch (error) {
      return { success: false, error: 'Failed to find user' };
    }
  }

  static async getMerchantStats(merchantId: string) {
    try {
      const transactions = await this.getUserTransactions(merchantId);
      const receivedTransactions = transactions.filter(t => t.receiverId === merchantId && t.status === 'completed');
      
      const totalRevenue = receivedTransactions.reduce((sum, t) => sum + t.amount, 0);
      const invoiceTransactions = receivedTransactions.filter(t => t.type === 'invoice');
      const productTransactions = receivedTransactions.filter(t => t.type === 'product');
      const uniqueClients = new Set(receivedTransactions.map(t => t.payerId)).size;

      return {
        totalRevenue,
        totalInvoices: invoiceTransactions.length,
        totalProducts: productTransactions.length,
        totalClients: uniqueClients,
        recentTransactions: receivedTransactions.slice(0, 10),
      };
    } catch (error) {
      console.error('Error getting merchant stats:', error);
      return {
        totalRevenue: 0,
        totalInvoices: 0,
        totalProducts: 0,
        totalClients: 0,
        recentTransactions: [],
      };
    }
  }
}