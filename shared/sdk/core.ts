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
  runTransaction,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Transaction, Invoice, Order, Company, Product } from '../types';

export class PayFlowSDK {
  /**
   * Core payment processing function
   * Used by all apps to process payments through PayFlow
   */
  static async processPayment(data: {
    payerId: string;
    receiverId: string;
    companyId?: string;
    amount: number;
    type: 'wallet_topup' | 'invoice_payment' | 'product_purchase' | 'transfer';
    sourceApp: 'payflow' | 'invoiceflow' | 'stockflow';
    description: string;
    metadata?: any;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const transactionId = await runTransaction(db, async (transaction) => {
        // Get payer and receiver documents
        const payerRef = doc(db, 'users', data.payerId);
        const receiverRef = doc(db, 'users', data.receiverId);
        
        const payerDoc = await transaction.get(payerRef);
        const receiverDoc = await transaction.get(receiverRef);
        
        if (!payerDoc.exists()) {
          throw new Error('Payer not found');
        }
        
        if (!receiverDoc.exists()) {
          throw new Error('Receiver not found');
        }
        
        const payerData = payerDoc.data() as User;
        const receiverData = receiverDoc.data() as User;
        
        // Check if users are active
        if (!payerData.isActive || !receiverData.isActive) {
          throw new Error('One or more users are inactive');
        }
        
        // For non-topup transactions, check balance
        if (data.type !== 'wallet_topup') {
          if (payerData.walletBalance < data.amount) {
            throw new Error('Insufficient wallet balance');
          }
          
          // Update payer balance
          transaction.update(payerRef, {
            walletBalance: payerData.walletBalance - data.amount,
            updatedAt: new Date()
          });
        }
        
        // Update receiver balance
        transaction.update(receiverRef, {
          walletBalance: receiverData.walletBalance + data.amount,
          updatedAt: new Date()
        });
        
        // Create transaction record
        const transactionRef = doc(collection(db, 'transactions'));
        const transactionData: Omit<Transaction, 'id'> = {
          payerId: data.payerId,
          receiverId: data.receiverId,
          companyId: data.companyId,
          amount: data.amount,
          type: data.type,
          status: 'completed',
          description: data.description,
          sourceApp: data.sourceApp,
          metadata: data.metadata || {},
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        transaction.set(transactionRef, transactionData);
        
        return transactionRef.id;
      });
      
      return { success: true, transactionId };
    } catch (error) {
      console.error('Payment processing error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment processing failed' 
      };
    }
  }

  /**
   * Invoice payment processing
   * Called by InvoiceFlow when a customer pays an invoice
   */
  static async payInvoice(invoiceId: string, payerId: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Get invoice details
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);
      
      if (!invoiceDoc.exists()) {
        return { success: false, error: 'Invoice not found' };
      }
      
      const invoice = invoiceDoc.data() as Invoice;
      
      if (invoice.status === 'paid') {
        return { success: false, error: 'Invoice already paid' };
      }
      
      // Get company details to find the receiver
      const companyRef = doc(db, 'companies', invoice.companyId);
      const companyDoc = await getDoc(companyRef);
      
      if (!companyDoc.exists()) {
        return { success: false, error: 'Company not found' };
      }
      
      const company = companyDoc.data() as Company;
      
      // Process payment
      const paymentResult = await this.processPayment({
        payerId,
        receiverId: company.ownerId,
        companyId: invoice.companyId,
        amount: invoice.total,
        type: 'invoice_payment',
        sourceApp: 'invoiceflow',
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        metadata: { invoiceId }
      });
      
      if (paymentResult.success) {
        // Update invoice status
        await updateDoc(invoiceRef, {
          status: 'paid',
          paidAt: new Date(),
          paymentTransactionId: paymentResult.transactionId,
          updatedAt: new Date()
        });
      }
      
      return paymentResult;
    } catch (error) {
      console.error('Invoice payment error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invoice payment failed' 
      };
    }
  }

  /**
   * Order payment processing
   * Called by StockFlow when a customer pays for products
   */
  static async payOrder(orderId: string, payerId: string): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Get order details
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        return { success: false, error: 'Order not found' };
      }
      
      const order = orderDoc.data() as Order;
      
      if (order.status === 'paid') {
        return { success: false, error: 'Order already paid' };
      }
      
      // Get company details to find the receiver
      const companyRef = doc(db, 'companies', order.companyId);
      const companyDoc = await getDoc(companyRef);
      
      if (!companyDoc.exists()) {
        return { success: false, error: 'Company not found' };
      }
      
      const company = companyDoc.data() as Company;
      
      // Check product availability and update stock
      const stockUpdateResult = await this.updateProductStock(order.items);
      if (!stockUpdateResult.success) {
        return { success: false, error: stockUpdateResult.error };
      }
      
      // Process payment
      const paymentResult = await this.processPayment({
        payerId,
        receiverId: company.ownerId,
        companyId: order.companyId,
        amount: order.total,
        type: 'product_purchase',
        sourceApp: 'stockflow',
        description: `Payment for Order ${orderId}`,
        metadata: { orderId }
      });
      
      if (paymentResult.success) {
        // Update order status
        await updateDoc(orderRef, {
          status: 'paid',
          paymentTransactionId: paymentResult.transactionId,
          updatedAt: new Date()
        });
      }
      
      return paymentResult;
    } catch (error) {
      console.error('Order payment error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Order payment failed' 
      };
    }
  }

  /**
   * Update product stock after successful payment
   */
  private static async updateProductStock(items: Array<{ productId: string; quantity: number }>): Promise<{ success: boolean; error?: string }> {
    try {
      await runTransaction(db, async (transaction) => {
        for (const item of items) {
          const productRef = doc(db, 'products', item.productId);
          const productDoc = await transaction.get(productRef);
          
          if (!productDoc.exists()) {
            throw new Error(`Product ${item.productId} not found`);
          }
          
          const product = productDoc.data() as Product;
          
          if (product.quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }
          
          // Update product quantity
          transaction.update(productRef, {
            quantity: product.quantity - item.quantity,
            updatedAt: new Date()
          });
        }
      });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Stock update failed' 
      };
    }
  }

  /**
   * User management functions
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() } as User;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  static async getUserProfile(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return { id: userDoc.id, ...userDoc.data() } as User;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Company management functions
   */
  static async getCompanyByOwner(ownerId: string): Promise<Company | null> {
    try {
      const q = query(collection(db, 'companies'), where('ownerId', '==', ownerId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const companyDoc = querySnapshot.docs[0];
      return { id: companyDoc.id, ...companyDoc.data() } as Company;
    } catch (error) {
      console.error('Error getting company by owner:', error);
      return null;
    }
  }

  static async createCompany(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'companies'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  /**
   * Transaction history functions
   */
  static async getUserTransactions(userId: string, limit?: number): Promise<Transaction[]> {
    try {
      let q = query(
        collection(db, 'transactions'),
        where('payerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      if (limit) {
        q = query(q, orderBy('createdAt', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }

  static async getCompanyTransactions(companyId: string, limit?: number): Promise<Transaction[]> {
    try {
      let q = query(
        collection(db, 'transactions'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      
      if (limit) {
        q = query(q, orderBy('createdAt', 'desc'));
      }
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting company transactions:', error);
      return [];
    }
  }

  /**
   * Wallet management functions
   */
  static async topUpWallet(userId: string, amount: number, method: 'momo' | 'bank_transfer', metadata?: any): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    return this.processPayment({
      payerId: userId,
      receiverId: userId, // Self-transaction for top-up
      amount,
      type: 'wallet_topup',
      sourceApp: 'payflow',
      description: `Wallet top-up via ${method}`,
      metadata: { paymentMethod: method, ...metadata }
    });
  }

  /**
   * Integration helper functions
   */
  static async createInvoicePaymentLink(invoiceId: string): Promise<string> {
    // Generate a secure payment link for invoice
    const baseUrl = process.env.PAYFLOW_BASE_URL || 'https://payflow.sz';
    return `${baseUrl}/pay/invoice/${invoiceId}`;
  }

  static async createOrderPaymentLink(orderId: string): Promise<string> {
    // Generate a secure payment link for order
    const baseUrl = process.env.PAYFLOW_BASE_URL || 'https://payflow.sz';
    return `${baseUrl}/pay/order/${orderId}`;
  }

  /**
   * Notification functions
   */
  static async sendPaymentNotification(transactionId: string, type: 'success' | 'failed'): Promise<void> {
    try {
      // Get transaction details
      const transactionRef = doc(db, 'transactions', transactionId);
      const transactionDoc = await getDoc(transactionRef);
      
      if (!transactionDoc.exists()) {
        throw new Error('Transaction not found');
      }
      
      const transaction = transactionDoc.data() as Transaction;
      
      // Create notification record
      await addDoc(collection(db, 'notifications'), {
        userId: transaction.payerId,
        type: 'payment_notification',
        title: type === 'success' ? 'Payment Successful' : 'Payment Failed',
        message: type === 'success' 
          ? `Your payment of ${transaction.amount} SZL was successful`
          : `Your payment of ${transaction.amount} SZL failed`,
        data: { transactionId },
        read: false,
        createdAt: new Date()
      });
      
      // In production, also send push notification or email
    } catch (error) {
      console.error('Error sending payment notification:', error);
    }
  }

  /**
   * Analytics and reporting functions
   */
  static async getCompanyAnalytics(companyId: string, startDate?: Date, endDate?: Date) {
    try {
      let q = query(
        collection(db, 'transactions'),
        where('companyId', '==', companyId),
        where('status', '==', 'completed')
      );
      
      if (startDate && endDate) {
        q = query(
          q,
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          where('createdAt', '<=', Timestamp.fromDate(endDate))
        );
      }
      
      const querySnapshot = await getDocs(q);
      const transactions = querySnapshot.docs.map(doc => doc.data() as Transaction);
      
      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
      const invoicePayments = transactions.filter(t => t.type === 'invoice_payment');
      const productPurchases = transactions.filter(t => t.type === 'product_purchase');
      
      return {
        totalRevenue,
        totalTransactions: transactions.length,
        invoiceRevenue: invoicePayments.reduce((sum, t) => sum + t.amount, 0),
        productRevenue: productPurchases.reduce((sum, t) => sum + t.amount, 0),
        averageTransactionValue: transactions.length > 0 ? totalRevenue / transactions.length : 0
      };
    } catch (error) {
      console.error('Error getting company analytics:', error);
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        invoiceRevenue: 0,
        productRevenue: 0,
        averageTransactionValue: 0
      };
    }
  }
}

/**
 * InvoiceFlow SDK
 * Specific functions for invoice management
 */
export class InvoiceFlowSDK {
  static async createInvoice(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'invoices'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  static async getCompanyInvoices(companyId: string): Promise<Invoice[]> {
    try {
      const q = query(
        collection(db, 'invoices'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Invoice[];
    } catch (error) {
      console.error('Error getting company invoices:', error);
      return [];
    }
  }

  static async requestPayment(invoiceId: string, payerEmail: string): Promise<{ success: boolean; paymentLink?: string; error?: string }> {
    try {
      // Find payer by email
      const payer = await PayFlowSDK.getUserByEmail(payerEmail);
      if (!payer) {
        return { success: false, error: 'Customer not found in PayFlow system' };
      }
      
      // Generate payment link
      const paymentLink = await PayFlowSDK.createInvoicePaymentLink(invoiceId);
      
      return { success: true, paymentLink };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment request failed' 
      };
    }
  }
}

/**
 * StockFlow SDK
 * Specific functions for inventory and order management
 */
export class StockFlowSDK {
  static async createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  static async getCompanyProducts(companyId: string): Promise<Product[]> {
    try {
      const q = query(
        collection(db, 'products'),
        where('companyId', '==', companyId),
        where('isActive', '==', true),
        orderBy('name')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      })) as Product[];
    } catch (error) {
      console.error('Error getting company products:', error);
      return [];
    }
  }

  static async requestPayment(orderId: string, payerEmail: string): Promise<{ success: boolean; paymentLink?: string; error?: string }> {
    try {
      // Find payer by email
      const payer = await PayFlowSDK.getUserByEmail(payerEmail);
      if (!payer) {
        return { success: false, error: 'Customer not found in PayFlow system' };
      }
      
      // Generate payment link
      const paymentLink = await PayFlowSDK.createOrderPaymentLink(orderId);
      
      return { success: true, paymentLink };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Payment request failed' 
      };
    }
  }

  static async updateProductStock(productId: string, newQuantity: number): Promise<{ success: boolean; error?: string }> {
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        quantity: newQuantity,
        updatedAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Stock update failed' 
      };
    }
  }
}