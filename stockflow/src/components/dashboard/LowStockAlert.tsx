import React from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { Product } from '../../types';

interface LowStockAlertProps {
  products: Product[];
}

const LowStockAlert: React.FC<LowStockAlertProps> = ({ products }) => {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" />
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
          Low Stock Alert
        </h3>
      </div>
      
      <p className="text-red-700 dark:text-red-300 mb-4">
        The following products are running low on stock:
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 lg:p-4 border border-red-200 dark:border-red-800"
          >
            <div className="flex items-center">
              <Package className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm lg:text-base">
                  {product.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  SKU: {product.sku}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  Only {product.quantity} left
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LowStockAlert;