import React, { useState, useEffect } from 'react';
import { Package, DollarSign, TrendingDown, ShoppingCart } from 'lucide-react';
import { productService } from '../../services/productService';
import { salesService } from '../../services/salesService';
import { Product, InventoryStats } from '../../types';
import { formatCurrency } from '../../utils/currency';
import StatsCard from './StatsCard';
import LowStockAlert from './LowStockAlert';
import RecentActivity from './RecentActivity';

const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockCount: 0,
    totalSales: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load products
        const productsData = await productService.getProducts();
        setProducts(productsData);

        // Calculate stats
        const totalProducts = productsData.length;
        const totalValue = productsData.reduce((sum, product) => 
          sum + (product.price * product.quantity), 0
        );
        const lowStockCount = productsData.filter(product => 
          product.quantity <= product.lowStockThreshold
        ).length;

        // Get today's sales
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const sales = await salesService.getSales(startOfDay, today);
        const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);

        setStats({
          totalProducts,
          totalValue,
          lowStockCount,
          totalSales
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const lowStockProducts = products.filter(product => 
    product.quantity <= product.lowStockThreshold
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Welcome to your inventory management system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts.toString()}
          icon={Package}
          color="blue"
        />
        <StatsCard
          title="Inventory Value"
          value={formatCurrency(stats.totalValue)}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Low Stock Items"
          value={stats.lowStockCount.toString()}
          icon={TrendingDown}
          color="red"
        />
        <StatsCard
          title="Today's Sales"
          value={formatCurrency(stats.totalSales)}
          icon={ShoppingCart}
          color="purple"
        />
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <LowStockAlert products={lowStockProducts} />
      )}

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
};

export default Dashboard;