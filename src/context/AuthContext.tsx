import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  sendPasswordResetEmail,
  deleteUser,
} from 'firebase/auth';
import { auth, db } from '@/integrations/firebase/client';
import { doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { authAPI } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role?: 'owner' | 'resident', referralCode?: string, phoneNumber?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<UserProfile | null>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  userProfile: UserProfile | null;
  // OTP functions for two-step authentication (no CAPTCHA)
  sendOTP: (phoneNumber: string) => Promise<{ success: boolean; message: string; otp?: string }>;
  verifyOTP: (phoneNumber: string, otp: string) => Promise<{ verified: boolean; phoneNumber: string }>;
  linkPhoneNumber: (phoneNumber: string) => Promise<{ success: boolean; message: string; otp?: string }>;
}

interface UserProfile {
  fullName: string;
  email: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  createdAt: string;
  role?: 'owner' | 'resident' | 'guest';
  referralCode?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Add error boundary for auth state
  const [authError, setAuthError] = useState<string | null>(null);

  const isGuest = user?.isAnonymous || false;

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setUser(user);
        
        if (user && !user.isAnonymous) {
          // Fetch user profile for registered users
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            setUserProfile(profileDoc.data() as UserProfile);
          }
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Auth error:', error);
      setAuthError('Authentication failed to initialize');
      setLoading(false);
    }
  }, []);

  const signUp = async (email: string, password: string, fullName: string, role: 'owner' | 'resident' = 'resident', referralCode?: string, phoneNumber?: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile in Firestore
    const userProfile: UserProfile = {
      fullName,
      email,
      role,
      createdAt: new Date().toISOString(),
      ...(referralCode && { referralCode }),
      ...(phoneNumber && { phoneNumber, phoneVerified: false }),
    };
    
    await setDoc(doc(db, 'users', user.uid), userProfile);
    setUserProfile(userProfile);
  };

  const signIn = async (email: string, password: string): Promise<UserProfile | null> => {
    const { user: signedInUser } = await signInWithEmailAndPassword(auth, email, password);
    
    // Fetch and return user profile
    const profileDoc = await getDoc(doc(db, 'users', signedInUser.uid));
    if (profileDoc.exists()) {
      return profileDoc.data() as UserProfile;
    }
    return null;
  };

  const signInAsGuest = async () => {
    await signInAnonymously(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  const deleteAccount = async () => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // Delete user document from Firestore if not anonymous
      if (!user.isAnonymous && user.uid) {
        await deleteDoc(doc(db, 'users', user.uid));
      }

      // Delete user from Firebase Auth
      await deleteUser(user);
      
      // Clear user profile state
      setUserProfile(null);
    } catch (error: any) {
      // If re-authentication is required, throw a specific error
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('For security reasons, please log out and log back in before deleting your account.');
      }
      throw error;
    }
  };

  // Send OTP to phone number (no CAPTCHA required)
  const sendOTP = async (phoneNumber: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    try {
      const result = await authAPI.sendOTP(phoneNumber);
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to send OTP');
    }
  };

  // Verify OTP code (no CAPTCHA required)
  const verifyOTP = async (phoneNumber: string, otp: string): Promise<{ verified: boolean; phoneNumber: string }> => {
    try {
      const result = await authAPI.verifyOTP(phoneNumber, otp);
      if (!result.verified) {
        throw new Error(result.error || 'OTP verification failed');
      }
      
      // After successful verification, update user profile to mark phone as verified
      if (user) {
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as UserProfile;
          await updateDoc(doc(db, 'users', user.uid), {
            phoneVerified: true,
            phoneNumber: profileData.phoneNumber || phoneNumber,
          });
          
          // Update local profile state
          setUserProfile({
            ...profileData,
            phoneVerified: true,
            phoneNumber: profileData.phoneNumber || phoneNumber,
          });
        }
      }
      
      return result;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to verify OTP');
    }
  };

  // Link phone number to existing account (for verification after signup/login)
  const linkPhoneNumber = async (phoneNumber: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    return await sendOTP(phoneNumber);
  };

  // If there's an auth error, show a fallback
  if (authError) {
    return <div>Authentication Error: {authError}</div>;
  }

  const value = {
    user,
    isGuest,
    loading,
    signUp,
    signIn,
    signInAsGuest,
    resetPassword,
    logout,
    deleteAccount,
    userProfile,
    sendOTP,
    verifyOTP,
    linkPhoneNumber,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
