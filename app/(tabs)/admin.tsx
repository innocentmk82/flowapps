import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { AdminPanel } from '@/components/AdminPanel';
import { LoadingScreen } from '@/components/LoadingScreen';

export default function AdminScreen() {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!userProfile) {
    return null;
  }

  return (
    <View style={styles.container}>
      <AdminPanel adminId={userProfile.id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
});