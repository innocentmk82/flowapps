import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { MoMoService, PaymentReference } from '@/services/momoService';
import { Check, X, Search, Clock, CircleAlert as AlertCircle, Building2, Smartphone } from 'lucide-react-native';

interface AdminPanelProps {
  adminId: string;
}

export function AdminPanel({ adminId }: AdminPanelProps) {
  const [pendingReferences, setPendingReferences] = useState<PaymentReference[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPendingReferences = async () => {
    try {
      const q = query(
        collection(db, 'payment_references'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const references: PaymentReference[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        references.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as PaymentReference);
      });

      setPendingReferences(references);
    } catch (error) {
      console.error('Error loading pending references:', error);
      Alert.alert('Error', 'Failed to load pending deposits');
    }
  };

  useEffect(() => {
    loadPendingReferences();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingReferences();
    setRefreshing(false);
  };

  const handleVerification = async (referenceNumber: string, approved: boolean) => {
    setLoading(true);
    try {
      const result = await MoMoService.verifyManualDeposit(referenceNumber, adminId, approved);
      
      if (result.success) {
        Alert.alert(
          'Success',
          `Deposit ${approved ? 'approved' : 'rejected'} successfully`,
          [{ text: 'OK', onPress: loadPendingReferences }]
        );
      } else {
        Alert.alert('Error', result.error || 'Verification failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredReferences = pendingReferences.filter(ref =>
    ref.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ref.amount.toString().includes(searchQuery)
  );

  const formatCurrency = (amount: number) => `SZL ${amount.toFixed(2)}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Verify Manual Deposits</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by reference or amount..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{pendingReferences.length}</Text>
          <Text style={styles.statLabel}>Pending Deposits</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {formatCurrency(pendingReferences.reduce((sum, ref) => sum + ref.amount, 0))}
          </Text>
          <Text style={styles.statLabel}>Total Amount</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.referencesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredReferences.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={48} color="#4B5563" />
            <Text style={styles.emptyTitle}>No pending deposits</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'No deposits match your search' : 'All deposits have been processed'}
            </Text>
          </View>
        ) : (
          filteredReferences.map((reference) => (
            <View key={reference.id} style={styles.referenceCard}>
              <View style={styles.referenceHeader}>
                <View style={styles.referenceInfo}>
                  <View style={styles.methodIndicator}>
                    {reference.method === 'momo_send' ? (
                      <Smartphone size={16} color="#F59E0B" />
                    ) : (
                      <Building2 size={16} color="#10B981" />
                    )}
                    <Text style={styles.methodText}>
                      {reference.method === 'momo_send' ? 'MoMo Send' : 'Bank Transfer'}
                    </Text>
                  </View>
                  <Text style={styles.referenceNumber}>{reference.referenceNumber}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Clock size={12} color="#F59E0B" />
                  <Text style={styles.statusText}>PENDING</Text>
                </View>
              </View>

              <View style={styles.referenceDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={styles.detailValue}>{formatCurrency(reference.amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {reference.createdAt.toLocaleDateString()} {reference.createdAt.toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>User ID:</Text>
                  <Text style={styles.detailValue}>{reference.userId.slice(0, 8)}...</Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleVerification(reference.referenceNumber, false)}
                  disabled={loading}
                >
                  <X size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleVerification(reference.referenceNumber, true)}
                  disabled={loading}
                >
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    padding: 24,
  },
  header: {
    marginBottom: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  referencesList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  referenceCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  referenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  referenceInfo: {
    flex: 1,
    gap: 8,
  },
  methodIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  referenceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#92400E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '600',
  },
  referenceDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rejectButton: {
    backgroundColor: '#DC2626',
  },
  approveButton: {
    backgroundColor: '#059669',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});