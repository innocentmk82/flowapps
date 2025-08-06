import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { PaymentService } from './paymentService';

export interface InvoiceFlowInvoice {
  id: string;
  merchantId: string;
  clientEmail: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: Date;
  createdAt: Date;
}

export interface StockFlowProduct {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  category: string;
}

export class IntegrationService {
  // InvoiceFlow Integration
  static async createInvoice(
    merchantId: string,
    clientEmail: string,
    amount: number,
    description: string,
    dueDate: Date
  ): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
    try {
      const invoiceData: Omit<InvoiceFlowInvoice, 'id'> = {
        merchantId,
        clientEmail,
        amount,
        description,
        status: 'pending',
        dueDate,
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
      return { success: true, invoiceId: docRef.id };
    } catch (error) {
      return { success: false, error: 'Failed to create invoice' };
    }
  }

  static async payInvoice(
    invoiceId: string,
    payerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceDoc = await getDoc(invoiceRef);

      if (!invoiceDoc.exists()) {
        return { success: false, error: 'Invoice not found' };
      }

      const invoiceData = invoiceDoc.data() as InvoiceFlowInvoice;
      
      if (invoiceData.status === 'paid') {
        return { success: false, error: 'Invoice already paid' };
      }

      // Process payment
      const paymentResult = await PaymentService.processPayment(
        payerId,
        invoiceData.merchantId,
        invoiceData.amount,
        'invoice',
        `Invoice Payment - ${invoiceId}`,
        { invoiceId }
      );

      if (paymentResult.success) {
        // Mark invoice as paid
        await updateDoc(invoiceRef, {
          status: 'paid',
          paidAt: new Date(),
          paidBy: payerId,
        });

        return { success: true };
      }

      return { success: false, error: paymentResult.error };
    } catch (error) {
      return { success: false, error: 'Failed to process invoice payment' };
    }
  }

  static async getMerchantInvoices(merchantId: string): Promise<InvoiceFlowInvoice[]> {
    try {
      const q = query(
        collection(db, 'invoices'),
        where('merchantId', '==', merchantId)
      );

      const querySnapshot = await getDocs(q);
      const invoices: InvoiceFlowInvoice[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        invoices.push({
          id: doc.id,
          ...data,
          dueDate: data.dueDate?.toDate?.() || new Date(),
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as InvoiceFlowInvoice);
      });

      return invoices;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  // StockFlow Integration
  static async createProduct(
    merchantId: string,
    name: string,
    price: number,
    quantity: number,
    sku: string,
    category: string
  ): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
      const productData: Omit<StockFlowProduct, 'id'> = {
        merchantId,
        name,
        price,
        quantity,
        sku,
        category,
      };

      const docRef = await addDoc(collection(db, 'products'), productData);
      return { success: true, productId: docRef.id };
    } catch (error) {
      return { success: false, error: 'Failed to create product' };
    }
  }

  static async purchaseProduct(
    productId: string,
    payerId: string,
    quantity: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const productRef = doc(db, 'products', productId);
      const productDoc = await getDoc(productRef);

      if (!productDoc.exists()) {
        return { success: false, error: 'Product not found' };
      }

      const productData = productDoc.data() as StockFlowProduct;
      
      if (productData.quantity < quantity) {
        return { success: false, error: 'Insufficient stock' };
      }

      const totalAmount = productData.price * quantity;

      // Process payment
      const paymentResult = await PaymentService.processPayment(
        payerId,
        productData.merchantId,
        totalAmount,
        'product',
        `Product Purchase - ${productData.name} (x${quantity})`,
        { productId, quantity, productName: productData.name }
      );

      if (paymentResult.success) {
        // Update product quantity
        await updateDoc(productRef, {
          quantity: productData.quantity - quantity,
        });

        return { success: true };
      }

      return { success: false, error: paymentResult.error };
    } catch (error) {
      return { success: false, error: 'Failed to process product purchase' };
    }
  }

  static async getMerchantProducts(merchantId: string): Promise<StockFlowProduct[]> {
    try {
      const q = query(
        collection(db, 'products'),
        where('merchantId', '==', merchantId)
      );

      const querySnapshot = await getDocs(q);
      const products: StockFlowProduct[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({
          id: doc.id,
          ...data,
        } as StockFlowProduct);
      });

      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  // Payment trigger functions for external systems
  static async triggerStockFlowPayment(
    productId: string,
    payerId: string,
    quantity: number
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const result = await this.purchaseProduct(productId, payerId, quantity);
    return result;
  }

  static async triggerInvoiceFlowPayment(
    invoiceId: string,
    payerId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const result = await this.payInvoice(invoiceId, payerId);
    return result;
  }
}