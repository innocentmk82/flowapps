import { openDB, IDBPDatabase, deleteDB } from 'idb';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  writeBatch,
  onSnapshot,
  Timestamp,
  Query
} from 'firebase/firestore';
import { db } from './firebase';
import { User, Company, Client, Invoice, Receipt, Quotation, Admin } from '../types';

// Database schema
const DB_NAME = 'InvoiceAppDB';
const DB_VERSION = 2; // Increment version to trigger upgrade

interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  collection: string;
  data?: any;
  timestamp: number;
  userId: string;
}

interface DatabaseSchema {
  users: User;
  companies: Company;
  clients: Client;
  invoices: Invoice;
  receipts: Receipt;
  quotations: Quotation;
  admins: Admin;
  syncQueue: SyncQueueItem;
}

class DatabaseService {
  private db: IDBPDatabase<DatabaseSchema> | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private listeners: Map<string, (data: any[]) => void> = new Map();

  constructor() {
    this.initDatabase();
    this.setupNetworkListeners();
  }

  private async initDatabase() {
    try {
      this.db = await openDB<DatabaseSchema>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Users store
          if (!db.objectStoreNames.contains('users')) {
            db.createObjectStore('users', { keyPath: 'uid' });
          }

          // Companies store
          if (!db.objectStoreNames.contains('companies')) {
            db.createObjectStore('companies', { keyPath: 'id' });
          }

          // Admins store
          if (!db.objectStoreNames.contains('admins')) {
            const adminsStore = db.createObjectStore('admins', { keyPath: 'id' });
            adminsStore.createIndex('email', 'email');
          }

          // Clients store
          if (!db.objectStoreNames.contains('clients')) {
            const clientsStore = db.createObjectStore('clients', { keyPath: 'id' });
            clientsStore.createIndex('companyId', 'companyId');
          }

          // Invoices store
          if (!db.objectStoreNames.contains('invoices')) {
            const invoicesStore = db.createObjectStore('invoices', { keyPath: 'id' });
            invoicesStore.createIndex('companyId', 'companyId');
            invoicesStore.createIndex('clientId', 'clientId');
          }

          // Receipts store
          if (!db.objectStoreNames.contains('receipts')) {
            const receiptsStore = db.createObjectStore('receipts', { keyPath: 'id' });
            receiptsStore.createIndex('companyId', 'companyId');
            receiptsStore.createIndex('invoiceId', 'invoiceId');
          }

          // Quotations store
          if (!db.objectStoreNames.contains('quotations')) {
            const quotationsStore = db.createObjectStore('quotations', { keyPath: 'id' });
            quotationsStore.createIndex('companyId', 'companyId');
          }

          // Sync queue store
          if (!db.objectStoreNames.contains('syncQueue')) {
            const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
            syncStore.createIndex('timestamp', 'timestamp');
          }
        },
      });
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  private convertTimestampsToDates<T>(data: T[]): T[] {
    return data.map(item => {
      if (item && typeof item === 'object') {
        const converted = { ...item } as any;
        for (const [key, value] of Object.entries(converted)) {
          if (value instanceof Timestamp) {
            converted[key] = value.toDate();
          } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            converted[key] = this.convertTimestampsToDates([value])[0];
          }
        }
        return converted as T;
      }
      return item;
    });
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Generic CRUD operations
  async get<T>(collectionName: keyof DatabaseSchema, id: string): Promise<T | null> {
    if (!this.db) return null;

    try {
      if (this.isOnline) {
        // Try online first
        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as T;
          // Convert Firestore timestamps to Date objects
          const processedData = this.convertTimestampsToDates([data])[0];
          // Cache in IndexedDB
          await this.db.put(collectionName, processedData);
          return processedData;
        }
      } else {
        // Use offline data
        return await this.db.get(collectionName, id) as T;
      }
    } catch (error) {
      console.error(`Error getting ${collectionName}:`, error);
      // Fallback to offline data
      if (this.db) {
        return await this.db.get(collectionName, id) as T;
      }
    }
    return null;
  }

  async getAll<T>(collectionName: keyof DatabaseSchema, companyId?: string): Promise<T[]> {
    if (!this.db) return [];

    try {
      if (this.isOnline) {
        // Try online first
        let q: Query = collection(db, collectionName);
        if (companyId) {
          q = query(q, where('companyId', '==', companyId));
        }
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
        
        // Convert Firestore timestamps to Date objects
        const processedData = this.convertTimestampsToDates(data);
        
        // Cache in IndexedDB
        const tx = this.db.transaction(collectionName, 'readwrite');
        for (const item of processedData) {
          await tx.store.put(item);
        }
        await tx.done;
        
        return processedData;
      } else {
        // Use offline data
        if (companyId) {
          const index = this.db.transaction(collectionName).store.index('companyId');
          return await index.getAll(companyId) as T[];
        } else {
          return await this.db.getAll(collectionName) as T[];
        }
      }
    } catch (error) {
      console.error(`Error getting all ${collectionName}:`, error);
      // Fallback to offline data
      if (this.db) {
        if (companyId) {
          const index = this.db.transaction(collectionName).store.index('companyId');
          return await index.getAll(companyId) as T[];
        } else {
          return await this.db.getAll(collectionName) as T[];
        }
      }
    }
    return [];
  }

  async add<T>(collectionName: keyof DatabaseSchema, data: Omit<T, 'id'>, userId: string): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const id = `${collectionName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const item = { ...data, id } as T;

    try {
      if (this.isOnline) {
        // Add to Firebase
        const docRef = await addDoc(collection(db, collectionName), data);
        const firebaseId = docRef.id;
        
        // Update local data with Firebase ID
        const updatedItem = { ...item, id: firebaseId } as T;
        await this.db.put(collectionName, updatedItem);
        
        return firebaseId;
      } else {
        // Store locally and queue for sync
        await this.db.put(collectionName, item);
        await this.addToSyncQueue({
          id: `${id}_sync`,
          operation: 'create',
          collection: collectionName,
          data: item,
          timestamp: Date.now(),
          userId
        });
        
        return id;
      }
    } catch (error) {
      console.error(`Error adding ${collectionName}:`, error);
      // Store locally anyway
      await this.db.put(collectionName, item);
      await this.addToSyncQueue({
        id: `${id}_sync`,
        operation: 'create',
        collection: collectionName,
        data: item,
        timestamp: Date.now(),
        userId
      });
      
      return id;
    }
  }

  async update<T>(collectionName: keyof DatabaseSchema, id: string, data: Partial<T>, userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      if (this.isOnline) {
        // Update Firebase
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, data);
        
        // Update local cache
        const existing = await this.db.get(collectionName, id);
        if (existing) {
          await this.db.put(collectionName, { ...existing, ...data });
        }
      } else {
        // Update locally and queue for sync
        const existing = await this.db.get(collectionName, id);
        if (existing) {
          const updated = { ...existing, ...data };
          await this.db.put(collectionName, updated);
          await this.addToSyncQueue({
            id: `${id}_sync_${Date.now()}`,
            operation: 'update',
            collection: collectionName,
            data: { id, ...data },
            timestamp: Date.now(),
            userId
          });
        }
      }
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
      // Update locally anyway
      const existing = await this.db.get(collectionName, id);
      if (existing) {
        const updated = { ...existing, ...data };
        await this.db.put(collectionName, updated);
        await this.addToSyncQueue({
          id: `${id}_sync_${Date.now()}`,
          operation: 'update',
          collection: collectionName,
          data: { id, ...data },
          timestamp: Date.now(),
          userId
        });
      }
    }
  }

  async delete(collectionName: keyof DatabaseSchema, id: string, userId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      if (this.isOnline) {
        // Delete from Firebase
        const docRef = doc(db, collectionName, id);
        await deleteDoc(docRef);
        
        // Remove from local cache
        await this.db.delete(collectionName, id);
      } else {
        // Delete locally and queue for sync
        await this.db.delete(collectionName, id);
        await this.addToSyncQueue({
          id: `${id}_sync_${Date.now()}`,
          operation: 'delete',
          collection: collectionName,
          data: { id },
          timestamp: Date.now(),
          userId
        });
      }
    } catch (error) {
      console.error(`Error deleting ${collectionName}:`, error);
      // Delete locally anyway
      await this.db.delete(collectionName, id);
      await this.addToSyncQueue({
        id: `${id}_sync_${Date.now()}`,
        operation: 'delete',
        collection: collectionName,
        data: { id },
        timestamp: Date.now(),
        userId
      });
    }
  }

  // Sync queue management
  private async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    if (!this.db) return;
    await this.db.put('syncQueue', item);
  }

  private async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) return [];
    return await this.db.getAll('syncQueue');
  }

  private async removeFromSyncQueue(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.delete('syncQueue', id);
  }

  // Sync data when online
  async syncData(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || !this.db) return;

    this.syncInProgress = true;
    let successCount = 0;
    let errorCount = 0;
    
    try {
      const queue = await this.getSyncQueue();
      
      if (queue.length === 0) {
        console.log('No pending changes to sync');
        return;
      }
      
      console.log(`Syncing ${queue.length} pending changes...`);
      
      for (const item of queue) {
        try {
          switch (item.operation) {
            case 'create':
              if (item.data) {
                const { id, ...data } = item.data;
                await addDoc(collection(db, item.collection), data);
                successCount++;
              }
              break;
            case 'update':
              if (item.data) {
                const { id, ...data } = item.data;
                await updateDoc(doc(db, item.collection, id), data);
                successCount++;
              }
              break;
            case 'delete':
              if (item.data?.id) {
                await deleteDoc(doc(db, item.collection, item.data.id));
                successCount++;
              }
              break;
          }
          await this.removeFromSyncQueue(item.id);
        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error);
          errorCount++;
        }
      }
      
      console.log(`Sync completed: ${successCount} successful, ${errorCount} failed`);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Real-time listeners (online only)
  subscribeToCollection<T>(
    collectionName: keyof DatabaseSchema, 
    callback: (data: T[]) => void,
    companyId?: string
  ): () => void {
    if (!this.isOnline) {
      // Return offline data immediately
      this.getAll<T>(collectionName, companyId).then(callback);
      return () => {};
    }

    const listenerId = `${collectionName}_${companyId || 'all'}`;
    this.listeners.set(listenerId, callback);

    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
        callback(data);
        
        // Update local cache
        if (this.db) {
          const tx = this.db.transaction(collectionName, 'readwrite');
          for (const item of data) {
            tx.store.put(item);
          }
          tx.done.catch(console.error);
        }
      }
    );

    return () => {
      this.listeners.delete(listenerId);
      unsubscribe();
    };
  }

  // Utility methods
  isOnlineMode(): boolean {
    return this.isOnline;
  }

  async clearLocalData(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
    
    // Delete the entire database to force recreation
    await deleteDB(DB_NAME);
    
    // Reinitialize the database
    await this.initDatabase();
  }

  // Force database upgrade by clearing and recreating
  async forceUpgrade(): Promise<void> {
    console.log('Forcing database upgrade...');
    await this.clearLocalData();
    console.log('Database upgrade complete');
  }

  async getPendingSyncCount(): Promise<number> {
    if (!this.db) return 0;
    const queue = await this.db.getAll('syncQueue');
    return queue.length;
  }
}

// Export singleton instance
export const databaseService = new DatabaseService(); 