import fetch from 'node-fetch';

async function testServer() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Testing server endpoints...');
  
  // Test email endpoint
  try {
    const emailResponse = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Test Email',
        html: '<p>This is a test email</p>',
        pdfBase64: 'dGVzdA==', // base64 encoded "test"
        pdfFilename: 'test.pdf'
      })
    });
    
    const emailResult = await emailResponse.json();
    console.log('Email endpoint test:', emailResponse.status, emailResult);
  } catch (error) {
    console.error('Email endpoint test failed:', error.message);
  }
  
  // Test create user endpoint
  try {
    const userResponse = await fetch(`${baseUrl}/api/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'seller',
        companyId: 'test-company',
        adminId: 'test-admin'
      })
    });
    
    const userResult = await userResponse.json();
    console.log('Create user endpoint test:', userResponse.status, userResult);
  } catch (error) {
    console.error('Create user endpoint test failed:', error.message);
  }
}

testServer().catch(console.error); 