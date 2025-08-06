import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';

export class AuthService {
  /**
   * Register a new user
   */
  static async register(
    email: string, 
    password: string, 
    profile: User['profile'],
    role: 'admin' | 'general_user' = 'general_user',
    appPermissions: Partial<User['permissions']> = {}
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Create user profile in Firestore
      const userData: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        role,
        profile,
        walletBalance: role === 'general_user' ? 100 : 0, // Welcome bonus for general users
        isActive: true,
        permissions: {
          payflow: true, // Everyone gets PayFlow access
          invoiceflow: role === 'admin' || appPermissions.invoiceflow || false,
          stockflow: role === 'admin' || appPermissions.stockflow || false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      };
    }
  }

  /**
   * Sign in user
   */
  static async signIn(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get user profile from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        return { success: false, error: 'User profile not found' };
      }
      
      const userData = userDoc.data() as User;
      
      if (!userData.isActive) {
        await signOut(auth);
        return { success: false, error: 'Account is deactivated' };
      }
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      };
    }
  }

  /**
   * Sign out user
   */
  static async signOut(): Promise<void> {
    await signOut(auth);
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      return { id: userDoc.id, ...userDoc.data() } as User;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Profile update failed' 
      };
    }
  }

  /**
   * Check app permissions
   */
  static async hasAppPermission(userId: string, app: 'payflow' | 'invoiceflow' | 'stockflow'): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return false;
      }
      
      const userData = userDoc.data() as User;
      return userData.permissions[app] || false;
    } catch (error) {
      console.error('Error checking app permission:', error);
      return false;
    }
  }

  /**
   * Grant app permissions (admin only)
   */
  static async grantAppPermission(
    adminId: string, 
    userId: string, 
    app: 'invoiceflow' | 'stockflow'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify admin permissions
      const adminDoc = await getDoc(doc(db, 'users', adminId));
      if (!adminDoc.exists() || adminDoc.data()?.role !== 'admin') {
        return { success: false, error: 'Unauthorized' };
      }
      
      // Update user permissions
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        [`permissions.${app}`]: true,
        updatedAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error granting app permission:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Permission grant failed' 
      };
    }
  }

  /**
   * Auth state listener
   */
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            callback({ id: userDoc.id, ...userData });
          } else {
            callback(null);
          }
        } catch (error) {
          console.error('Error getting user data:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }
}