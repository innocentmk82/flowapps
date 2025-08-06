import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { RealTimeService } from '@/services/realTimeService';
import { Transaction } from '@/types';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  FileText, 
  Package, 
  Filter,
  Search,
  Calendar,
  DollarSign
} from 'lucide-react-native';

export default function TransactionsScreen() {
  const { userProfile } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received' | 'topup'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    // Subscribe to real-time transactions
    const unsubscribe = RealTimeService.subscribeToUserTransactions(
      userProfile.id,
      (newTransactions) => {
        setTransactions(newTransactions);
      }
    );

    return unsubscribe;
  }, [userProfile]);

  useEffect(() => {
    // Apply filters and search
    let filtered = transactions;

    // Apply type filter
    if (filter === 'sent') {
      filtered = filtered.filter(t => t.payerId === userProfile?.id && t.type !== 'topup');
    } else if (filter === 'received') {
      filtered = filtered.filter(t => t.receiverId === userProfile?.id && t.payerId !== userProfile?.id);
    } else if (filter === 'topup') {
      filtered = filtered.filter(t => t.type === 'topup');
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.amount.toString().includes(searchQuery)
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, filter, searchQuery, userProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatCurrency = (amount: number) => `SZL ${amount.toFixed(2)}`;

  const getTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'topup':
        return <TrendingUp size={20} color="#10B981" />;
      case 'invoice':
        return <FileText size={20} color="#8B5CF6" />;
      case 'product':
        return <Package size={20} color="#F59E0B" />;
      default:
        return transaction.payerId === userProfile?.id ? 
          <ArrowUpRight size={20} color="#EF4444" /> : 
          <ArrowDownLeft size={20} color="#10B981" />;
    }
  };

  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.type === 'topup') return '#10B981';
    return transaction.payerId === userProfile?.id ? '#EF4444' : '#10B981';
  };

  const getTransactionAmount = (transaction: Transaction) => {
    if (transaction.type === 'topup') return `+${formatCurrency(transaction.amount)}`;
    const isOutgoing = transaction.payerId === userProfile?.id;
    return `${isOutgoing ? '-' : '+'}${formatCurrency(transaction.amount)}`;
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'topup': return 'TOP UP';
      case 'invoice': return 'INVOICE';
      case 'product': return 'PRODUCT';
      case 'payment': return 'TRANSFER';
      default: return type.toUpperCase();
    }
  };

  if (!userProfile) return null;

  const totalSpent = transactions
    .filter(t => t.payerId === userProfile.id && t.type !== 'topup')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalReceived = transactions
    .filter(t => t.receiverId === userProfile.id && t.payerId !== userProfile.id)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTopUps = transactions
    .filter(t => t.type === 'topup')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Search size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Filter size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {showSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      <View style={styles.summaryCards}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatCurrency(totalTopUps)}</Text>
          <Text style={styles.summaryLabel}>Total Top-ups</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
          <Text style={styles.summaryLabel}>Total Spent</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatCurrency(totalReceived)}</Text>
          <Text style={styles.summaryLabel}>Total Received</Text>
        </View>
      </View>

      <View style={styles.filterTabs}>
        {[
          { key: 'all', label: 'All' },
          { key: 'sent', label: 'Sent' },
          { key: 'received', label: 'Received' },
          { key: 'topup', label: 'Top-ups' }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key as any)}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.transactionsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <History size={48} color="#4B5563" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching transactions' : 'No transactions yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'Your transaction history will appear here'}
            </Text>
          </View>
        ) : (
          filteredTransactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionCard}>
              <View style={styles.transactionIcon}>
                {getTransactionIcon(transaction)}
              </View>
              
              <View style={styles.transactionContent}>
                <Text style={styles.transactionTitle}>{transaction.description}</Text>
                <Text style={styles.transactionDate}>
                  {transaction.createdAt.toLocaleDateString()} • {transaction.createdAt.toLocaleTimeString()}
                </Text>
                <View style={styles.transactionMeta}>
                  <Text style={styles.transactionType}>
                    {getTransactionTypeLabel(transaction.type)}
                  </Text>
                  <View style={[styles.statusBadge, 
                    transaction.status === 'completed' ? styles.statusCompleted : 
                    transaction.status === 'pending' ? styles.statusPending : styles.statusFailed
                  ]}>
                    <Text style={[styles.statusText,
                      transaction.status === 'completed' ? styles.statusCompletedText : 
                      transaction.status === 'pending' ? styles.statusPendingText : styles.statusFailedText
                    ]}>
                      {transaction.status}
                    </Text>
                  </View>
                </View>
              </View>
              
              <Text style={[styles.transactionAmount, { color: getTransactionColor(transaction) }]}>
                {getTransactionAmount(transaction)}
              </Text>
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
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
  },
  summaryCards: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  transactionCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  transactionIcon: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionContent: {
    flex: 1,
    gap: 4,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  transactionType: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: '#065F46',
  },
  statusPending: {
    backgroundColor: '#92400E',
  },
  statusFailed: {
    backgroundColor: '#7F1D1D',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusCompletedText: {
    color: '#10B981',
  },
  statusPendingText: {
    color: '#F59E0B',
  },
  statusFailedText: {
    color: '#EF4444',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});