import React from 'react';
import { motion } from 'framer-motion';
import { Receipt, Invoice, Client } from '../../types';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { formatCurrency, formatDate } from '../../lib/utils';

interface RecentReceiptsProps {
  receipts: Receipt[];
  invoices: Invoice[];
  clients: Client[];
  userRole?: string;
}

export const RecentReceipts: React.FC<RecentReceiptsProps> = ({ receipts, invoices, clients, userRole }) => {
  const getMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'card':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'transfer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'other':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const recentReceipts = receipts
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  if (recentReceipts.length === 0) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {userRole === 'admin' ? 'Recent Receipts' : 'My Recent Receipts'}
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {userRole === 'admin' 
                ? 'No receipts found. Create your first receipt to see it here.'
                : 'No receipts found. Create your first receipt to see it here.'
              }
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {userRole === 'admin' ? 'Recent Receipts' : 'My Recent Receipts'}
        </h3>
        <div className="space-y-4">
          {recentReceipts.map((receipt) => {
            const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
            const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
            
            return (
              <motion.div
                key={receipt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-300 text-sm font-medium">
                          {receipt.id.slice(-4).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {invoice?.invoiceNumber || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {client?.name || 'Unknown Client'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(receipt.amount)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(receipt.date)}
                    </p>
                  </div>
                  <Badge className={getMethodColor(receipt.method)}>
                    {receipt.method}
                  </Badge>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}; 