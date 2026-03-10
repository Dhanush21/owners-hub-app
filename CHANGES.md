# Apple App Store Rejection Fixes — Before & After

This document details every code change made to fix the three Apple App Store rejection issues.

---

## 1. Payment Failure on iPad — `src/pages/Subscription.tsx`

### Issue
- Razorpay `<script>` was appended to the DOM on every payment attempt, causing duplicate-load failures on iPad Safari.
- No `payment.failed` handler — failed payments were silently ignored.
- Hardcoded placeholder user data (`'John Doe'`, `'user@example.com'`, `'user123'`).
- No auth guard — unauthenticated users could trigger payment.

### 1a. Imports

**Before:**
```tsx
import { useState } from "react";
import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/integrations/firebase/client";
import { collection, addDoc } from "firebase/firestore";
```

**After:**
```tsx
import { useState, useCallback } from "react";
import { Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/integrations/firebase/client";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
```

### 1b. Singleton Razorpay Script Loader (new code, added above the component)

**Before:** *(no loader — script was created inline inside `handlePayment`)*

**After:**
```tsx
let razorpayLoadPromise: Promise<void> | null = null;

const loadRazorpayScript = (): Promise<void> => {
  if (window.Razorpay) {
    return Promise.resolve();
  }
  if (razorpayLoadPromise) {
    return razorpayLoadPromise;
  }
  razorpayLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existingScript) {
      if (window.Razorpay) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => {
        razorpayLoadPromise = null;
        reject(new Error('Failed to load payment gateway.'));
      });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayLoadPromise = null;
      reject(new Error('Failed to load payment gateway. Please check your internet connection and try again.'));
    };
    document.body.appendChild(script);
  });
  return razorpayLoadPromise;
};
```

### 1c. Auth Context + Auth Guard

**Before:**
```tsx
const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // ... (no auth check before payment)

  const handlePayment = async (plan: typeof plans[0]) => {
    // ... no auth guard
    setLoading(true);
    try {
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        // ...
```

**After:**
```tsx
const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  // ...

  const handlePayment = useCallback(async (plan: typeof plans[0]) => {
    // ...
    setLoading(true);
    try {
      if (!user?.uid) {
        toast({
          title: "Authentication Required",
          description: "Please sign in before making a payment.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      await loadRazorpayScript();

      const options = {
        // ...
```

### 1d. Hardcoded Prefill Data → Real User Data

**Before:**
```tsx
// Inside Razorpay options:
handler: async function (response: any) {
  try {
    await addDoc(collection(db, 'subscriptions'), {
      payment_id: response.razorpay_payment_id,
      plan: plan.name,
      amount: plan.price,
      currency: 'INR',
      status: 'paid',
      date: new Date().toISOString(),
      user_email: 'user@example.com',   // ❌ hardcoded
      user_id: 'user123',               // ❌ hardcoded
      features: plan.features,
      period: plan.period
    });
    // ...
  }
},
prefill: {
  name: 'John Doe',          // ❌ hardcoded
  email: 'user@example.com', // ❌ hardcoded
  contact: '9999999999'      // ❌ hardcoded
},
```

**After:**
```tsx
handler: async function (response: any) {
  try {
    await addDoc(collection(db, 'subscriptions'), {
      payment_id: response.razorpay_payment_id,
      plan: plan.name,
      amount: plan.price,
      currency: 'INR',
      status: 'paid',
      date: new Date().toISOString(),
      user_email: userProfile?.email || user?.email || '',   // ✅ real user
      user_id: user?.uid || '',                              // ✅ real user
      features: plan.features,
      period: plan.period
    });
    // ...
  }
},
prefill: {
  name: userProfile?.fullName || user?.displayName || '',  // ✅ real user
  email: userProfile?.email || user?.email || '',           // ✅ real user
  contact: userProfile?.phoneNumber || ''                   // ✅ real user
},
```

### 1e. Payment Failed Handler (new)

**Before:** *(missing entirely — failed payments produced no feedback)*

**After:**
```tsx
const rzp = new window.Razorpay(options);

rzp.on('payment.failed', function (response: any) {
  console.error('Razorpay payment failed:', response.error);
  toast({
    title: "Payment Failed",
    description: response.error?.description || "Payment could not be completed. Please try again.",
    variant: "destructive"
  });
  setLoading(false);
});

rzp.open();
```

### 1f. `handlePayment` Wrapped in `useCallback`

**Before:**
```tsx
const handlePayment = async (plan: typeof plans[0]) => {
  // ...
};
```

**After:**
```tsx
const handlePayment = useCallback(async (plan: typeof plans[0]) => {
  // ...
}, [user, userProfile, toast, navigate]);
```

---

## 2. Incomplete Account Deletion — `src/context/AuthContext.tsx`

### Issue
`deleteAccount()` only deleted the `users` Firestore document. Subscriptions and chat data were left behind — violating Apple guideline 5.1.1.

### 2a. Firestore Imports

**Before:**
```tsx
import { doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
```

**After:**
```tsx
import { doc, setDoc, getDoc, deleteDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
```

### 2b. New Helper — `deleteUserCollection`

**Before:** *(did not exist)*

**After:**
```tsx
const deleteUserCollection = async (collectionName: string, userId: string) => {
  try {
    const q = query(collection(db, collectionName), where('user_id', '==', userId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (e) {
    console.warn(`Failed to delete ${collectionName} data:`, e);
  }
};
```

### 2c. `deleteAccount` Function

**Before:**
```tsx
const deleteAccount = async () => {
  if (!user) {
    throw new Error('No user logged in');
  }

  try {
    if (!user.isAnonymous) {
      await deleteDoc(doc(db, 'users', user.uid));
    }
    await deleteUser(user);
    setUserProfile(null);
  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('For security reasons, please re-authenticate before deleting your account.');
    }
    throw error;
  }
};
```

**After:**
```tsx
const deleteAccount = async () => {
  if (!user) {
    throw new Error('No user logged in');
  }

  try {
    if (!user.isAnonymous) {
      // Delete user profile
      await deleteDoc(doc(db, 'users', user.uid));

      // Delete user's subscriptions and chat conversations
      await deleteUserCollection('subscriptions', user.uid);
      await deleteUserCollection('chats', user.uid);
    }
    await deleteUser(user);
    setUserProfile(null);
  } catch (error: any) {
    if (error.code === 'auth/requires-recent-login') {
      throw new Error('For security reasons, please sign out and sign in again before deleting your account.');
    }
    throw error;
  }
};
```

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| `src/pages/Subscription.tsx` | Singleton script loader, auth guard, real user prefill, payment failure handler, `useCallback` |
| `src/context/AuthContext.tsx` | Added `deleteUserCollection` helper; `deleteAccount` now purges `subscriptions` + `chats` |
| `src/pages/Settings.tsx` | No changes needed — Delete Account UI was already present |
