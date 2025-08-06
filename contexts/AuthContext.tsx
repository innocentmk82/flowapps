import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { RealTimeService } from '@/services/realTimeService';
import { User } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: 'client' | 'merchant', firstName: string, lastName: string, businessName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateWalletBalance: (newBalance: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Subscribe to real-time user profile updates
        const unsubscribeProfile = RealTimeService.subscribeToUserProfile(
          firebaseUser.uid,
          (profile) => {
            setUserProfile(profile);
            setLoading(false);
          }
        );

        return unsubscribeProfile;
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    role: 'client' | 'merchant', 
    firstName: string, 
    lastName: string,
    businessName?: string
  ) => {
    try {
      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      const userData: Omit<User, 'id'> = {
        email,
        role,
        firstName,
        lastName,
        businessName: role === 'merchant' ? businessName : undefined,
        walletBalance: role === 'client' ? 100 : 0, // Give clients SZL 100 to start
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    } catch (error: any) {
      throw new Error(error.message || 'Signup failed');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateWalletBalance = async (newBalance: number) => {
    if (user && userProfile) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          walletBalance: newBalance,
          updatedAt: new Date(),
        });
        
        // The real-time listener will update the userProfile automatically
      } catch (error) {
        console.error('Error updating wallet balance:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signIn,
      signUp,
      logout,
      updateWalletBalance,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}