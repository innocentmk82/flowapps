import { useState, useEffect } from 'react';
import { RealTimeService } from '@/services/realTimeService';
import { Transaction } from '@/types';

export function useRealTimeTransactions(userId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = RealTimeService.subscribeToUserTransactions(
      userId,
      (newTransactions) => {
        setTransactions(newTransactions);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { transactions, loading };
}

export function useRealTimeBalance(userId: string) {
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = RealTimeService.subscribeToWalletBalance(
      userId,
      setBalance
    );

    return unsubscribe;
  }, [userId]);

  return balance;
}

export function useRealTimeMerchantPayments(merchantId: string) {
  const [payments, setPayments] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!merchantId) return;

    const unsubscribe = RealTimeService.subscribeToMerchantPayments(
      merchantId,
      (newPayments) => {
        setPayments(newPayments);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [merchantId]);

  return { payments, loading };
}