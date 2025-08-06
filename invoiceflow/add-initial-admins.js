import { db } from './src/lib/firebaseAdmin.js';

// Initial admin emails that are authorized to register
const initialAdmins = [
  {
    email: 'my.manager@email.com', // <-- your email here
    displayName: 'My Manager Name', // <-- your name here
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    addedBy: 'system'
  }
];

async function addInitialAdmins() {
  try {
    console.log('Adding initial admin emails to the database...');
    
    for (const admin of initialAdmins) {
      await db.collection('admins').add(admin);
      console.log(`✅ Added admin: ${admin.email}`);
    }
    
    console.log('🎉 All initial admins have been added successfully!');
    console.log('\nAuthorized emails for registration:');
    initialAdmins.forEach(admin => {
      console.log(`- ${admin.email} (${admin.displayName})`);
    });
    
  } catch (error) {
    console.error('❌ Error adding initial admins:', error);
  }
}

// Run the script
addInitialAdmins(); 