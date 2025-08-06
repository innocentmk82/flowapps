import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Wallet } from 'lucide-react-native';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Wallet size={64} color="#3B82F6" />
        <Text style={styles.title}>PayFlow</Text>
        <Text style={styles.subtitle}>Digital Wallet for Business</Text>
        <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  loader: {
    marginTop: 16,
  },
});