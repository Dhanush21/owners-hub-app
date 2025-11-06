@echo off
REM Prepare Android build for CI/CD (Windows version)
REM This script ensures Capacitor Android dependencies are properly set up

echo 🔧 Preparing Capacitor Android build...

REM Check if we're in the right directory
if not exist "capacitor.config.ts" (
    echo ❌ Error: capacitor.config.ts not found. Are you in the project root?
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing npm dependencies...
    call npm ci
)

REM Build the web app first
echo 🏗️ Building web application...
call npm run build

REM Sync Capacitor (this ensures all native dependencies are up to date)
echo 🔄 Syncing Capacitor Android...
call npx cap sync android

REM Update Capacitor (this regenerates any missing files)
echo 🔄 Updating Capacitor Android...
call npx cap update android

echo ✅ Android build preparation complete!
echo You can now run: cd android ^&^& gradlew.bat assembleRelease
