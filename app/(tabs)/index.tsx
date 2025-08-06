import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentService } from '@/services/paymentService';
import { RealTimeService } from '@/services/realTimeService';
import { Transaction } from '@/types';
import { 
  FileText, 
  DollarSign, 
  Clock, 
  Users, 
  Bell, 
  Sun, 
  User as UserIcon,
  TrendingUp,
  Plus,
  Send,
  Package,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react-native';

export default function DashboardScreen() {
  const { userProfile, logout } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    totalClients: 0,
  });

  useEffect(() => {
    if (!userProfile) return;

    // Subscribe to real-time transactions
    const unsubscribe = RealTimeService.subscribeToUserTransactions(
      userProfile.id,
      (newTransactions) => {
        setTransactions(newTransactions);
        
        if (userProfile.role === 'merchant') {
          // Calculate merchant stats
          const receivedTransactions = newTransactions.filter(
            t => t.receiverId === userProfile.id && t.status === 'completed'
          );
          const totalRevenue = receivedTransactions.reduce((sum, t) => sum + t.amount, 0);
          const invoiceTransactions = receivedTransactions.filter(t => t.type === 'invoice');
          const productTransactions = receivedTransactions.filter(t => t.type === 'product');
          const uniqueClients = new Set(receivedTransactions.map(t => t.payerId)).size;

          setStats({
            totalInvoices: invoiceTransactions.length,
            totalRevenue,
            pendingAmount: 0, // For demo purposes
            totalClients: uniqueClients,
          });
        }
      }
    );

    return unsubscribe;
  }, [userProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (!userProfile) return null;

  const formatCurrency = (amount: number) => `SZL ${amount.toFixed(2)}`;

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'topup') {
      return <TrendingUp size={20} color="#10B981" />;
    }
    return transaction.payerId === userProfile.id ? 
      <ArrowUpRight size={20} color="#EF4444" /> : 
      <ArrowDownLeft size={20} color="#10B981" />;
  };

  const getTransactionAmount = (transaction: Transaction) => {
    if (transaction.type === 'topup') {
      return `+${formatCurrency(transaction.amount)}`;
    }
    const isOutgoing = transaction.payerId === userProfile.id;
    return `${isOutgoing ? '-' : '+'}${formatCurrency(transaction.amount)}`;
  };

  const getTransactionColor = (transaction: Transaction) => {
    if (transaction.type === 'topup') return '#10B981';
    return transaction.payerId === userProfile.id ? '#EF4444' : '#10B981';
  };

  const renderMerchantDashboard = () => (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.menuButton}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Sun size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={logout}>
            <UserIcon size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.merchantWelcome}>
        <Text style={styles.merchantWelcomeText}>Welcome back, {userProfile.firstName}!</Text>
        <Text style={styles.merchantWelcomeSubtext}>
          {userProfile.businessName || 'Your Business'} • Merchant Account
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <View style={styles.statText}>
              <Text style={styles.statLabel}>Total Invoices</Text>
              <Text style={styles.statValue}>{stats.totalInvoices}</Text>
              <Text style={styles.statChange}>InvoiceFlow integration</Text>
            </View>
            <View style={[styles.statIcon, { backgroundColor: '#8B5CF6' }]}>
              <FileText size={24} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <View style={styles.statText}>
              <Text style={styles.statLabel}>Total Revenue</Text>
              <Text style={styles.statValue}>{formatCurrency(stats.totalRevenue)}</Text>
              <Text style={styles.statChange}>All-time earnings</Text>
            </View>
            <View style={[styles.statIcon, { backgroundColor: '#059669' }]}>
              <DollarSign size={24} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <View style={styles.statText}>
              <Text style={styles.statLabel}>Wallet Balance</Text>
              <Text style={styles.statValue}>{formatCurrency(userProfile.walletBalance)}</Text>
              <Text style={styles.statChange}>Available funds</Text>
            </View>
            <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
              <Clock size={24} color="#FFFFFF" />
            </View>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statContent}>
            <View style={styles.statText}>
              <Text style={styles.statLabel}>Total Clients</Text>
              <Text style={styles.statValue}>{stats.totalClients}</Text>
              <Text style={styles.statChange}>Unique customers</Text>
            </View>
            <View style={[styles.statIcon, { backgroundColor: '#7C3AED' }]}>
              <Users size={24} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Payments</Text>
        {transactions.slice(0, 5).map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionIcon}>
              {getTransactionIcon(transaction)}
            </View>
            <View style={styles.transactionContent}>
              <Text style={styles.transactionTitle}>{transaction.description}</Text>
              <Text style={styles.transactionDate}>
                {transaction.createdAt.toLocaleDateString()} • {transaction.createdAt.toLocaleTimeString()}
              </Text>
            </View>
            <Text style={[
              styles.transactionAmount,
              { color: getTransactionColor(transaction) }
            ]}>
              {getTransactionAmount(transaction)}
            </Text>
          </View>
        ))}
        {transactions.length === 0 && (
          <View style={styles.emptyState}>
            <FileText size={48} color="#4B5563" />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Payments will appear here</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderClientDashboard = () => (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.menuButton}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Sun size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileButton} onPress={logout}>
            <UserIcon size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome back, {userProfile.firstName}!</Text>
        <Text style={styles.welcomeSubtext}>Here's your account overview</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Wallet Balance</Text>
        <Text style={styles.balanceValue}>{formatCurrency(userProfile.walletBalance)}</Text>
        <Text style={styles.balanceSubtext}>PayFlow Digital Wallet</Text>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]}>
          <Plus size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Top Up</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}>
          <Send size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Send Money</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}>
          <FileText size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Pay Invoice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}>
          <Package size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Buy Products</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {transactions.slice(0, 8).map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionIcon}>
              {getTransactionIcon(transaction)}
            </View>
            <View style={styles.transactionContent}>
              <Text style={styles.transactionTitle}>{transaction.description}</Text>
              <Text style={styles.transactionDate}>
                {transaction.createdAt.toLocaleDateString()} • {transaction.createdAt.toLocaleTimeString()}
              </Text>
            </View>
            <Text style={[
              styles.transactionAmount,
              { color: getTransactionColor(transaction) }
            ]}>
              {getTransactionAmount(transaction)}
            </Text>
          </View>
        ))}
        {transactions.length === 0 && (
          <View style={styles.emptyState}>
            <DollarSign size={48} color="#4B5563" />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Start by topping up your wallet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  return userProfile.role === 'merchant' ? renderMerchantDashboard() : renderClientDashboard();
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuButton: {
    gap: 3,
  },
  menuLine: {
    width: 20,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  profileButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  merchantWelcome: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  merchantWelcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  merchantWelcomeSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  welcomeSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  balanceCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  actionButton: {
    width: '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statText: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    color: '#6B7280',
  },
  statIcon: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    gap: 12,
  },
  transactionIcon: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 8,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});