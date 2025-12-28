# Android Native Phone Auth (Capacitor)

This guide explains the minimum steps to get Firebase Phone Authentication working reliably on Android (Capacitor). The web reCAPTCHA flow is unsupported in Android WebViews — use a native plugin instead.

## 1) Add `google-services.json`
- In Firebase Console → Project settings → Your apps → Add an Android app (package name `com.coliv.manager`) and download `google-services.json`.
- Place it at `android/app/google-services.json` (do not commit the file — follow `SECURITY.md`).
- Add SHA-256 fingerprints (debug and release) to the Firebase app settings.

## 2) Install native Capacitor auth plugin
- Recommended: `@capacitor-firebase/auth` (official Capacitor Firebase plugin) or another maintained plugin with Phone Auth support.

Install example (npm):

```bash
npm install @capacitor-firebase/auth
npx cap sync android
```

Plugin notes:
- The plugin typically exposes `FirebaseAuthentication` with methods such as `signInWithPhoneNumber`, `startPhoneNumberVerification`, `verifyPhoneNumber`, and `signInWithVerificationCode` depending on the plugin version.
- Our `AuthContext` contains a runtime adapter that tries common method names. After installing, rebuild and test on an Android device.
- Follow plugin docs for AndroidManifest entries and ProGuard rules if required.

## 3) Build & test on device
- Use a real Android device with Google Play Services (emulators may require Google Play image).
- Rebuild and run:

```bash
npx cap open android
# build/run via Android Studio
```

## 4) How our app code switches behavior
- The app detects `Capacitor.getPlatform() === 'android'` + `Capacitor.isNative` and will attempt to use the native plugin instead of the web `RecaptchaVerifier`.
- If plugin is missing, the app will throw a clear error instead of repeatedly trying the web flow (avoid `auth/too-many-requests`).

## 5) Testing tips
- Use real phone numbers for end-to-end tests.
- Use Firebase Console -> Authentication -> Sign-in method -> Test phone numbers for deterministic behavior without sending SMS (useful in CI).

## 6) Troubleshooting
- If you see `auth/too-many-requests` on Android after these changes, confirm you are not still triggering the web flow (check logs). Ensure the plugin is installed and that `google-services.json` has correct package name and SHA-256.
- If plugin APIs differ, adapt the adapter in `src/context/AuthContext.tsx` to the plugin's API surface.

---

If you'd like, I can add direct plugin call implementations for a specific plugin (e.g., `@capacitor-firebase/auth`) into `AuthContext.tsx` — tell me which plugin you plan to use and I’ll implement it fully.