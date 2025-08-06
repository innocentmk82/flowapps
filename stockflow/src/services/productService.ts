import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Product } from '../types';

export const productService = {
  // Add new product
  async addProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    const product = {
      ...productData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'products'), product);
    return docRef.id;
  },

  // Update product
  async updateProduct(id: string, productData: Partial<Product>) {
    const productRef = doc(db, 'products', id);
    await updateDoc(productRef, {
      ...productData,
      updatedAt: Timestamp.now()
    });
  },

  // Delete product
  async deleteProduct(id: string) {
    const productRef = doc(db, 'products', id);
    await deleteDoc(productRef);
  },

  // Get all products
  async getProducts(): Promise<Product[]> {
    const q = query(collection(db, 'products'), orderBy('name'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    } as Product));
  },

  // Search products
  async searchProducts(searchTerm: string): Promise<Product[]> {
    const products = await this.getProducts();
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  },

  // Get products by category
  async getProductsByCategory(category: string): Promise<Product[]> {
    const q = query(
      collection(db, 'products'), 
      where('category', '==', category),
      orderBy('name')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      updatedAt: doc.data().updatedAt.toDate()
    } as Product));
  },

  // Real-time products listener
  subscribeToProducts(callback: (products: Product[]) => void) {
    const q = query(collection(db, 'products'), orderBy('name'));
    
    return onSnapshot(q, (querySnapshot) => {
      const products = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      } as Product));
      
      callback(products);
    });
  },

  // Update stock quantity
  async updateStock(productId: string, newQuantity: number) {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      quantity: newQuantity,
      updatedAt: Timestamp.now()
    });
  }
};