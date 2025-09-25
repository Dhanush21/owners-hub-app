import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration with fallback values
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBxxn3DysMJJ49U-fPE6nrleoUmIhoAEac",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cohub-help-desk-b2a66.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cohub-help-desk-b2a66",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cohub-help-desk-b2a66.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "587592082463",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:587592082463:android:f9c907b1a4b1710fb5e12a",
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

export { app };
export const db = getFirestore(app);
export const auth = getAuth(app);


