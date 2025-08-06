import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  writeBatch,
  doc 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Sale, SaleItem } from '../types';
import { productService } from './productService';

export const salesService = {
  // Process sale and update inventory
  async processSale(saleData: {
    items: SaleItem[];
    total: number;
    attendantId: string;
    attendantEmail: string;
  }) {
    const batch = writeBatch(db);
    
    // Create sale record
    const saleRef = doc(collection(db, 'sales'));
    const sale = {
      ...saleData,
      createdAt: Timestamp.now()
    };
    batch.set(saleRef, sale);
    
    // Update product quantities
    for (const item of saleData.items) {
      const productRef = doc(db, 'products', item.productId);
      batch.update(productRef, {
        quantity: item.quantity, // This should be the new quantity after sale
        updatedAt: Timestamp.now()
      });
    }
    
    await batch.commit();
    return saleRef.id;
  },

  // Get sales history
  async getSales(startDate?: Date, endDate?: Date): Promise<Sale[]> {
    let q = query(collection(db, 'sales'), orderBy('createdAt', 'desc'));
    
    if (startDate && endDate) {
      q = query(
        collection(db, 'sales'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc')
      );
    }
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    } as Sale));
  },

  // Get sales by attendant
  async getSalesByAttendant(attendantId: string): Promise<Sale[]> {
    const q = query(
      collection(db, 'sales'),
      where('attendantId', '==', attendantId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    } as Sale));
  },

  // Calculate sales analytics
  async getSalesAnalytics(period: 'daily' | 'weekly' | 'monthly') {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }
    
    const sales = await this.getSales(startDate, now);
    
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalTransactions = sales.length;
    
    // Calculate top selling products
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.total;
      });
    });
    
    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
    
    return {
      totalSales,
      totalTransactions,
      averageTransactionValue: totalTransactions > 0 ? totalSales / totalTransactions : 0,
      topProducts,
      salesData: sales
    };
  }
};