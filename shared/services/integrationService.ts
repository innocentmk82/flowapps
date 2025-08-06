import { PayFlowSDK, InvoiceFlowSDK, StockFlowSDK } from '../sdk/core';
import { Invoice, Order, Product, User } from '../types';

/**
 * Integration service for cross-app communication
 * Handles data synchronization and payment flows between apps
 */
export class IntegrationService {
  /**
   * InvoiceFlow to PayFlow integration
   */
  static async processInvoicePayment(
    invoiceId: string, 
    payerEmail: string
  ): Promise<{ success: boolean; transactionId?: string; paymentLink?: string; error?: string }> {
    try {
      // Check if payer exists in PayFlow
      const payer = await PayFlowSDK.getUserByEmail(payerEmail);
      
      if (!payer) {
        // Generate payment link for user registration/login
        const paymentLink = await PayFlowSDK.createInvoicePaymentLink(invoiceId);
        return { 
          success: false, 
          error: 'Customer needs to register in PayFlow first',
          paymentLink 
        };
      }
      
      // Process payment directly
      const result = await PayFlowSDK.payInvoice(invoiceId, payer.id);
      
      if (result.success) {
        // Send notification to both payer and receiver
        await PayFlowSDK.sendPaymentNotification(result.transactionId!, 'success');
        
        return {
          success: true,
          transactionId: result.transactionId
        };
      }
      
      return result;
    } catch (error) {
      console.error('Invoice payment integration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * StockFlow to PayFlow integration
   */
  static async processOrderPayment(
    orderId: string, 
    payerEmail: string
  ): Promise<{ success: boolean; transactionId?: string; paymentLink?: string; error?: string }> {
    try {
      // Check if payer exists in PayFlow
      const payer = await PayFlowSDK.getUserByEmail(payerEmail);
      
      if (!payer) {
        // Generate payment link for user registration/login
        const paymentLink = await PayFlowSDK.createOrderPaymentLink(orderId);
        return { 
          success: false, 
          error: 'Customer needs to register in PayFlow first',
          paymentLink 
        };
      }
      
      // Process payment directly
      const result = await PayFlowSDK.payOrder(orderId, payer.id);
      
      if (result.success) {
        // Send notification to both payer and receiver
        await PayFlowSDK.sendPaymentNotification(result.transactionId!, 'success');
        
        return {
          success: true,
          transactionId: result.transactionId
        };
      }
      
      return result;
    } catch (error) {
      console.error('Order payment integration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed'
      };
    }
  }

  /**
   * Create invoice from StockFlow order
   * Allows companies to convert orders to invoices
   */
  static async createInvoiceFromOrder(
    orderId: string, 
    companyId: string
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    try {
      // Get order details
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        return { success: false, error: 'Order not found' };
      }
      
      const order = orderDoc.data() as Order;
      
      // Convert order items to invoice items
      const invoiceItems = order.items.map((item, index) => ({
        id: `item_${index + 1}`,
        description: item.productName,
        quantity: item.quantity,
        rate: item.price,
        total: item.total
      }));
      
      // Create invoice
      const invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId,
        clientEmail: order.customerEmail,
        invoiceNumber: `INV-${Date.now()}`,
        items: invoiceItems,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        status: 'sent',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
      
      const invoiceId = await InvoiceFlowSDK.createInvoice(invoiceData);
      
      return { success: true, invoiceId };
    } catch (error) {
      console.error('Error creating invoice from order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invoice creation failed'
      };
    }
  }

  /**
   * Sync user data across apps
   * Ensures user profile consistency
   */
  static async syncUserData(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await PayFlowSDK.getUserProfile(userId);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }
      
      // Update user data in all app-specific collections if needed
      // This is where you'd sync user preferences, settings, etc.
      
      return { success: true };
    } catch (error) {
      console.error('Error syncing user data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'User sync failed'
      };
    }
  }

  /**
   * Get unified dashboard data for admin users
   */
  static async getUnifiedDashboard(userId: string): Promise<{
    payflow: any;
    invoiceflow: any;
    stockflow: any;
  } | null> {
    try {
      const user = await PayFlowSDK.getUserProfile(userId);
      
      if (!user || user.role !== 'admin') {
        return null;
      }
      
      const company = await PayFlowSDK.getCompanyByOwner(userId);
      
      if (!company) {
        return null;
      }
      
      // Get data from all apps
      const [
        transactions,
        invoices,
        products,
        analytics
      ] = await Promise.all([
        PayFlowSDK.getCompanyTransactions(company.id, 10),
        InvoiceFlowSDK.getCompanyInvoices(company.id),
        StockFlowSDK.getCompanyProducts(company.id),
        PayFlowSDK.getCompanyAnalytics(company.id)
      ]);
      
      return {
        payflow: {
          recentTransactions: transactions,
          analytics
        },
        invoiceflow: {
          recentInvoices: invoices.slice(0, 5),
          totalInvoices: invoices.length,
          paidInvoices: invoices.filter(inv => inv.status === 'paid').length
        },
        stockflow: {
          products: products.slice(0, 10),
          totalProducts: products.length,
          lowStockProducts: products.filter(p => p.quantity <= p.lowStockThreshold)
        }
      };
    } catch (error) {
      console.error('Error getting unified dashboard:', error);
      return null;
    }
  }

  /**
   * Cross-app notification system
   */
  static async sendCrossAppNotification(
    userId: string,
    type: 'invoice_paid' | 'order_completed' | 'payment_received',
    data: any
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId,
        type: 'system_notification',
        title: this.getNotificationTitle(type),
        message: this.getNotificationMessage(type, data),
        data,
        read: false,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error sending cross-app notification:', error);
    }
  }

  private static getNotificationTitle(type: string): string {
    switch (type) {
      case 'invoice_paid':
        return 'Invoice Payment Received';
      case 'order_completed':
        return 'Order Completed';
      case 'payment_received':
        return 'Payment Received';
      default:
        return 'Notification';
    }
  }

  private static getNotificationMessage(type: string, data: any): string {
    switch (type) {
      case 'invoice_paid':
        return `Invoice ${data.invoiceNumber} has been paid by ${data.payerEmail}`;
      case 'order_completed':
        return `Order ${data.orderId} has been completed and paid`;
      case 'payment_received':
        return `You received a payment of ${data.amount} SZL`;
      default:
        return 'You have a new notification';
    }
  }
}