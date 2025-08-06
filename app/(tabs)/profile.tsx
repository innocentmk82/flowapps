import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Share } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Shield, Bell, Moon, CircleHelp as HelpCircle, LogOut, ChevronRight, Settings, CreditCard, FileText, Download, ChartBar as BarChart } from 'lucide-react-native';

export default function ProfileScreen() {
  const { userProfile, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const reportData = `PayFlow Account Report
Name: ${userProfile?.firstName} ${userProfile?.lastName}
Email: ${userProfile?.email}
Role: ${userProfile?.role}
Wallet Balance: SZL ${userProfile?.walletBalance.toFixed(2)}
Account Created: ${userProfile?.createdAt.toLocaleDateString()}

Generated on: ${new Date().toLocaleDateString()}`;

      await Share.share({
        message: reportData,
        title: 'PayFlow Account Report',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleGenerateReport = () => {
    Alert.alert(
      'Generate Report',
      'What type of report would you like to generate?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Transaction History', onPress: handleExportData },
        { text: 'Account Summary', onPress: handleExportData },
      ]
    );
  };

  if (!userProfile) return null;

  const menuItems = [
    {
      icon: <CreditCard size={20} color="#9CA3AF" />,
      title: 'Payment Methods',
      subtitle: 'Manage your cards and accounts',
      onPress: () => Alert.alert('Coming Soon', 'Payment methods management will be available soon'),
    },
    {
      icon: <FileText size={20} color="#9CA3AF" />,
      title: 'Transaction Receipts',
      subtitle: 'Download payment receipts',
      onPress: () => Alert.alert('Coming Soon', 'Receipt downloads will be available soon'),
    },
    {
      icon: <BarChart size={20} color="#9CA3AF" />,
      title: 'Generate Reports',
      subtitle: 'Export transaction data',
      onPress: handleGenerateReport,
    },
    {
      icon: <Download size={20} color="#9CA3AF" />,
      title: 'Export Data',
      subtitle: 'Download your account data',
      onPress: handleExportData,
    },
    {
      icon: <Shield size={20} color="#9CA3AF" />,
      title: 'Security',
      subtitle: 'Manage your account security',
      onPress: () => Alert.alert('Security', 'Your account is protected by Firebase Authentication'),
    },
    {
      icon: <HelpCircle size={20} color="#9CA3AF" />,
      title: 'Help & Support',
      subtitle: 'Get help with your account',
      onPress: () => Alert.alert('Support', 'For support, please contact: support@payflow.sz'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Settings size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <User size={32} color="#FFFFFF" />
            </View>
            <View style={styles.roleIndicator}>
              <Text style={styles.roleText}>
                {userProfile.role === 'merchant' ? 'M' : 'C'}
              </Text>
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {userProfile.firstName} {userProfile.lastName}
            </Text>
            <Text style={styles.profileRole}>
              {userProfile.role === 'merchant' ? 'Merchant Account' : 'Client Account'}
            </Text>
            {userProfile.businessName && (
              <Text style={styles.businessName}>{userProfile.businessName}</Text>
            )}
            <View style={styles.emailContainer}>
              <Mail size={16} color="#9CA3AF" />
              <Text style={styles.profileEmail}>{userProfile.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.walletSummary}>
          <Text style={styles.walletTitle}>Wallet Summary</Text>
          <View style={styles.walletStats}>
            <View style={styles.walletStat}>
              <Text style={styles.walletStatValue}>SZL {userProfile.walletBalance.toFixed(2)}</Text>
              <Text style={styles.walletStatLabel}>Current Balance</Text>
            </View>
            <View style={styles.walletStat}>
              <Text style={styles.walletStatValue}>
                {userProfile.role === 'merchant' ? 'Business' : 'Personal'}
              </Text>
              <Text style={styles.walletStatLabel}>Account Type</Text>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Bell size={20} color="#9CA3AF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingSubtitle}>Receive payment alerts</Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#374151', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Moon size={20} color="#9CA3AF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingSubtitle}>Toggle dark theme</Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#374151', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuLeft}>
                {item.icon}
                <View style={styles.menuText}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#4B5563" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>PayFlow v1.0.0</Text>
          <Text style={styles.footerSubtext}>Secure digital wallet for businesses</Text>
          <Text style={styles.footerSubtext}>Built with Firebase & React Native</Text>
        </View>
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
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  profileCard: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#3B82F6',
    borderRadius: 40,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1F2937',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileInfo: {
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileRole: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  businessName: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '600',
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  walletSummary: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  walletTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  walletStats: {
    flexDirection: 'row',
    gap: 24,
  },
  walletStat: {
    flex: 1,
  },
  walletStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  walletStatLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  settingItem: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  settingText: {
    gap: 2,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  menuSection: {
    marginBottom: 32,
  },
  menuItem: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuText: {
    gap: 2,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  logoutButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
});