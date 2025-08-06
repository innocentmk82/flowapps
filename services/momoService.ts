import { collection, addDoc, doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Transaction } from '@/types';

export interface MoMoPaymentRequest {
  phoneNumber: string;
  amount: number;
  description: string;
  userId: string;
}

export interface ManualDepositRequest {
  userId: string;
  amount: number;
  method: 'bank_transfer' | 'momo_send';
  description: string;
}

export interface PaymentReference {
  id: string;
  referenceNumber: string;
  userId: string;
  amount: number;
  method: 'bank_transfer' | 'momo_send';
  status: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export class MoMoService {
  // Generate reference number for manual deposits
  static generateReferenceNumber(method: 'bank_transfer' | 'momo_send'): string {
    const prefix = method === 'bank_transfer' ? 'BT' : 'MM';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // Create manual deposit request
  static async createManualDepositRequest(
    request: ManualDepositRequest
  ): Promise<{ success: boolean; referenceNumber?: string; error?: string }> {
    try {
      const referenceNumber = this.generateReferenceNumber(request.method);
      
      const depositData: Omit<PaymentReference, 'id'> = {
        referenceNumber,
        userId: request.userId,
        amount: request.amount,
        method: request.method,
        status: 'pending',
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'payment_references'), depositData);
      
      // Create pending transaction
      const transactionData: Omit<Transaction, 'id'> = {
        payerId: request.userId,
        receiverId: request.userId,
        amount: request.amount,
        type: 'topup',
        description: `${request.description} - Ref: ${referenceNumber}`,
        status: 'pending',
        createdAt: new Date(),
        metadata: {
          referenceNumber,
          paymentMethod: request.method,
          depositRequestId: docRef.id,
        },
      };

      await addDoc(collection(db, 'transactions'), transactionData);

      return { success: true, referenceNumber };
    } catch (error) {
      console.error('Error creating manual deposit request:', error);
      return { success: false, error: 'Failed to create deposit request' };
    }
  }

  // Simulate MoMo payment (in production, this would integrate with MTN MoMo API)
  static async processMoMoPayment(
    request: MoMoPaymentRequest
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Validate phone number format (Eswatini format: +268XXXXXXXX)
      const phoneRegex = /^(\+268|268|0)?[67]\d{7}$/;
      if (!phoneRegex.test(request.phoneNumber)) {
        return { success: false, error: 'Invalid Eswatini phone number format' };
      }

      // In production, you would call MTN MoMo API here
      // For now, we'll simulate the payment process
      
      // Generate transaction reference
      const momoReference = `MOMO${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate 90% success rate for demo
      const isSuccessful = Math.random() > 0.1;
      
      if (!isSuccessful) {
        return { success: false, error: 'MoMo payment failed. Please try again.' };
      }

      // Process the payment in Firestore
      const result = await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', request.userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();

        // Update user balance
        transaction.update(userRef, {
          walletBalance: userData.walletBalance + request.amount,
          updatedAt: new Date(),
        });

        // Create transaction record
        const transactionData: Omit<Transaction, 'id'> = {
          payerId: request.userId,
          receiverId: request.userId,
          amount: request.amount,
          type: 'topup',
          description: `MoMo Top-up - ${request.phoneNumber}`,
          status: 'completed',
          createdAt: new Date(),
          metadata: {
            paymentMethod: 'momo',
            phoneNumber: request.phoneNumber,
            momoReference,
          },
        };

        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, transactionData);

        return transactionRef.id;
      });

      return { success: true, transactionId: result };
    } catch (error) {
      console.error('Error processing MoMo payment:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  // Get payment reference details
  static async getPaymentReference(referenceNumber: string): Promise<PaymentReference | null> {
    try {
      const q = query(
        collection(db, 'payment_references'),
        where('referenceNumber', '==', referenceNumber)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        verifiedAt: data.verifiedAt?.toDate?.(),
      } as PaymentReference;
    } catch (error) {
      console.error('Error fetching payment reference:', error);
      return null;
    }
  }

  // Admin function to verify manual deposits
  static async verifyManualDeposit(
    referenceNumber: string,
    adminId: string,
    approved: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const reference = await this.getPaymentReference(referenceNumber);
      
      if (!reference) {
        return { success: false, error: 'Reference not found' };
      }

      if (reference.status !== 'pending') {
        return { success: false, error: 'Reference already processed' };
      }

      const result = await runTransaction(db, async (transaction) => {
        const referenceRef = doc(db, 'payment_references', reference.id);
        const userRef = doc(db, 'users', reference.userId);

        // Update reference status
        transaction.update(referenceRef, {
          status: approved ? 'verified' : 'rejected',
          verifiedAt: new Date(),
          verifiedBy: adminId,
        });

        if (approved) {
          // Update user balance
          const userDoc = await transaction.get(userRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            transaction.update(userRef, {
              walletBalance: userData.walletBalance + reference.amount,
              updatedAt: new Date(),
            });
          }

          // Update transaction status
          const transactionQuery = query(
            collection(db, 'transactions'),
            where('metadata.referenceNumber', '==', referenceNumber)
          );
          
          // Note: In a real implementation, you'd need to handle this differently
          // as Firestore transactions don't support queries
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error verifying manual deposit:', error);
      return { success: false, error: 'Verification failed' };
    }
  }
}