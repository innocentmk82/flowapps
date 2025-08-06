// Run this script in the browser console to fix the database schema issue
// This will clear the IndexedDB and force a fresh database creation

console.log('🔧 Fixing database schema...');

// Clear the IndexedDB database
const dbName = 'InvoiceAppDB';
const request = indexedDB.deleteDatabase(dbName);

request.onsuccess = function() {
  console.log('✅ Database deleted successfully');
  console.log('🔄 Please refresh the page to recreate the database with the new schema');
  alert('Database cleared successfully! Please refresh the page.');
};

request.onerror = function() {
  console.error('❌ Error deleting database:', request.error);
  alert('Error clearing database. Please try refreshing the page manually.');
};

request.onblocked = function() {
  console.warn('⚠️ Database deletion was blocked. Please close other tabs and try again.');
  alert('Database deletion was blocked. Please close other tabs and try again.');
}; 