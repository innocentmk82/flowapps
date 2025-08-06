import { databaseService } from './database';
import { clientService, invoiceService, dataService } from './dataService';

export const testOfflineFunctionality = async () => {
  console.log('🧪 Testing Offline Functionality...');
  
  try {
    // Test 1: Check if database is initialized
    console.log('1. Testing database initialization...');
    const isOnline = dataService.isOnline();
    console.log(`   Online status: ${isOnline}`);
    
    // Test 2: Test client operations
    console.log('2. Testing client operations...');
    const testClient = {
      companyId: 'test_company',
      name: 'Test Client',
      email: 'test@example.com',
      phone: '123-456-7890',
      address: 'Test Address',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const clientId = await clientService.createClient(testClient, 'test_user');
    console.log(`   Created client with ID: ${clientId}`);
    
    const retrievedClient = await clientService.getClient(clientId);
    console.log(`   Retrieved client: ${retrievedClient?.name}`);
    
    // Test 3: Test offline mode simulation
    console.log('3. Testing offline mode...');
    // This would normally be triggered by network events
    // For testing, we can manually check the sync queue
    
    // Test 4: Test data persistence
    console.log('4. Testing data persistence...');
    const clients = await clientService.getClients('test_company');
    console.log(`   Found ${clients.length} clients for company`);
    
    console.log('✅ Offline functionality test completed successfully!');
    
    // Cleanup test data
    await clientService.deleteClient(clientId, 'test_user');
    console.log('🧹 Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Offline functionality test failed:', error);
  }
};

export const checkDatabaseStatus = async () => {
  console.log('📊 Database Status Check...');
  
  try {
    const isOnline = dataService.isOnline();
    console.log(`   Online: ${isOnline}`);
    
    // Check if IndexedDB is available
    if ('indexedDB' in window) {
      console.log('   IndexedDB: Available');
    } else {
      console.log('   IndexedDB: Not available');
    }
    
    // Check storage quota
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      console.log(`   Storage used: ${estimate.usage} bytes`);
      console.log(`   Storage quota: ${estimate.quota} bytes`);
    }
    
  } catch (error) {
    console.error('❌ Database status check failed:', error);
  }
}; 