import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

// Firebase Functions callable interfaces
export interface MoMoPaymentData {
  phoneNumber: string;
  amount: number;
  userId: string;
  description: string;
}

export interface VerifyDepositData {
  referenceNumber: string;
  adminId: string;
  approved: boolean;
}

// Callable functions
export const processMoMoPaymentFunction = httpsCallable<MoMoPaymentData, any>(
  functions,
  'processMoMoPayment'
);

export const verifyManualDepositFunction = httpsCallable<VerifyDepositData, any>(
  functions,
  'verifyManualDeposit'
);

export const getPaymentStatsFunction = httpsCallable<{ adminId: string }, any>(
  functions,
  'getPaymentStats'
);

export class FunctionsService {
  static async callMoMoPayment(data: MoMoPaymentData) {
    try {
      const result = await processMoMoPaymentFunction(data);
      return result.data;
    } catch (error) {
      console.error('Error calling MoMo payment function:', error);
      throw error;
    }
  }

  static async callVerifyDeposit(data: VerifyDepositData) {
    try {
      const result = await verifyManualDepositFunction(data);
      return result.data;
    } catch (error) {
      console.error('Error calling verify deposit function:', error);
      throw error;
    }
  }

  static async callGetPaymentStats(adminId: string) {
    try {
      const result = await getPaymentStatsFunction({ adminId });
      return result.data;
    } catch (error) {
      console.error('Error calling payment stats function:', error);
      throw error;
    }
  }
}