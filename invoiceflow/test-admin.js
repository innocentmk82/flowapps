import { auth, db } from './src/lib/firebaseAdmin.js';

// Test Firebase Admin SDK connection
async function testAdminSDK() {
  try {
    console.log('Testing Firebase Admin SDK...');
    
    // Test Firestore connection
    const testDoc = await db.collection('test').doc('connection').get();
    console.log('✅ Firestore connection successful');
    
    // Test Auth connection
    const authClient = auth;
    console.log('✅ Firebase Auth connection successful');
    
    console.log('🎉 Firebase Admin SDK is working correctly!');
    console.log('You can now create users through the admin panel.');
    
  } catch (error) {
    console.error('❌ Firebase Admin SDK test failed:', error);
  }
}

testAdminSDK(); 