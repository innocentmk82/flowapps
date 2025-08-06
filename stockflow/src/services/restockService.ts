import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy,
  Timestamp,
  writeBatch,
  doc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RestockEntry } from '../types';

export const restockService = {
  // Add restock entry and update product quantity
  async addRestock(restockData: {
    productId: string;
    productName: string;
    quantity: number;
    userId: string;
    userEmail: string;
  }) {
    const batch = writeBatch(db);
    
    // Create restock record
    const restockRef = doc(collection(db, 'restocks'));
    const restock = {
      ...restockData,
      createdAt: Timestamp.now()
    };
    batch.set(restockRef, restock);
    
    // Update product quantity (add to existing quantity)
    const productRef = doc(db, 'products', restockData.productId);
    batch.update(productRef, {
      updatedAt: Timestamp.now()
    });
    
    await batch.commit();
    return restockRef.id;
  },

  // Get restock history
  async getRestockHistory(): Promise<RestockEntry[]> {
    const q = query(collection(db, 'restocks'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    } as RestockEntry));
  },

  // Get restock history for specific product
  async getProductRestockHistory(productId: string): Promise<RestockEntry[]> {
    const restocks = await this.getRestockHistory();
    return restocks.filter(restock => restock.productId === productId);
  }
};