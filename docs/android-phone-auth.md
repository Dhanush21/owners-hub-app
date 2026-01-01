# Android Native Phone Auth (Capacitor)

This guide explains the minimum steps to get Firebase Phone Authentication working reliably on Android (Capacitor). The web reCAPTCHA flow is unsupported in Android WebViews — use a native plugin instead.

## 1) Add `google-services.json`
- In Firebase Console → Project settings → Your apps → Add an Android app (package name `com.coliv.manager`) and download `google-services.json`.
- Place it at `android/app/google-services.json` (do not commit the file — follow `SECURITY.md`).
- Add SHA-256 fingerprints (debug and release) to the Firebase app settings.

## 2) Install native Capacitor auth plugin
- Recommended: `@capacitor-firebase/auth` or `@capacitor-firebase/authentication` (choose the maintained plugin your team prefers) — the Capacitor plugin bridges to the native Firebase SDK and avoids the web reCAPTCHA flow.

Install example (npm):

```bash
npm install @capacitor-firebase/authentication
npx cap sync android
```

Plugin notes & Android SDK dependency:
- The plugin typically exposes methods like `signInWithPhoneNumber`, `startPhoneNumberVerification`, `verifyPhoneNumber`, and `signInWithVerificationCode` (method names vary by plugin version). Our `AuthContext` includes a runtime adapter that tries common method names.
- Add the native Firebase Auth SDK to your Android app Gradle deps (we add this in `android/app/build.gradle`):

```gradle
implementation platform('com.google.firebase:firebase-bom:<latest>')
implementation 'com.google.firebase:firebase-analytics'
implementation 'com.google.firebase:firebase-auth' // <- required for Phone Auth
```

- Follow the plugin docs for required AndroidManifest entries, ProGuard/R8 rules, and any activity lifecycle changes the plugin requires.

- If you prefer to implement Phone Auth directly in native Android (no Capacitor plugin), follow the Firebase Android guide: use `FirebaseAuth.getInstance().verifyPhoneNumber(...)` with `PhoneAuthProvider.OnVerificationStateChangedCallbacks` and handle `onVerificationCompleted`, `onCodeSent`, and `onVerificationFailed`. Make sure you add SHA-256 fingerprints to the Firebase console and the `google-services.json` with correct package name.

## Adapter (project-specific)
- This project includes a small adapter to centralize the dynamic import and error handling for the Capacitor Firebase Authentication plugin:
  - Path: `src/integrations/firebase/capacitorAuth.ts`.
  - The adapter exports: `isPluginAvailable`, `signInWithPhoneNumberNative`, `startPhoneNumberVerificationNative`, `verifyPhoneNumberNative`, and `signInWithVerificationCodeNative`.
  - `src/context/AuthContext.tsx` uses the adapter to detect native availability and perform phone verification when running inside a Capacitor Android/iOS WebView.

## Debugging & Logcat tips
- Look for these log messages (we add helpful logs in the app):
  - `Native phone auth plugin not installed; attempting server-side SMS fallback` — means the native plugin couldn't be imported.
  - `Native phone auth attempt failed` — plugin found but the native call threw; the error message will often include the native reason (e.g., missing SHA-256).
  - `reCAPTCHA initialization failed` or `Too many requests` — indicates the web flow is being used inside WebView (avoid this; use plugin).

- To capture logs:
  - Open Android Studio -> Logcat, filter by your app package (`com.coliv.manager`) or by `Firebase`/`Native phone auth` search terms.
  - Or run: `adb logcat | findstr /I "Native phone auth"`

- If you see authentication errors mentioning `invalid-credential` or missing SHA, double-check the `google-services.json` contents, package name, and that you added the SHA-256 fingerprints in the Firebase Console.

- After changes to `google-services.json` or plugin installation, run:
```bash
npx cap sync android
# then open Android Studio and Clean/Rebuild
```
Example (native behavior conceptual snippet):

```java
PhoneAuthOptions options = PhoneAuthOptions.newBuilder(auth)
        .setPhoneNumber(phoneNumber)
        .setTimeout(60L, TimeUnit.SECONDS)
        .setActivity(activity)
        .setCallbacks(new PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
            @Override
            public void onVerificationCompleted(PhoneAuthCredential credential) {
                // Auto-retrieval or instant verification
                signInWithCredential(credential);
            }

            @Override
            public void onVerificationFailed(FirebaseException e) {
                // Handle error
            }

            @Override
            public void onCodeSent(String verificationId,
                    PhoneAuthProvider.ForceResendingToken token) {
                // Save verificationId and prompt user for code
            }
        }).build();
PhoneAuthProvider.verifyPhoneNumber(options);
```

- Testing tip: use the Firebase Console's **Test phone numbers** feature for deterministic tests without sending SMS.

- After installing the plugin and adding `google-services.json` and SHA-256, rebuild the Android app (via `npx cap sync android` and Android Studio) and test on a real device (Google Play Services required for some verification flows).

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