const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initializeData() {
  console.log('🚀 Initializing demo data...');

  try {
    // Create demo admin user
    const adminUser = await admin.auth().createUser({
      email: 'admin@payflow.sz',
      password: 'admin123',
      displayName: 'PayFlow Admin'
    });

    // Create admin user profile
    await db.collection('users').doc(adminUser.uid).set({
      email: 'admin@payflow.sz',
      role: 'admin',
      profile: {
        firstName: 'PayFlow',
        lastName: 'Admin',
        businessName: 'PayFlow Demo Company',
        phone: '+268 2404 2000',
        address: 'Mbabane, Eswatini'
      },
      walletBalance: 0,
      isActive: true,
      permissions: {
        payflow: true,
        invoiceflow: true,
        stockflow: true
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create demo company
    const companyRef = await db.collection('companies').add({
      name: 'PayFlow Demo Company',
      ownerId: adminUser.uid,
      settings: {
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        address: 'Mbabane, Eswatini',
        phone: '+268 2404 2000',
        email: 'admin@payflow.sz',
        vatNumber: 'VAT123456789'
      },
      integrations: {
        payflow: { enabled: true, merchantId: adminUser.uid },
        invoiceflow: { enabled: true },
        stockflow: { enabled: true }
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create demo general user
    const generalUser = await admin.auth().createUser({
      email: 'customer@demo.com',
      password: 'demo123',
      displayName: 'Demo Customer'
    });

    // Create general user profile
    await db.collection('users').doc(generalUser.uid).set({
      email: 'customer@demo.com',
      role: 'general_user',
      profile: {
        firstName: 'Demo',
        lastName: 'Customer',
        phone: '+268 7612 3456',
        address: 'Manzini, Eswatini'
      },
      walletBalance: 1000, // Demo balance
      isActive: true,
      permissions: {
        payflow: true,
        invoiceflow: false,
        stockflow: false
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create demo products
    const products = [
      {
        companyId: companyRef.id,
        name: 'Laptop Computer',
        sku: 'LAPTOP001',
        category: 'Electronics',
        price: 15000,
        quantity: 10,
        lowStockThreshold: 2,
        description: 'High-performance laptop for business use',
        isActive: true
      },
      {
        companyId: companyRef.id,
        name: 'Office Chair',
        sku: 'CHAIR001',
        category: 'Furniture',
        price: 2500,
        quantity: 5,
        lowStockThreshold: 1,
        description: 'Ergonomic office chair',
        isActive: true
      },
      {
        companyId: companyRef.id,
        name: 'Consulting Service',
        sku: 'CONSULT001',
        category: 'Services',
        price: 500,
        quantity: 100,
        lowStockThreshold: 10,
        description: 'Business consulting service per hour',
        isActive: true
      }
    ];

    for (const product of products) {
      await db.collection('products').add({
        ...product,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Create demo invoice
    await db.collection('invoices').add({
      companyId: companyRef.id,
      clientEmail: 'customer@demo.com',
      invoiceNumber: 'INV-DEMO-001',
      items: [
        {
          id: 'item_1',
          description: 'Business Consulting - 2 hours',
          quantity: 2,
          rate: 500,
          total: 1000
        }
      ],
      subtotal: 1000,
      tax: 150, // 15% VAT
      total: 1150,
      status: 'sent',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Demo data initialized successfully!');
    console.log('\n📋 Demo Accounts:');
    console.log('Admin: admin@payflow.sz / admin123');
    console.log('Customer: customer@demo.com / demo123');
    console.log('\n🏢 Demo Company:', companyRef.id);
    console.log('💰 Customer wallet balance: 1000 SZL');
    console.log('📄 Demo invoice created and ready for payment');

  } catch (error) {
    console.error('❌ Error initializing data:', error);
  }
}

// Run initialization
initializeData().then(() => {
  console.log('🎉 Initialization complete!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Initialization failed:', error);
  process.exit(1);
});