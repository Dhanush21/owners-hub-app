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
  signInWithPhoneNumber,
  ConfirmationResult,
  RecaptchaVerifier
} from 'firebase/auth';
import { auth, db } from '@/integrations/firebase/client';
import { doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

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
  // OTP functions for two-step authentication
  sendOTP: (phoneNumber: string) => Promise<ConfirmationResult>;
  verifyOTP: (confirmationResult: ConfirmationResult, otp: string) => Promise<void>;
  linkPhoneNumber: (phoneNumber: string) => Promise<ConfirmationResult>;
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

  // Store reCAPTCHA verifier for web OTP
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  const isGuest = user?.isAnonymous || false;

  // Initialize reCAPTCHA container for web platform
  useEffect(() => {
    if (Capacitor.getPlatform() === 'web' && typeof window !== 'undefined') {
      if (!document.getElementById('recaptcha-container')) {
        const container = document.createElement('div');
        container.id = 'recaptcha-container';
        container.style.display = 'none';
        document.body.appendChild(container);
      }
    }
    
    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [recaptchaVerifier]);

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

  // Send OTP to phone number
  const sendOTP = async (phoneNumber: string): Promise<ConfirmationResult> => {
    // Format phone number (ensure it starts with +)
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

    // Ensure recaptcha container exists for web
    if (Capacitor.getPlatform() === 'web' && typeof window !== 'undefined') {
      if (!document.getElementById('recaptcha-container')) {
        const container = document.createElement('div');
        container.id = 'recaptcha-container';
        container.style.display = 'none';
        document.body.appendChild(container);
      }
    }

    // For web, use an invisible reCAPTCHA verifier
    if (Capacitor.getPlatform() === 'web') {
      let verifier = recaptchaVerifier;

      if (!verifier) {
        verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            console.warn('reCAPTCHA expired');
          }
        });

        await verifier.render();
        setRecaptchaVerifier(verifier);
      }

      try {
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, verifier);
        return confirmationResult;
      } catch (error: any) {
        if (error.code === 'auth/too-many-requests') {
          throw new Error('Too many requests. Please try again later.');
        } else if (error.code === 'auth/invalid-phone-number') {
          throw new Error('Invalid phone number. Please check and try again.');
        } else if (error.code === 'auth/quota-exceeded') {
          throw new Error('SMS quota exceeded. Please try again later.');
        }
        throw error;
      }
    }

    // For native (Capacitor) builds, rely on platform verification (no web reCAPTCHA)
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone);
      return confirmationResult;
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please try again later.');
      } else if (error.code === 'auth/invalid-phone-number') {
        throw new Error('Invalid phone number. Please check and try again.');
      } else if (error.code === 'auth/quota-exceeded') {
        throw new Error('SMS quota exceeded. Please try again later.');
      }
      throw error;
    }
  };

  // Verify OTP code
  const verifyOTP = async (confirmationResult: ConfirmationResult, otp: string): Promise<void> => {
    try {
      const result = await confirmationResult.confirm(otp);
      
      // After successful verification, update user profile to mark phone as verified
      if (result.user) {
        const profileDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (profileDoc.exists()) {
          const profileData = profileDoc.data() as UserProfile;
          await updateDoc(doc(db, 'users', result.user.uid), {
            phoneVerified: true,
            phoneNumber: profileData.phoneNumber || result.user.phoneNumber || '',
          });
          
          // Update local profile state
          setUserProfile({
            ...profileData,
            phoneVerified: true,
            phoneNumber: profileData.phoneNumber || result.user.phoneNumber || '',
          });
        } else {
          // If profile doesn't exist, create one with phone number
          const newProfile: UserProfile = {
            fullName: result.user.displayName || 'User',
            email: result.user.email || '',
            phoneNumber: result.user.phoneNumber || '',
            phoneVerified: true,
            createdAt: new Date().toISOString(),
            role: 'resident',
          };
          await setDoc(doc(db, 'users', result.user.uid), newProfile);
          setUserProfile(newProfile);
        }
      }
    } catch (error: any) {
      // Handle specific error codes
      if (error.code === 'auth/invalid-verification-code') {
        throw new Error('Invalid OTP code. Please try again.');
      } else if (error.code === 'auth/code-expired') {
        throw new Error('OTP code has expired. Please request a new one.');
      } else if (error.code === 'auth/session-expired') {
        throw new Error('Session expired. Please start the verification process again.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many requests. Please try again later.');
      }
      throw error;
    }
  };

  // Link phone number to existing account (for verification after signup/login)
  const linkPhoneNumber = async (phoneNumber: string): Promise<ConfirmationResult> => {
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