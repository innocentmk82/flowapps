import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Shared Firebase configuration for all apps
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBm8SHIrCzk83c0vpzNNiyuEEDyLaXOC54",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "fintech-abb00.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "fintech-abb00",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "fintech-abb00.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "665236816814",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:665236816814:web:c2f80dea637f25d0d4fe3f",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-SN5DMV97FT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// App-specific configurations
export const APP_CONFIGS = {
  payflow: {
    name: 'PayFlow',
    baseUrl: process.env.PAYFLOW_BASE_URL || 'https://payflow.sz',
    features: {
      walletManagement: true,
      paymentProcessing: true,
      adminDashboard: true,
      userManagement: true
    }
  },
  invoiceflow: {
    name: 'InvoiceFlow',
    baseUrl: process.env.INVOICEFLOW_BASE_URL || 'https://invoices.payflow.sz',
    features: {
      invoiceManagement: true,
      clientManagement: true,
      paymentIntegration: true,
      pdfGeneration: true
    }
  },
  stockflow: {
    name: 'StockFlow',
    baseUrl: process.env.STOCKFLOW_BASE_URL || 'https://stock.payflow.sz',
    features: {
      inventoryManagement: true,
      orderManagement: true,
      paymentIntegration: true,
      barcodeScanning: true
    }
  }
};

export default app;