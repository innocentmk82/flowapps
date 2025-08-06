import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { userService } from '../lib/dataService';
import { User } from '../types';
import { convertFirestoreTimestampToDate } from '../lib/utils';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, companyId: string, role: 'admin' | 'seller' | 'manager') => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean; // true for both 'admin' and 'manager'
  isSeller: boolean;
  isManager: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const userProfile = await userService.getCurrentUser(user.uid);
          if (userProfile) {
            setUserProfile(userProfile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string, companyId: string, role: 'admin' | 'seller' | 'manager') => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    const userProfile: User = {
      uid: user.uid,
      email: user.email!,
      displayName,
      role,
      companyId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);
    setUserProfile(userProfile);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'manager';
  const isSeller = userProfile?.role === 'seller';
  const isManager = userProfile?.role === 'manager';

  const value = {
    currentUser,
    userProfile,
    signIn,
    signUp,
    signOut,
    loading,
    isAdmin,
    isSeller,
    isManager
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};