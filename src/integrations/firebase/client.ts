import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration with fallback values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAmUM0bDxO2fLAwPDRaqJhaMmcPwq0ZRi0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cohub-help-desk-b2a66.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cohub-help-desk-b2a66",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cohub-help-desk-b2a66.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "587592082463",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:587592082463:android:f9c907b1a4b1710fb5e12a",
  measurementId: "G-8NPG1WMB77"
};

let app: FirebaseApp;
if (!getApps().length) {
  // Sanity check: don't use an Android appId for web builds — this often causes reCAPTCHA and phone-auth problems
  if (typeof window !== 'undefined' && (firebaseConfig.appId || '').includes(':android:')) {
    // Throwing would break development; warn loudly to help debugging
    // eslint-disable-next-line no-console
    console.warn('Firebase appId looks like an Android appId — ensure VITE_FIREBASE_APP_ID is set to a web app id for browser builds. Using Android appId on web can break reCAPTCHA and phone auth.');
  }

  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

export const db = getFirestore(app);
export const auth = getAuth(app);


