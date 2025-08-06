export interface User {
  id: string;
  email: string;
  role: 'client' | 'merchant';
  firstName: string;
  lastName: string;
  businessName?: string;
  walletBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  payerId: string;
  receiverId: string;
  amount: number;
  type: 'topup' | 'payment' | 'invoice' | 'product';
  reference?: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  metadata?: {
    invoiceId?: string;
    productId?: string;
    productCode?: string;
    receiverEmail?: string;
    merchantName?: string;
    paymentMethod?: 'momo' | 'bank_transfer' | 'momo_send';
    phoneNumber?: string;
    momoReference?: string;
    referenceNumber?: string;
    depositRequestId?: string;
  };
}

export interface Merchant {
  id: string;
  businessName: string;
  totalRevenue: number;
  totalInvoices: number;
  pendingAmount: number;
  totalClients: number;
  linkedSystems: {
    stockFlow?: boolean;
    invoiceFlow?: boolean;
  };
}

export interface Invoice {
  id: string;
  merchantId: string;
  clientEmail: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'overdue';
  dueDate: Date;
  createdAt: Date;
  paidAt?: Date;
  paidBy?: string;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  category: string;
  description?: string;
}

export interface PaymentReference {
  id: string;
  referenceNumber: string;
  userId: string;
  amount: number;
  method: 'bank_transfer' | 'momo_send';
  status: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface MoMoPaymentRequest {
  phoneNumber: string;
  amount: number;
  description: string;
  userId: string;
}