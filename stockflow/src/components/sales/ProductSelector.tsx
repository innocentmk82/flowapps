import React, { useState } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/currency';
import QuaggaScanner from '../common/QuaggaScanner';

interface ProductSelectorProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  onClose: () => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  products,
  onAddToCart,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [scannerOpen, setScannerOpen] = useState(false);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuantityChange = (productId: string, quantity: number) => {
    setQuantities({
      ...quantities,
      [productId]: Math.max(1, quantity)
    });
  };

  const handleAddToCart = (product: Product) => {
    const quantity = quantities[product.id] || 1;
    if (quantity > product.quantity) {
      alert(`Only ${product.quantity} units available`);
      return;
    }
    onAddToCart(product, quantity);
    setQuantities({ ...quantities, [product.id]: 1 });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-w-[98vw] sm:max-w-[95vw] my-2 sm:my-4 max-h-[98vh] sm:max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
            Select Products
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-3 sm:p-4 lg:p-6">
          <div className="relative mb-4 sm:mb-6 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <span className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </span>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm whitespace-nowrap"
            >
              Scan Barcode
            </button>
          </div>

          {/* Barcode Scanner Modal */}
          {scannerOpen && (
            <QuaggaScanner
              onDetected={(code) => {
                setSearchTerm(code);
                setScannerOpen(false);
              }}
              onClose={() => setScannerOpen(false)}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-80 sm:max-h-96 overflow-y-auto">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
              >
                <h3 className="font-medium text-gray-900 dark:text-white mb-1 text-sm lg:text-base">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  SKU: {product.sku}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {formatCurrency(product.price)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Stock: {product.quantity}
                </p>
                
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={product.quantity}
                    value={quantities[product.id] || 1}
                    onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No products found matching your search.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSelector;