import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBm8SHIrCzk83c0vpzNNiyuEEDyLaXOC54",
  authDomain: "fintech-abb00.firebaseapp.com",
  projectId: "fintech-abb00",
  storageBucket: "fintech-abb00.firebasestorage.app",
  messagingSenderId: "665236816814",
  appId: "1:665236816814:web:c2f80dea637f25d0d4fe3f",
  measurementId: "G-SN5DMV97FT"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence for mobile
let auth;
try {
  if (Platform.OS !== 'web') {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    auth = getAuth(app);
  }
} catch (error) {
  // If already initialized, get the existing instance
  auth = getAuth(app);
}

export const db = getFirestore(app);
export const functions = getFunctions(app);
export { auth };
export default app;