#!/bin/bash

# Firebase Deployment Script for Multi-Tenant Invoicing Application
# This script deploys Firebase rules and indexes

echo "🚀 Starting Firebase deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "❌ You are not logged in to Firebase. Please login first:"
    echo "firebase login"
    exit 1
fi

echo "✅ Firebase CLI is ready"

# Note: Firebase CLI validation commands are not available in this version
# Rules and indexes will be validated during deployment
echo "🔍 Firebase CLI validation commands not available in this version"
echo "📋 Rules and indexes will be validated during deployment"

# Deploy rules
echo "📤 Deploying Firestore rules..."
if firebase deploy --only firestore:rules; then
    echo "✅ Firestore rules deployed successfully"
else
    echo "❌ Firestore rules deployment failed"
    exit 1
fi

# Deploy indexes
echo "📤 Deploying Firestore indexes..."
if firebase deploy --only firestore:indexes; then
    echo "✅ Firestore indexes deployed successfully"
else
    echo "❌ Firestore indexes deployment failed"
    exit 1
fi

echo "🎉 Firebase deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "   ✅ Firestore rules deployed"
echo "   ✅ Firestore indexes deployed"
echo ""
echo "🔒 Security Features Active:"
echo "   - Multi-tenant data isolation"
echo "   - Role-based access control"
echo "   - Data validation"
echo "   - User activation system"
echo "   - Comprehensive audit trails"
echo ""
echo "📊 Performance Optimizations:"
echo "   - Company-based query indexes"
echo "   - Status-based filtering indexes"
echo "   - Date-based sorting indexes"
echo "   - User-based filtering indexes"
echo ""
echo "🚀 Your application is now secure and optimized!" 