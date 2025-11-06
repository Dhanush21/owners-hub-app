@echo off
REM Firebase App Distribution script for Android (Windows)
REM This script builds the Android app and distributes it via Firebase App Distribution

echo 🚀 Starting Firebase App Distribution for Android...

REM Check if Firebase CLI is installed
where firebase >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Firebase CLI not found. Please install it with: npm install -g firebase-tools
    exit /b 1
)

REM Check if user is logged in to Firebase
firebase projects:list >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Not logged in to Firebase. Please run: firebase login
    exit /b 1
)

REM Build the web app
echo 🏗️ Building web application...
call npm run build

REM Sync Capacitor
echo 🔄 Syncing Capacitor Android...
call npx cap sync android

REM Build Android APK
echo 📱 Building Android APK...
cd android
call gradlew.bat assembleRelease
cd ..

REM Find the APK file
for /r "android\app\build\outputs\apk\release" %%f in (*.apk) do (
    set "APK_PATH=%%f"
    goto :found
)
:found

if not defined APK_PATH (
    echo ❌ APK file not found. Build may have failed.
    exit /b 1
)

echo ✅ APK built successfully: %APK_PATH%

REM Get release notes (optional)
set /p RELEASE_NOTES="📝 Enter release notes (or press Enter for default): "
if "%RELEASE_NOTES%"=="" set RELEASE_NOTES=New build available for testing

REM Get testers (optional)
set /p TESTERS="👥 Enter tester emails (comma-separated, or press Enter for default): "

REM Distribute via Firebase App Distribution
echo 📤 Distributing via Firebase App Distribution...

if not "%TESTERS%"=="" (
    firebase appdistribution:distribute "%APK_PATH%" --release-notes "%RELEASE_NOTES%" --testers "%TESTERS%"
) else (
    firebase appdistribution:distribute "%APK_PATH%" --release-notes "%RELEASE_NOTES%"
)

echo ✅ App distributed successfully!
echo 📧 Testers will receive email notifications to download the app.
