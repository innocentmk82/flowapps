import React, { useState, useEffect } from 'react';
import { TrendingUp, Plus, Package, History } from 'lucide-react';
import { productService } from '../../services/productService';
import { restockService } from '../../services/restockService';
import { Product, RestockEntry } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/currency';
import RestockForm from './RestockForm';
import RestockHistory from './RestockHistory';
import { addToQueue, OfflineAction } from '../../utils/offlineQueue';
import { syncQueuedActions, setupSyncOnReconnect } from '../../utils/syncManager';
import { useToast } from '../../contexts/ToastContext';

const RestockPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [restockHistory, setRestockHistory] = useState<RestockEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    setupSyncOnReconnect((msg) => showToast(msg, 'error'));
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, historyData] = await Promise.all([
        productService.getProducts(),
        restockService.getRestockHistory()
      ]);
      setProducts(productsData);
      setRestockHistory(historyData.slice(0, 10)); // Show last 10 entries
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (productId: string, quantity: number) => {
    if (!currentUser) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
      if (!navigator.onLine) {
        // Offline: queue the restock
        await addToQueue({
          type: 'restock',
          payload: {
            productId,
            productName: product.name,
            quantity,
            userId: currentUser.uid,
            userEmail: currentUser.email
          },
          timestamp: Date.now()
        });
        showToast('You are offline. Restock has been queued and will sync when online.', 'info');
        setShowForm(false);
        setSelectedProduct(null);
        return;
      }

      // Online: process restock and sync any queued actions
      await restockService.addRestock({
        productId,
        productName: product.name,
        quantity,
        userId: currentUser.uid,
        userEmail: currentUser.email
      });
      await productService.updateStock(productId, product.quantity + quantity);
      await syncQueuedActions((msg) => showToast(msg, 'error'))
        .then((ok) => {
          if (ok) showToast('Queued restocks synced successfully!', 'success');
        })
        .catch(() => showToast('Some queued restocks failed to sync.', 'error'));
      await loadData();
      setShowForm(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error processing restock:', error);
      showToast('Failed to process restock', 'error');
    }
  };

  const lowStockProducts = products.filter(p => p.quantity <= p.lowStockThreshold);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Restock</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage inventory restocking and track history
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            <History className="h-5 w-5 mr-2" />
            View History
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Restock
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" />
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
              Low Stock Alert ({lowStockProducts.length} items)
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 lg:p-4 border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm lg:text-base truncate">
                    {product.name}
                  </h4>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  SKU: {product.sku}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  Only {product.quantity} left (threshold: {product.lowStockThreshold})
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          All Products
        </h2>
        
        {products.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No products found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add products to start managing inventory.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate text-sm lg:text-base">
                    {product.name}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex-shrink-0 ml-2"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  SKU: {product.sku}
                </p>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                    {product.category}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(product.price)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Stock: {product.quantity}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    product.quantity <= product.lowStockThreshold
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                      : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  }`}>
                    {product.quantity <= product.lowStockThreshold ? 'Low' : 'OK'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Restock Activity */}
      {restockHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Restock Activity
            </h2>
            <button
              onClick={() => setShowHistory(true)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            {restockHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {entry.productName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    +{entry.quantity} units by {entry.userEmail}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restock Form Modal */}
      {showForm && (
        <RestockForm
          products={products}
          selectedProduct={selectedProduct}
          onSubmit={handleRestock}
          onCancel={() => {
            setShowForm(false);
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Restock History Modal */}
      {showHistory && (
        <RestockHistory onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
};

export default RestockPage;