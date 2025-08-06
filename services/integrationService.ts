import { PayFlowSDK, InvoiceFlowSDK, StockFlowSDK } from '../shared/sdk/core';
import { IntegrationService as SharedIntegrationService } from '../shared/services/integrationService';

/**
 * PayFlow Integration Service
 * Handles communication between PayFlow and external apps
 */
export class IntegrationService extends SharedIntegrationService {
  /**
   * Process invoice payment from InvoiceFlow
   */
  static async processInvoicePayment(invoiceId: string, payerEmail: string) {
    return super.processInvoicePayment(invoiceId, payerEmail);
  }

  /**
   * Process order payment from StockFlow
   */
  static async processOrderPayment(orderId: string, payerEmail: string) {
    return super.processOrderPayment(orderId, payerEmail);
  }

  /**
   * Get unified dashboard data for admin users
   */
  static async getUnifiedDashboard(userId: string) {
    return super.getUnifiedDashboard(userId);
  }

  /**
   * PayFlow-specific functions
   */
  static async topUpWallet(userId: string, amount: number, method: 'momo' | 'bank_transfer') {
    return PayFlowSDK.topUpWallet(userId, amount, method);
  }

  static async transferMoney(fromUserId: string, toUserEmail: string, amount: number, description: string) {
    const toUser = await PayFlowSDK.getUserByEmail(toUserEmail);
    
    if (!toUser) {
      return { success: false, error: 'Recipient not found' };
    }
    
    return PayFlowSDK.processPayment({
      payerId: fromUserId,
      receiverId: toUser.id,
      amount,
      type: 'transfer',
      sourceApp: 'payflow',
      description
    });
  }
}