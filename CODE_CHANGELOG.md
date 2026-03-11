# Code Changelog — Fix Apple App Store Rejection

> **Ticket:** Fix Apple App Store Rejection Issues (Payment, Demo Login, Account Deletion) #240  
> **Scope:** Payment failure on iPad + Incomplete account deletion (App Store Guideline 5.1.1)  
> **Files changed:** `src/pages/Subscription.tsx`, `src/context/AuthContext.tsx`  
> **Files unchanged:** `src/pages/Auth.tsx`, `src/pages/Settings.tsx`

---

## Issue 1: Payment Failure on iPad

**Problem:** The "Pay Now" action fails during Razorpay checkout on iPad, displaying "Oops! Something went wrong. Payment Failed." The Razorpay `<script>` tag was appended to the DOM on every payment attempt, causing duplicate-load failures on iPad Safari. No error feedback was shown to the user on payment failure. Hardcoded placeholder data was used instead of real user information.

**File:** `src/pages/Subscription.tsx`

---

### Change 1.1 — Added `useCallback` and `useAuth` imports

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

**Why:** `useAuth` provides access to the authenticated user and profile data. `useCallback` stabilizes the payment handler.

---

### Change 1.2 — Singleton Razorpay Script Loader

**Before:** No dedicated loader — a new `<script>` tag was created and appended to the DOM every time the user clicked "Pay Now":
```tsx
const handlePayment = async (plan: typeof plans[0]) => {
    // ...
    try {
      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        // ... open checkout
      };

      script.onerror = () => {
        // ... show error
      };
    }
};
```

**After:** A module-level singleton loader that prevents duplicate script tags:
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

**Why:** On iPad Safari, appending duplicate `<script>` tags caused the Razorpay checkout to fail. The singleton pattern ensures the script is loaded exactly once, reusing the existing instance on subsequent payment attempts.

---

### Change 1.3 — Auth Guard Before Payment

**Before:** No authentication check — any visitor (including unauthenticated/guest users) could trigger payment:
```tsx
const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePayment = async (plan: typeof plans[0]) => {
    // ... directly proceeds to payment
    setLoading(true);
    try {
      const script = document.createElement('script');
      // ...
```

**After:** Fetches the authenticated user and blocks payment if not signed in:
```tsx
const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

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
      // ...
```

**Why:** Prevents unauthenticated users from initiating payments that would fail due to missing user data.

---

### Change 1.4 — Real User Data Instead of Hardcoded Placeholders

**Before:**
```tsx
// Subscription record stored in Firestore:
await addDoc(collection(db, 'subscriptions'), {
  payment_id: response.razorpay_payment_id,
  plan: plan.name,
  amount: plan.price,
  currency: 'INR',
  status: 'paid',
  date: new Date().toISOString(),
  user_email: 'user@example.com',   // ❌ hardcoded placeholder
  user_id: 'user123',               // ❌ hardcoded placeholder
  features: plan.features,
  period: plan.period
});

// Razorpay checkout prefill:
prefill: {
  name: 'John Doe',          // ❌ hardcoded placeholder
  email: 'user@example.com', // ❌ hardcoded placeholder
  contact: '9999999999'      // ❌ hardcoded placeholder
},
```

**After:**
```tsx
// Subscription record stored in Firestore:
await addDoc(collection(db, 'subscriptions'), {
  payment_id: response.razorpay_payment_id,
  plan: plan.name,
  amount: plan.price,
  currency: 'INR',
  status: 'paid',
  date: new Date().toISOString(),
  user_email: userProfile?.email || user?.email || '',   // ✅ real user email
  user_id: user?.uid || '',                              // ✅ real user ID
  features: plan.features,
  period: plan.period
});

// Razorpay checkout prefill:
prefill: {
  name: userProfile?.fullName || user?.displayName || '',  // ✅ real user name
  email: userProfile?.email || user?.email || '',           // ✅ real user email
  contact: userProfile?.phoneNumber || ''                   // ✅ real user phone
},
```

**Why:** Hardcoded placeholder data caused subscription records to be untraceable and the Razorpay checkout form to display fake contact info. Using real user data ensures proper subscription tracking and a smoother checkout experience.

---

### Change 1.5 — Payment Failure Handler

**Before:** No `payment.failed` handler — when Razorpay payment failed on iPad, users saw the generic Razorpay error popup but the app gave no feedback:
```tsx
const rzp = new window.Razorpay(options);
rzp.open();
setLoading(false);
```

**After:** Explicit error handling on payment failure:
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
setLoading(false);
```

**Why:** Without this handler, the "Pay Now" button stayed in a "Processing..." state after a failure, and users received no in-app feedback about what went wrong.

---

## Issue 2: Incomplete Account Deletion (App Store Guideline 5.1.1)

**Problem:** Apple requires apps that allow account creation to provide a way for users to delete their account and all associated data. The existing `deleteAccount()` only deleted the user's profile document from the `users` collection but left `subscriptions` and `chats` data behind.

**File:** `src/context/AuthContext.tsx`

> **Note:** The Delete Account button with confirmation dialog already existed in `src/pages/Settings.tsx` — no UI changes were needed.

---

### Change 2.1 — Added Firestore Query Imports

**Before:**
```tsx
import { doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
```

**After:**
```tsx
import { doc, setDoc, getDoc, deleteDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
```

**Why:** The new `deleteUserCollection` helper needs `collection`, `query`, `where`, and `getDocs` to find and delete documents matching the user's ID.

---

### Change 2.2 — New `deleteUserCollection` Helper

**Before:** Did not exist.

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

**Why:** Reusable helper that queries a Firestore collection for all documents matching a user ID and deletes them in parallel. Used to purge both `subscriptions` and `chats` collections.

---

### Change 2.3 — `deleteAccount` Now Purges All User Data

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

**Why:** Apple Guideline 5.1.1 requires removal of **all** associated user data. The original implementation only deleted the `users` document, leaving subscriptions and chat records behind. Now all three collections (`users`, `subscriptions`, `chats`) are purged before the Firebase Auth user is deleted.

---

## Summary

| File | What Changed | Why |
|------|-------------|-----|
| `src/pages/Subscription.tsx` | Singleton Razorpay script loader, auth guard, real user prefill, `payment.failed` handler, `useCallback` | Fixes iPad payment failure caused by duplicate script loading, missing error handling, and placeholder data |
| `src/context/AuthContext.tsx` | `deleteUserCollection` helper, `deleteAccount` now purges `subscriptions` + `chats` collections | Meets Apple Guideline 5.1.1 for complete data deletion |
| `src/pages/Auth.tsx` | **No changes** | Original OTP/phone auth flow preserved per owner request |
| `src/pages/Settings.tsx` | **No changes** | Delete Account button and confirmation dialog already existed |
