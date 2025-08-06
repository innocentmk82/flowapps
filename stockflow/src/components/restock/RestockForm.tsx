import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Product } from '../../types';

interface RestockFormProps {
  products: Product[];
  selectedProduct?: Product | null;
  onSubmit: (productId: string, quantity: number) => void;
  onCancel: () => void;
}

const RestockForm: React.FC<RestockFormProps> = ({
  products,
  selectedProduct,
  onSubmit,
  onCancel
}) => {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      setProductId(selectedProduct.id);
    }
  }, [selectedProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId || !quantity) {
      alert('Please fill in all fields');
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(productId, qty);
    } finally {
      setLoading(false);
    }
  };

  const selectedProductData = products.find(p => p.id === productId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-w-[95vw] my-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Add Restock
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Product *
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
              disabled={!!selectedProduct}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
            >
              <option value="">Select a product</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} (SKU: {product.sku}) - Current: {product.quantity}
                </option>
              ))}
            </select>
          </div>

          {selectedProductData && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Product Details
              </h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Name:</span> {selectedProductData.name}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">SKU:</span> {selectedProductData.sku}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Current Stock:</span> {selectedProductData.quantity}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Low Stock Threshold:</span> {selectedProductData.lowStockThreshold}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Quantity to Add *
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter quantity to add"
            />
          </div>

          {selectedProductData && quantity && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <span className="font-medium">New Stock Level:</span>{' '}
                {selectedProductData.quantity + parseInt(quantity || '0')} units
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? 'Adding...' : 'Add Restock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestockForm;