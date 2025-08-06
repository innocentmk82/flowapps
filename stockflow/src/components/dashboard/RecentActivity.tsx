import React, { useState, useEffect } from 'react';
import { Clock, ShoppingCart, Package, TrendingUp } from 'lucide-react';
import { salesService } from '../../services/salesService';
import { restockService } from '../../services/restockService';
import { format } from 'date-fns';

interface Activity {
  id: string;
  type: 'sale' | 'restock';
  description: string;
  timestamp: Date;
  amount?: number;
}

const RecentActivity: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentActivity = async () => {
      try {
        // Get recent sales
        const recentSales = await salesService.getSales();
        const salesActivities: Activity[] = recentSales.slice(0, 5).map(sale => ({
          id: sale.id,
          type: 'sale',
          description: `Sale of ${sale.items.length} item(s) by ${sale.attendantEmail}`,
          timestamp: sale.createdAt,
          amount: sale.total
        }));

        // Get recent restocks
        const recentRestocks = await restockService.getRestockHistory();
        const restockActivities: Activity[] = recentRestocks.slice(0, 5).map(restock => ({
          id: restock.id,
          type: 'restock',
          description: `Restocked ${restock.quantity} units of ${restock.productName}`,
          timestamp: restock.createdAt
        }));

        // Combine and sort by timestamp
        const allActivities = [...salesActivities, ...restockActivities]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10);

        setActivities(allActivities);
      } catch (error) {
        console.error('Error loading recent activity:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecentActivity();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'restock':
        return <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Package className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6 transition-colors duration-200">
      <div className="flex items-center mb-6">
        <Clock className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h3>
      </div>

      {activities.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No recent activity to display
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg gap-2"
            >
              <div className="flex items-center">
                {getActivityIcon(activity.type)}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {format(activity.timestamp, 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </div>
              {activity.amount && (
                <span className="text-sm font-semibold text-green-600 dark:text-green-400 sm:text-right">
                  ${activity.amount.toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;