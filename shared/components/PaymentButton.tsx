import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { IntegrationService } from '../services/integrationService';

interface PaymentButtonProps {
  type: 'invoice' | 'order';
  itemId: string;
  amount: number;
  payerEmail: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  style?: any;
}

/**
 * Shared payment button component
 * Can be used in both InvoiceFlow and StockFlow for PayFlow integration
 */
export const PaymentButton: React.FC<PaymentButtonProps> = ({
  type,
  itemId,
  amount,
  payerEmail,
  onSuccess,
  onError,
  disabled = false,
  style
}) => {
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    
    try {
      let result;
      
      if (type === 'invoice') {
        result = await IntegrationService.processInvoicePayment(itemId, payerEmail);
      } else {
        result = await IntegrationService.processOrderPayment(itemId, payerEmail);
      }
      
      if (result.success && result.transactionId) {
        onSuccess?.(result.transactionId);
        Alert.alert(
          'Payment Successful',
          `Payment of ${amount} SZL has been processed successfully.`
        );
      } else if (result.paymentLink) {
        // User needs to register/login in PayFlow
        Alert.alert(
          'PayFlow Account Required',
          'Customer needs to create a PayFlow account to complete payment.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open PayFlow', 
              onPress: () => {
                // In a real app, you'd open the PayFlow app or web link
                console.log('Opening PayFlow:', result.paymentLink);
              }
            }
          ]
        );
      } else {
        onError?.(result.error || 'Payment failed');
        Alert.alert('Payment Failed', result.error || 'Payment could not be processed.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      onError?.(errorMessage);
      Alert.alert('Payment Error', errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={handlePayment}
      disabled={disabled || processing}
    >
      <View style={styles.buttonContent}>
        {processing ? (
          <Loader2 size={20} color="#FFFFFF" style={styles.icon} />
        ) : (
          <CreditCard size={20} color="#FFFFFF" style={styles.icon} />
        )}
        <Text style={styles.buttonText}>
          {processing ? 'Processing...' : `Pay ${amount} SZL`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});