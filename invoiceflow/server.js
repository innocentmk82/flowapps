import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { sendEmailWithPDF } from './src/lib/resendEmail.js';
import { auth as adminAuth, db as adminDb } from './src/lib/firebaseAdmin.js';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/api/send-email', async (req, res) => {
  const { to, subject, html, pdfBase64, pdfFilename } = req.body;

  if (!to || !subject || !html || !pdfBase64 || !pdfFilename) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    await sendEmailWithPDF({ to, subject, html, pdfBuffer, pdfFilename });
    return res.status(200).json({ success: true });
  } catch (error) {
    // Enhanced error logging
    console.error('Error sending email:', error);
    
    // Check if it's an environment variable issue
    if (error.message.includes('RESEND_API_KEY') || error.message.includes('RESEND_FROM_EMAIL')) {
      return res.status(500).json({ 
        error: 'Email service not configured', 
        details: 'Please set RESEND_API_KEY and RESEND_FROM_EMAIL environment variables',
        message: error.message
      });
    }
    
    if (error?.response) {
      console.error('Resend API response:', error.response.data);
    }
    
    // Return detailed error info for debugging
    return res.status(500).json({ 
      error: 'Failed to send email', 
      details: error?.message || JSON.stringify(error),
      resendResponse: error?.response?.data || null
    });
  }
});

// New endpoint for creating seller accounts
app.post('/api/create-user', async (req, res) => {
  const { email, displayName, role, companyId, adminId } = req.body;

  if (!email || !displayName || !role || !companyId || !adminId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (![ 'seller', 'admin', 'manager' ].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be "seller", "admin", or "manager"' });
  }

  try {
    // Fetch the requesting user's role from Firestore
    const adminDoc = await adminDb.collection('users').doc(adminId).get();
    if (!adminDoc.exists) {
      return res.status(403).json({ error: 'Requesting user not found' });
    }
    const adminData = adminDoc.data();
    if (!adminData.isActive) {
      return res.status(403).json({ error: 'Requesting user is not active' });
    }

    // Only a manager can create an admin or another manager
    if ((role === 'admin' || role === 'manager') && adminData.role !== 'manager') {
      return res.status(403).json({ error: 'Only a manager can add admins or other managers' });
    }
    // Admins can only add sellers
    if (role === 'seller' && !['admin', 'manager'].includes(adminData.role)) {
      return res.status(403).json({ error: 'Only admins or managers can add sellers' });
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + '1!';
    
    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      displayName,
      password: tempPassword,
      emailVerified: false
    });

    // Create user document in Firestore
    const userData = {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      role,
      companyId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      addedBy: adminId,
      temporaryPassword: tempPassword // Store temporary password
    };

    await adminDb.collection('users').doc(userRecord.uid).set(userData);

    // Send invitation email with temporary password
    // You can implement email sending here using your preferred email service
    
    return res.status(200).json({ 
      success: true,
      message: 'User created successfully',
      userId: userRecord.uid,
      tempPassword: tempPassword // In production, send this via email instead
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ 
      error: 'Failed to create user', 
      details: error?.message || JSON.stringify(error)
    });
  }
});

// New endpoint for setting/resetting temporary passwords
app.post('/api/set-temp-password', async (req, res) => {
  const { userId, adminId } = req.body;

  if (!userId || !adminId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Generate a new temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + '1!';
    
    // Update user document in Firestore with new temporary password
    await adminDb.collection('users').doc(userId).update({
      temporaryPassword: tempPassword,
      updatedAt: new Date()
    });

    // Update the user's password in Firebase Auth
    await adminAuth.updateUser(userId, {
      password: tempPassword
    });
    
    return res.status(200).json({ 
      success: true,
      message: 'Temporary password set successfully',
      tempPassword: tempPassword
    });
  } catch (error) {
    console.error('Error setting temporary password:', error);
    return res.status(500).json({ 
      error: 'Failed to set temporary password', 
      details: error?.message || JSON.stringify(error)
    });
  }
});

// New endpoint for clearing temporary password
app.post('/api/clear-temp-password', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Clear temporary password from user document
    await adminDb.collection('users').doc(userId).update({
      temporaryPassword: null,
      updatedAt: new Date()
    });
    
    return res.status(200).json({ 
      success: true,
      message: 'Temporary password cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing temporary password:', error);
    return res.status(500).json({ 
      error: 'Failed to clear temporary password', 
      details: error?.message || JSON.stringify(error)
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 