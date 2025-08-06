import { onSnapshot, collection, query, where, orderBy, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Transaction, User } from '@/types';

export class RealTimeService {
  static subscribeToUserTransactions(
    userId: string,
    callback: (transactions: Transaction[]) => void
  ): () => void {
    // Subscribe to transactions where user is either payer or receiver
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

    let payerTransactions: Transaction[] = [];
    let receiverTransactions: Transaction[] = [];

    const updateTransactions = () => {
      const allTransactions = [...payerTransactions, ...receiverTransactions];
      const uniqueTransactions = allTransactions.filter((transaction, index, self) =>
        index === self.findIndex(t => t.id === transaction.id)
      );
      const sortedTransactions = uniqueTransactions.sort((a, b) => 
        b.createdAt.getTime() - a.createdAt.getTime()
      );
      callback(sortedTransactions);
    };

    const unsubscribePayer = onSnapshot(payerQuery, (querySnapshot) => {
      payerTransactions = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        payerTransactions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as Transaction);
      });
      updateTransactions();
    });

    const unsubscribeReceiver = onSnapshot(receiverQuery, (querySnapshot) => {
      receiverTransactions = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        receiverTransactions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as Transaction);
      });
      updateTransactions();
    });

    return () => {
      unsubscribePayer();
      unsubscribeReceiver();
    };
  }

  static subscribeToWalletBalance(
    userId: string,
    callback: (balance: number) => void
  ): () => void {
    return onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        callback(userData.walletBalance || 0);
      }
    });
  }

  static subscribeToUserProfile(
    userId: string,
    callback: (user: User | null) => void
  ): () => void {
    return onSnapshot(doc(db, 'users', userId), (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        callback({
          id: doc.id,
          ...userData,
          createdAt: userData.createdAt?.toDate?.() || new Date(),
          updatedAt: userData.updatedAt?.toDate?.() || new Date(),
        } as User);
      } else {
        callback(null);
      }
    });
  }

  static subscribeToMerchantPayments(
    merchantId: string,
    callback: (transactions: Transaction[]) => void
  ): () => void {
    const q = query(
      collection(db, 'transactions'),
      where('receiverId', '==', merchantId),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const transactions: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as Transaction);
      });
      callback(transactions);
    });
  }
}