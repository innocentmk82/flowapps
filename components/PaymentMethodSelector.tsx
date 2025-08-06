import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Smartphone, Building2, CreditCard } from 'lucide-react-native';

interface PaymentMethodSelectorProps {
  selectedMethod: 'momo' | 'manual' | 'card';
  onMethodChange: (method: 'momo' | 'manual' | 'card') => void;
  hideCard?: boolean;
}

export function PaymentMethodSelector({ 
  selectedMethod, 
  onMethodChange, 
  hideCard = true 
}: PaymentMethodSelectorProps) {
  const methods = [
    {
      id: 'momo' as const,
      title: 'MTN MoMo',
      subtitle: 'Mobile Money',
      icon: <Smartphone size={24} color="#F59E0B" />,
      available: true,
    },
    {
      id: 'manual' as const,
      title: 'Manual Deposit',
      subtitle: 'Bank transfer or MoMo send',
      icon: <Building2 size={24} color="#10B981" />,
      available: true,
    },
    {
      id: 'card' as const,
      title: 'Card Payment',
      subtitle: 'Credit/Debit card',
      icon: <CreditCard size={24} color="#6B7280" />,
      available: false,
    },
  ].filter(method => hideCard ? method.id !== 'card' : true);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Payment Method</Text>
      <View style={styles.methodsContainer}>
        {methods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              selectedMethod === method.id && styles.methodCardActive,
              !method.available && styles.methodCardDisabled,
            ]}
            onPress={() => method.available && onMethodChange(method.id)}
            disabled={!method.available}
          >
            <View style={styles.methodIcon}>
              {method.icon}
            </View>
            <View style={styles.methodContent}>
              <Text style={[
                styles.methodTitle,
                selectedMethod === method.id && styles.methodTitleActive,
                !method.available && styles.methodTitleDisabled,
              ]}>
                {method.title}
              </Text>
              <Text style={[
                styles.methodSubtitle,
                !method.available && styles.methodSubtitleDisabled,
              ]}>
                {method.subtitle}
                {!method.available && ' (Coming Soon)'}
              </Text>
            </View>
            {selectedMethod === method.id && (
              <View style={styles.selectedIndicator} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  methodsContainer: {
    gap: 12,
  },
  methodCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  methodCardDisabled: {
    opacity: 0.5,
  },
  methodIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodContent: {
    flex: 1,
    gap: 4,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E5E7EB',
  },
  methodTitleActive: {
    color: '#FFFFFF',
  },
  methodTitleDisabled: {
    color: '#6B7280',
  },
  methodSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  methodSubtitleDisabled: {
    color: '#6B7280',
  },
  selectedIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
});