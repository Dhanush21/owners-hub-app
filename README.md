# Owners Hub Project

This is the Owners Hub Property and Society Management app.

## Backend Setup Instructions

Path: `/backend`

Commands to Run:
```bash
cd backend
npm install
npm start
```

API Key File: `/backend/.env`

Required Variables inside `/backend/.env`:
```env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key
```

## Frontend Setup Instructions

Path: `/`

Commands to Run:
```bash
npm install
npm run dev
```

API Key File: `/.env`

Required Variables inside `/.env`:
```env
VITE_API_URL=http://localhost:3001/api
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=cohub-help-desk-b2a66.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cohub-help-desk-b2a66
VITE_FIREBASE_STORAGE_BUCKET=cohub-help-desk-b2a66.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=587592082463
VITE_FIREBASE_APP_ID=1:587592082463:android:f9c907b1a4b1710fb5e12a
```
