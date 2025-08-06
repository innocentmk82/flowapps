import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { FileText, Users, DollarSign, AlertCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardStats, Invoice, Receipt, Client } from '../types';
import { convertFirestoreTimestampToDate } from '../lib/utils';
import { StatsCard } from '../components/dashboard/StatsCard';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { RecentInvoices } from '../components/dashboard/RecentInvoices';
import { RecentReceipts } from '../components/dashboard/RecentReceipts';
import { subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { invoiceService, clientService, receiptService } from '../lib/dataService';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats & { trends?: { invoices: number; revenue: number; pending: number; clients: number } }>({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    totalClients: 0,
    monthlyRevenue: [],
    recentInvoices: [],
    trends: {
      invoices: 0,
      revenue: 0,
      pending: 0,
      clients: 0
    }
  });
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();



  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userProfile?.companyId) return;
      try {
        // Fetch invoices based on user role
        let invoices: Invoice[];
        if (userProfile.role === 'admin') {
          // Admin sees all invoices
          invoices = await invoiceService.getInvoices(userProfile.companyId);
        } else {
          // Seller sees only their invoices
          invoices = await invoiceService.getInvoicesBySeller(userProfile.companyId, userProfile.uid);
        }
        // Ensure all dates are properly converted to Date objects
        const processedInvoices = invoices.map(invoice => ({
          ...invoice,
          issueDate: invoice.issueDate instanceof Date ? invoice.issueDate : new Date(invoice.issueDate),
          dueDate: invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate),
          createdAt: invoice.createdAt instanceof Date ? invoice.createdAt : new Date(invoice.createdAt),
          updatedAt: invoice.updatedAt instanceof Date ? invoice.updatedAt : new Date(invoice.updatedAt)
        }));
        setInvoices(processedInvoices);
        
        // Fetch clients (for now, all clients are visible to both admin and sellers)
        // In the future, you might want to filter clients based on who created them
        let clients = await clientService.getClients(userProfile.companyId);
        // Ensure all dates are properly converted to Date objects
        const processedClients = clients.map(client => ({
          ...client,
          createdAt: client.createdAt instanceof Date ? client.createdAt : new Date(client.createdAt),
          updatedAt: client.updatedAt instanceof Date ? client.updatedAt : new Date(client.updatedAt)
        }));
        setClients(processedClients);
        
        // Fetch receipts based on user role
        let receiptsData: Receipt[];
        if (userProfile.role === 'admin') {
          // Admin sees all receipts
          receiptsData = await receiptService.getReceipts(userProfile.companyId);
        } else {
          // Seller sees only their receipts
          receiptsData = await receiptService.getReceiptsBySeller(userProfile.companyId, userProfile.uid);
        }
        // Ensure all dates are properly converted to Date objects
        const processedReceipts = receiptsData.map(receipt => ({
          ...receipt,
          date: receipt.date instanceof Date ? receipt.date : new Date(receipt.date),
          createdAt: receipt.createdAt instanceof Date ? receipt.createdAt : new Date(receipt.createdAt),
          updatedAt: receipt.updatedAt instanceof Date ? receipt.updatedAt : new Date(receipt.updatedAt)
        }));
        setReceipts(processedReceipts);
        
        // Calculate stats
        const totalInvoices = processedInvoices.length;
        const totalRevenue = processedInvoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.total, 0);
        const pendingAmount = processedInvoices
          .filter(inv => inv.status === 'sent')
          .reduce((sum, inv) => sum + inv.total, 0);
        const overdueAmount = processedInvoices
          .filter(inv => inv.status === 'overdue')
          .reduce((sum, inv) => sum + inv.total, 0);
        const totalClients = processedClients.length;
        
        // --- Calculate monthly revenue from receipts ---
        const now = new Date();
        const months = [];
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          const monthName = monthStart.toLocaleString('en-US', { month: 'short' });
          
          // Calculate revenue from receipts (actual payments received)
          const revenue = processedReceipts
            .filter(receipt => receipt.date && isWithinInterval(new Date(receipt.date), { start: monthStart, end: monthEnd }))
            .reduce((sum, receipt) => sum + receipt.amount, 0);
          
          months.push({ month: monthName, revenue });
        }
        const monthlyRevenue = months;
        
        // --- Calculate trends (current month vs previous month) ---
        const thisMonth = months[5].revenue;
        const lastMonth = months[4].revenue;
        const revenueTrend = lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
        
        // Invoices trend
        const thisMonthInvoices = processedInvoices.filter(inv => {
          if (!inv.createdAt) return false;
          const d = new Date(inv.createdAt);
          return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
        }).length;
        const lastMonthInvoices = processedInvoices.filter(inv => {
          if (!inv.createdAt) return false;
          const d = new Date(inv.createdAt);
          return isWithinInterval(d, { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) });
        }).length;
        const invoicesTrend = lastMonthInvoices === 0 ? (thisMonthInvoices > 0 ? 100 : 0) : Math.round(((thisMonthInvoices - lastMonthInvoices) / lastMonthInvoices) * 100);
        
        // Pending trend - calculate based on invoice amounts, not receipt amounts
        const thisMonthPending = processedInvoices.filter(inv => inv.status === 'sent' && inv.createdAt && isWithinInterval(new Date(inv.createdAt), { start: startOfMonth(now), end: endOfMonth(now) })).reduce((sum, inv) => sum + inv.total, 0);
        const lastMonthPending = processedInvoices.filter(inv => inv.status === 'sent' && inv.createdAt && isWithinInterval(new Date(inv.createdAt), { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) })).reduce((sum, inv) => sum + inv.total, 0);
        const pendingTrend = lastMonthPending === 0 ? (thisMonthPending > 0 ? 100 : 0) : Math.round(((thisMonthPending - lastMonthPending) / lastMonthPending) * 100);
        
        // Clients trend
        const thisMonthClients = processedClients.filter(client => {
          if (!client.createdAt) return false;
          const d = new Date(client.createdAt);
          return isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) });
        }).length;
        const lastMonthClients = processedClients.filter(client => {
          if (!client.createdAt) return false;
          const d = new Date(client.createdAt);
          return isWithinInterval(d, { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) });
        }).length;
        const clientsTrend = lastMonthClients === 0 ? (thisMonthClients > 0 ? 100 : 0) : Math.round(((thisMonthClients - lastMonthClients) / lastMonthClients) * 100);
        
        // Fetch recent invoices
        const recentInvoices = [...processedInvoices]
          .sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0))
          .slice(0, 5);
        
        setStats({
          totalInvoices,
          totalRevenue,
          pendingAmount,
          overdueAmount,
          totalClients,
          monthlyRevenue,
          recentInvoices,
          trends: {
            invoices: invoicesTrend,
            revenue: revenueTrend,
            pending: pendingTrend,
            clients: clientsTrend
          }
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [userProfile?.companyId, userProfile?.role, userProfile?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#181f2a] space-y-6">
      {/* Personalized Header */}
      <div className="bg-white dark:bg-[#1e293b] rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back, {userProfile?.displayName}!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {userProfile?.role === 'admin' 
                ? 'Here\'s an overview of all company activities'
                : 'Here\'s your personalized dashboard with your invoices and performance'
              }
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              userProfile?.role === 'admin' 
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {userProfile?.role === 'admin' ? 'Administrator' : 'Seller'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={userProfile?.role === 'admin' ? "Total Invoices" : "My Invoices"}
          value={stats.totalInvoices}
          icon={FileText}
          trend={stats.trends?.invoices ?? 0}
        />
        <StatsCard
          title={userProfile?.role === 'admin' ? "Total Revenue" : "My Revenue"}
          value={stats.totalRevenue}
          icon={DollarSign}
          format="currency"
          trend={stats.trends?.revenue ?? 0}
        />
        <StatsCard
          title={userProfile?.role === 'admin' ? "Pending Amount" : "My Pending"}
          value={stats.pendingAmount}
          icon={AlertCircle}
          format="currency"
          trend={stats.trends?.pending ?? 0}
        />
        <StatsCard
          title={userProfile?.role === 'admin' ? "Total Clients" : "My Clients"}
          value={stats.totalClients}
          icon={Users}
          trend={stats.trends?.clients ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart data={stats.monthlyRevenue} userRole={userProfile?.role as 'admin' | 'seller'} />
        <RecentInvoices invoices={stats.recentInvoices} userRole={userProfile?.role as 'admin' | 'seller'} />
        <RecentReceipts receipts={receipts} invoices={invoices} clients={clients} userRole={userProfile?.role as 'admin' | 'seller'} />
      </div>
    </div>
  );
};