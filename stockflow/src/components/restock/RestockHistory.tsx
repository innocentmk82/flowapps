import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Package } from 'lucide-react';
import { restockService } from '../../services/restockService';
import { RestockEntry } from '../../types';
import { format } from 'date-fns';

interface RestockHistoryProps {
  onClose: () => void;
}

const RestockHistory: React.FC<RestockHistoryProps> = ({ onClose }) => {
  const [restocks, setRestocks] = useState<RestockEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestocks();
  }, []);

  const loadRestocks = async () => {
    try {
      const restocksData = await restockService.getRestockHistory();
      setRestocks(restocksData);
    } catch (error) {
      console.error('Error loading restocks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-8">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-w-[95vw] my-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Restock History
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {restocks.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No restock history found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Restock entries will appear here once products are restocked.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {restocks.map((restock) => (
                <div
                  key={restock.id}
                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(restock.createdAt, 'MMM dd, yyyy HH:mm')}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <User className="h-4 w-4 mr-1" />
                        {restock.userEmail}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {restock.productName}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        +{restock.quantity} units
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestockHistory;