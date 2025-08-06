export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'attendant';
  displayName?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  createdAt: Date;
  attendantId: string;
  attendantEmail: string;
}

export interface RestockEntry {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  createdAt: Date;
  userId: string;
  userEmail: string;
}

export interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  totalSales: number;
}

export interface Theme {
  mode: 'light' | 'dark';
}