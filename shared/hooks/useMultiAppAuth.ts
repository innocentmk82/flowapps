import { useState, useEffect } from 'react';
import { AuthService } from '../services/authService';
import { User } from '../types';

interface MultiAppAuthState {
  user: User | null;
  loading: boolean;
  hasPayFlowAccess: boolean;
  hasInvoiceFlowAccess: boolean;
  hasStockFlowAccess: boolean;
}

/**
 * Shared authentication hook for all apps
 * Provides consistent auth state and permissions across PayFlow, InvoiceFlow, and StockFlow
 */
export const useMultiAppAuth = (requiredApp?: 'payflow' | 'invoiceflow' | 'stockflow') => {
  const [authState, setAuthState] = useState<MultiAppAuthState>({
    user: null,
    loading: true,
    hasPayFlowAccess: false,
    hasInvoiceFlowAccess: false,
    hasStockFlowAccess: false
  });

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      if (user) {
        setAuthState({
          user,
          loading: false,
          hasPayFlowAccess: user.permissions.payflow,
          hasInvoiceFlowAccess: user.permissions.invoiceflow,
          hasStockFlowAccess: user.permissions.stockflow
        });
      } else {
        setAuthState({
          user: null,
          loading: false,
          hasPayFlowAccess: false,
          hasInvoiceFlowAccess: false,
          hasStockFlowAccess: false
        });
      }
    });

    return unsubscribe;
  }, []);

  // Check if user has access to required app
  const hasRequiredAccess = () => {
    if (!requiredApp || !authState.user) return true;
    
    switch (requiredApp) {
      case 'payflow':
        return authState.hasPayFlowAccess;
      case 'invoiceflow':
        return authState.hasInvoiceFlowAccess;
      case 'stockflow':
        return authState.hasStockFlowAccess;
      default:
        return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    const result = await AuthService.signIn(email, password);
    
    if (result.success && requiredApp && result.user) {
      // Check if user has access to the required app
      if (!result.user.permissions[requiredApp]) {
        await AuthService.signOut();
        throw new Error(`You don't have access to ${requiredApp.charAt(0).toUpperCase() + requiredApp.slice(1)}`);
      }
    }
    
    return result;
  };

  const signUp = async (
    email: string, 
    password: string, 
    profile: User['profile'],
    role: 'admin' | 'general_user' = 'general_user',
    appPermissions: Partial<User['permissions']> = {}
  ) => {
    return AuthService.register(email, password, profile, role, appPermissions);
  };

  const signOut = async () => {
    await AuthService.signOut();
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!authState.user) {
      throw new Error('No user logged in');
    }
    
    return AuthService.updateProfile(authState.user.id, updates);
  };

  return {
    ...authState,
    hasRequiredAccess: hasRequiredAccess(),
    signIn,
    signUp,
    signOut,
    updateProfile,
    isAdmin: authState.user?.role === 'admin',
    isGeneralUser: authState.user?.role === 'general_user'
  };
};