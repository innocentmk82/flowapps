export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'manager' | 'admin' | 'seller';
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean; // For admin to deactivate sellers
  addedBy?: string; // Track who added this user (for sellers)
  temporaryPassword?: string; // Temporary password set by admin
}

export interface Admin {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  addedBy?: string; // Track who added this admin
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  digitalSignature?: string;
  digitalStamp?: string;
  primaryColor: string;
  secondaryColor: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  vatRegistrationNumber?: string; // ESRA VAT compliance
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string; // Taxpayer ID (TIN) for SRA compliance
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  clientId: string;
  invoiceNumber: string;
  title: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issueDate: Date;
  dueDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // Track which seller created this invoice
}

export interface Receipt {
  id: string;
  companyId: string;
  invoiceId: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'other';
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // Track which seller created this receipt
}

export interface DashboardStats {
  totalInvoices: number;
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
  totalClients: number;
  monthlyRevenue: Array<{ month: string; revenue: number }>;
  recentInvoices: Invoice[];
}

export interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Accepted' | 'Declined' | 'Expired';

export interface Quotation {
  companyId: string;
  id: string;
  clientId: string;
  clientName: string;
  items: QuotationItem[];
  subtotal: number; // ESRA VAT compliance
  tax: number; // ESRA VAT compliance
  total: number;
  status: QuotationStatus;
  date: string;
  expiryDate: string;
  notes?: string;
  createdBy: string;
}

export interface UserManagement {
  id: string;
  companyId: string;
  email: string;
  displayName: string;
  role: 'manager' | 'admin' | 'seller';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  addedBy?: string;
  temporaryPassword?: string; // Temporary password set by admin
}