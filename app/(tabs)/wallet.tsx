import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentService } from '@/services/paymentService';
import { Wallet as WalletIcon, Plus, Send, FileText, Package, X, CreditCard, QrCode, Smartphone, Building2, Clock } from 'lucide-react-native';

export default function WalletScreen() {
  const { userProfile, updateWalletBalance } = useAuth();
  const [topUpAmount, setTopUpAmount] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [productCode, setProductCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showMoMoModal, setShowMoMoModal] = useState(false);
  const [showManualDepositModal, setShowManualDepositModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [depositMethod, setDepositMethod] = useState<'bank_transfer' | 'momo_send'>('momo_send');
  const [referenceNumber, setReferenceNumber] = useState('');

  const formatCurrency = (amount: number) => `SZL ${amount.toFixed(2)}`;

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > 10000) {
      Alert.alert('Error', 'Maximum top-up amount is SZL 10,000');
      return;
    }

    setLoading(true);
    try {
      const result = await PaymentService.topUpWallet(userProfile!.id, amount);
      if (result.success) {
        await updateWalletBalance(userProfile!.walletBalance + amount);
        setTopUpAmount('');
        setShowTopUpModal(false);
        Alert.alert('Success', `Wallet topped up with ${formatCurrency(amount)}`);
      } else {
        Alert.alert('Error', result.error || 'Top-up failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Top-up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMoMoPayment = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0 || !phoneNumber) {
      Alert.alert('Error', 'Please enter valid payment details');
      return;
    }

    if (amount > 10000) {
      Alert.alert('Error', 'Maximum top-up amount is SZL 10,000');
      return;
    }

    setLoading(true);
    try {
      const result = await PaymentService.processMoMoTopUp(userProfile!.id, phoneNumber, amount);
      if (result.success) {
        await updateWalletBalance(userProfile!.walletBalance + amount);
        setTopUpAmount('');
        setPhoneNumber('');
        setShowMoMoModal(false);
        Alert.alert('Success', `MoMo payment of ${formatCurrency(amount)} completed successfully`);
      } else {
        Alert.alert('Error', result.error || 'MoMo payment failed');
      }
    } catch (error) {
      Alert.alert('Error', 'MoMo payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleManualDeposit = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > 50000) {
      Alert.alert('Error', 'Maximum deposit amount is SZL 50,000');
      return;
    }

    setLoading(true);
    try {
      const result = await PaymentService.createManualDepositRequest(
        userProfile!.id,
        amount,
        depositMethod
      );
      
      if (result.success) {
        setReferenceNumber(result.referenceNumber!);
        setTopUpAmount('');
        Alert.alert(
          'Deposit Request Created',
          `Your reference number is: ${result.referenceNumber}\n\nPlease save this number and follow the payment instructions.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create deposit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create deposit request');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMoney = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0 || !receiverEmail) {
      Alert.alert('Error', 'Please enter valid payment details');
      return;
    }

    if (amount > userProfile!.walletBalance) {
      Alert.alert('Error', 'Insufficient funds');
      return;
    }

    setLoading(true);
    try {
      // Find receiver by email
      const receiverResult = await PaymentService.findUserByEmail(receiverEmail);
      if (!receiverResult.success) {
        Alert.alert('Error', 'Recipient not found');
        setLoading(false);
        return;
      }

      const result = await PaymentService.processPayment(
        userProfile!.id,
        receiverResult.userId!,
        amount,
        'payment',
        `Payment to ${receiverEmail}`,
        { receiverEmail }
      );

      if (result.success) {
        await updateWalletBalance(userProfile!.walletBalance - amount);
        setPaymentAmount('');
        setReceiverEmail('');
        setShowPaymentModal(false);
        Alert.alert('Success', `Payment of ${formatCurrency(amount)} sent successfully`);
      } else {
        Alert.alert('Error', result.error || 'Payment failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoicePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0 || !invoiceId) {
      Alert.alert('Error', 'Please enter valid invoice details');
      return;
    }

    if (amount > userProfile!.walletBalance) {
      Alert.alert('Error', 'Insufficient funds');
      return;
    }

    setLoading(true);
    try {
      // For demo, we'll create a mock merchant ID
      // In production, you'd look up the invoice to find the merchant
      const mockMerchantId = 'demo-merchant-' + invoiceId.slice(-4);
      
      const result = await PaymentService.processPayment(
        userProfile!.id,
        mockMerchantId,
        amount,
        'invoice',
        `Invoice Payment - ${invoiceId}`,
        { invoiceId }
      );

      if (result.success) {
        await updateWalletBalance(userProfile!.walletBalance - amount);
        setPaymentAmount('');
        setInvoiceId('');
        setShowInvoiceModal(false);
        Alert.alert('Success', `Invoice ${invoiceId} paid successfully`);
      } else {
        Alert.alert('Error', result.error || 'Payment failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Invoice payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProductPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0 || !productCode) {
      Alert.alert('Error', 'Please enter valid product details');
      return;
    }

    if (amount > userProfile!.walletBalance) {
      Alert.alert('Error', 'Insufficient funds');
      return;
    }

    setLoading(true);
    try {
      // For demo, we'll create a mock merchant ID based on product code
      const mockMerchantId = 'demo-merchant-' + productCode.slice(-4);
      
      const result = await PaymentService.processPayment(
        userProfile!.id,
        mockMerchantId,
        amount,
        'product',
        `Product Purchase - ${productCode}`,
        { productCode }
      );

      if (result.success) {
        await updateWalletBalance(userProfile!.walletBalance - amount);
        setPaymentAmount('');
        setProductCode('');
        setShowProductModal(false);
        Alert.alert('Success', `Product ${productCode} purchased successfully`);
      } else {
        Alert.alert('Error', result.error || 'Payment failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Product payment failed');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = (modalSetter: (value: boolean) => void) => {
    setTopUpAmount('');
    setPaymentAmount('');
    setReceiverEmail('');
    setInvoiceId('');
    setProductCode('');
    setPhoneNumber('');
    setReferenceNumber('');
    modalSetter(false);
  };

  if (!userProfile) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity style={styles.profileButton}>
          <WalletIcon size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <WalletIcon size={24} color="#3B82F6" />
          </View>
          <Text style={styles.balanceValue}>{formatCurrency(userProfile.walletBalance)}</Text>
          <Text style={styles.balanceSubtext}>PayFlow Wallet</Text>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowMoMoModal(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
              <Smartphone size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>MoMo Pay</Text>
            <Text style={styles.actionSubtitle}>MTN Mobile Money</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowManualDepositModal(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
              <Building2 size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>Manual Deposit</Text>
            <Text style={styles.actionSubtitle}>Bank transfer or MoMo send</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowPaymentModal(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#3B82F6' }]}>
              <Send size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>Send Money</Text>
            <Text style={styles.actionSubtitle}>Transfer to another user</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowInvoiceModal(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#8B5CF6' }]}>
              <FileText size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>Pay Invoice</Text>
            <Text style={styles.actionSubtitle}>Pay business invoice</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => setShowProductModal(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F59E0B' }]}>
              <Package size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.actionTitle}>Buy Products</Text>
            <Text style={styles.actionSubtitle}>Pay for goods</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Wallet Features</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Instant transactions</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Secure Firebase encryption</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Real-time balance updates</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Transaction history tracking</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* MoMo Payment Modal */}
      <Modal visible={showMoMoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>MoMo Payment</Text>
              <TouchableOpacity onPress={() => resetModal(setShowMoMoModal)}>
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="+268 7612 3456 or 76123456"
                placeholderTextColor="#6B7280"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
              
              <Text style={styles.inputLabel}>Amount (SZL)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter amount"
                placeholderTextColor="#6B7280"
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="numeric"
              />
              
              <View style={styles.quickAmounts}>
                {['50', '100', '200', '500'].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => setTopUpAmount(amount)}
                  >
                    <Text style={styles.quickAmountText}>SZL {amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.modalButton, loading && styles.buttonDisabled]}
                onPress={handleMoMoPayment}
                disabled={loading}
              >
                <Smartphone size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>
                  {loading ? 'Processing MoMo...' : 'Pay with MoMo'}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.paymentNote}>
                You will receive an MTN MoMo prompt on your phone to authorize the payment.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* Manual Deposit Modal */}
      <Modal visible={showManualDepositModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Deposit</Text>
              <TouchableOpacity onPress={() => resetModal(setShowManualDepositModal)}>
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Deposit Method</Text>
              <View style={styles.methodSelector}>
                <TouchableOpacity
                  style={[styles.methodButton, depositMethod === 'momo_send' && styles.methodButtonActive]}
                  onPress={() => setDepositMethod('momo_send')}
                >
                  <Smartphone size={20} color={depositMethod === 'momo_send' ? '#FFFFFF' : '#9CA3AF'} />
                  <Text style={[styles.methodButtonText, depositMethod === 'momo_send' && styles.methodButtonTextActive]}>
                    MoMo Send
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.methodButton, depositMethod === 'bank_transfer' && styles.methodButtonActive]}
                  onPress={() => setDepositMethod('bank_transfer')}
                >
                  <Building2 size={20} color={depositMethod === 'bank_transfer' ? '#FFFFFF' : '#9CA3AF'} />
                  <Text style={[styles.methodButtonText, depositMethod === 'bank_transfer' && styles.methodButtonTextActive]}>
                    Bank Transfer
                  </Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>Amount (SZL)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter amount"
                placeholderTextColor="#6B7280"
                value={topUpAmount}
                onChangeText={setTopUpAmount}
                keyboardType="numeric"
              />
              
              <View style={styles.quickAmounts}>
                {['100', '500', '1000', '5000'].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => setTopUpAmount(amount)}
                  >
                    <Text style={styles.quickAmountText}>SZL {amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {referenceNumber ? (
                <View style={styles.referenceCard}>
                  <Text style={styles.referenceTitle}>Reference Number Generated</Text>
                  <Text style={styles.referenceNumber}>{referenceNumber}</Text>
                  <Text style={styles.referenceInstructions}>
                    {depositMethod === 'momo_send' 
                      ? 'Send money to +268 7612 3456 using MTN MoMo with this reference number in the description.'
                      : 'Transfer to Account: 1234567890, Bank: Standard Bank, Reference: ' + referenceNumber
                    }
                  </Text>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => {
                      // In production, you'd use Clipboard API
                      Alert.alert('Copied', 'Reference number copied to clipboard');
                    }}
                  >
                    <Text style={styles.copyButtonText}>Copy Reference</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.modalButton, loading && styles.buttonDisabled]}
                  onPress={handleManualDeposit}
                  disabled={loading}
                >
                  <Clock size={20} color="#FFFFFF" />
                  <Text style={styles.modalButtonText}>
                    {loading ? 'Generating...' : 'Generate Reference'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Send Money Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Money</Text>
              <TouchableOpacity onPress={() => resetModal(setShowPaymentModal)}>
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Recipient Email</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter email address"
                placeholderTextColor="#6B7280"
                value={receiverEmail}
                onChangeText={setReceiverEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <Text style={styles.inputLabel}>Amount (SZL)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter amount"
                placeholderTextColor="#6B7280"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
              />

              <View style={styles.balanceInfo}>
                <Text style={styles.balanceInfoText}>
                  Available: {formatCurrency(userProfile.walletBalance)}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, loading && styles.buttonDisabled]}
                onPress={handleSendMoney}
                disabled={loading}
              >
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>
                  {loading ? 'Sending...' : 'Send Money'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pay Invoice Modal */}
      <Modal visible={showInvoiceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pay Invoice</Text>
              <TouchableOpacity onPress={() => resetModal(setShowInvoiceModal)}>
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Invoice ID</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter invoice ID (e.g., INV-2024-001)"
                placeholderTextColor="#6B7280"
                value={invoiceId}
                onChangeText={setInvoiceId}
              />
              
              <Text style={styles.inputLabel}>Amount (SZL)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter amount"
                placeholderTextColor="#6B7280"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
              />

              <View style={styles.balanceInfo}>
                <Text style={styles.balanceInfoText}>
                  Available: {formatCurrency(userProfile.walletBalance)}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, loading && styles.buttonDisabled]}
                onPress={handleInvoicePayment}
                disabled={loading}
              >
                <FileText size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>
                  {loading ? 'Processing...' : 'Pay Invoice'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Buy Products Modal */}
      <Modal visible={showProductModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buy Products</Text>
              <TouchableOpacity onPress={() => resetModal(setShowProductModal)}>
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Product Code</Text>
              <View style={styles.productCodeContainer}>
                <TextInput
                  style={styles.productCodeInput}
                  placeholder="Enter product code (e.g., PROD-001)"
                  placeholderTextColor="#6B7280"
                  value={productCode}
                  onChangeText={setProductCode}
                />
                <TouchableOpacity style={styles.scanButton}>
                  <QrCode size={20} color="#3B82F6" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.inputLabel}>Amount (SZL)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter amount"
                placeholderTextColor="#6B7280"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
              />

              <View style={styles.balanceInfo}>
                <Text style={styles.balanceInfoText}>
                  Available: {formatCurrency(userProfile.walletBalance)}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, loading && styles.buttonDisabled]}
                onPress={handleProductPayment}
                disabled={loading}
              >
                <Package size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonText}>
                  {loading ? 'Processing...' : 'Buy Product'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  balanceCard: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  balanceValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  balanceSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  actionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    width: '47%',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  featureList: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  featureText: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 20,
    gap: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  productCodeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  productCodeInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  scanButton: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  quickAmountButton: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  quickAmountText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  balanceInfo: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
  },
  balanceInfoText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  methodButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  methodButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  methodButtonText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  methodButtonTextActive: {
    color: '#FFFFFF',
  },
  referenceCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  referenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  referenceNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  referenceInstructions: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 20,
  },
  copyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});