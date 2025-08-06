@echo off
REM Firebase Deployment Script for Multi-Tenant Invoicing Application
REM This script deploys Firebase rules and indexes

echo 🚀 Starting Firebase deployment...

REM Check if Firebase CLI is installed
firebase --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Firebase CLI is not installed. Please install it first:
    echo npm install -g firebase-tools
    pause
    exit /b 1
)

REM Check if user is logged in
firebase projects:list >nul 2>&1
if errorlevel 1 (
    echo ❌ You are not logged in to Firebase. Please login first:
    echo firebase login
    pause
    exit /b 1
)

echo ✅ Firebase CLI is ready

REM Note: Firebase CLI validation commands are not available in this version
REM Rules and indexes will be validated during deployment
echo 🔍 Firebase CLI validation commands not available in this version
echo 📋 Rules and indexes will be validated during deployment

REM Deploy rules
echo 📤 Deploying Firestore rules...
firebase deploy --only firestore:rules
if errorlevel 1 (
    echo ❌ Firestore rules deployment failed
    pause
    exit /b 1
)
echo ✅ Firestore rules deployed successfully

REM Deploy indexes
echo 📤 Deploying Firestore indexes...
firebase deploy --only firestore:indexes
if errorlevel 1 (
    echo ❌ Firestore indexes deployment failed
    pause
    exit /b 1
)
echo ✅ Firestore indexes deployed successfully

echo.
echo 🎉 Firebase deployment completed successfully!
echo.
echo 📋 Deployment Summary:
echo    ✅ Firestore rules deployed
echo    ✅ Firestore indexes deployed
echo.
echo 🔒 Security Features Active:
echo    - Multi-tenant data isolation
echo    - Role-based access control
echo    - Data validation
echo    - User activation system
echo    - Comprehensive audit trails
echo.
echo 📊 Performance Optimizations:
echo    - Company-based query indexes
echo    - Status-based filtering indexes
echo    - Date-based sorting indexes
echo    - User-based filtering indexes
echo.
echo 🚀 Your application is now secure and optimized!
pause 