export interface User {
  id: string;
  email: string;
  role: 'admin' | 'general_user';
  profile: {
    firstName: string;
    lastName: string;
    businessName?: string;
    phone?: string;
    address?: string;
  };
  walletBalance: number;
  isActive: boolean;
  permissions: {
    payflow: boolean;
    invoiceflow: boolean;
    stockflow: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  ownerId: string; // Admin user ID
  settings: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    address: string;
    phone: string;
    email: string;
    vatNumber?: string;
  };
  integrations: {
    payflow: { enabled: boolean; merchantId: string };
    invoiceflow: { enabled: boolean };
    stockflow: { enabled: boolean };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  payerId: string;
  receiverId: string;
  companyId?: string;
  amount: number;
  type: 'wallet_topup' | 'invoice_payment' | 'product_purchase' | 'transfer';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  sourceApp: 'payflow' | 'invoiceflow' | 'stockflow';
  metadata: {
    invoiceId?: string;
    orderId?: string;
    productId?: string;
    paymentMethod?: 'wallet' | 'momo' | 'bank_transfer';
    reference?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  companyId: string;
  clientId?: string;
  clientEmail: string;
  invoiceNumber: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidAt?: Date;
  paymentTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  companyId: string;
  customerId: string;
  customerEmail: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  paymentTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'payment_notification' | 'invoice_notification' | 'order_notification' | 'system_notification';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Payment request types
export interface PaymentRequest {
  amount: number;
  description: string;
  metadata?: any;
}

export interface InvoicePaymentRequest extends PaymentRequest {
  invoiceId: string;
  payerEmail: string;
}

export interface OrderPaymentRequest extends PaymentRequest {
  orderId: string;
  payerEmail: string;
}

// Analytics types
export interface CompanyAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  invoiceRevenue: number;
  productRevenue: number;
  averageTransactionValue: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface UserAnalytics {
  totalSpent: number;
  totalTransactions: number;
  favoriteCategories: string[];
  monthlySpending: Array<{
    month: string;
    amount: number;
  }>;
}