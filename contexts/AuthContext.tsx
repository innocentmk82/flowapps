import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../shared/config/firebase';
import { RealTimeService } from '@/services/realTimeService';
import { User } from '../shared/types';
import { AuthService } from '../shared/services/authService';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: 'admin' | 'general_user', profile: User['profile']) => Promise<void>;
  logout: () => Promise<void>;
  updateWalletBalance: (newBalance: number) => Promise<void>;
  hasAppPermission: (app: 'payflow' | 'invoiceflow' | 'stockflow') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (user) {
        setUser({ uid: user.id, email: user.email } as FirebaseUser);
        setUserProfile(user);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await AuthService.signIn(email, password);
    if (!result.success) {
      throw new Error(result.error || 'Login failed');
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: 'admin' | 'general_user',
    profile: User['profile']
  ) => {
    const result = await AuthService.register(email, password, profile, role, {
      payflow: true, // Everyone gets PayFlow access
      invoiceflow: role === 'admin',
      stockflow: role === 'admin'
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Signup failed');
    }
  };

  const logout = async () => {
    await AuthService.signOut();
  };

  const updateWalletBalance = async (newBalance: number) => {
    if (user && userProfile) {
      try {
        await AuthService.updateProfile(user.uid, {
          walletBalance: newBalance
        });
        
        // The real-time listener will update the userProfile automatically
      } catch (error) {
        console.error('Error updating wallet balance:', error);
      }
    }
  };

  const hasAppPermission = (app: 'payflow' | 'invoiceflow' | 'stockflow'): boolean => {
    return userProfile?.permissions[app] || false;
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
      hasAppPermission,
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