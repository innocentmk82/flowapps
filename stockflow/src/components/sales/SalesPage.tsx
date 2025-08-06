import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Receipt } from 'lucide-react';
import { productService } from '../../services/productService';
import { salesService } from '../../services/salesService';
import { Product, SaleItem } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/currency';
import ProductSelector from './ProductSelector';
import SalesHistory from './SalesHistory';
import { addToQueue, OfflineAction } from '../../utils/offlineQueue';
import { syncQueuedActions, setupSyncOnReconnect } from '../../utils/syncManager';
import { useToast } from '../../contexts/ToastContext';

const SalesPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [queued, setQueued] = useState(false);
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    setupSyncOnReconnect((msg) => showToast(msg, 'error'));
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const productsData = await productService.getProducts();
      setProducts(productsData.filter(p => p.quantity > 0));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const addToCart = (product: Product, quantity: number) => {
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      updateCartQuantity(product.id, existingItem.quantity + quantity);
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.price,
        total: product.price * quantity
      };
      setCart([...cart, newItem]);
    }
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity > product.quantity) {
      alert(`Only ${product.quantity} units available in stock`);
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, total: item.price * newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const getTotalAmount = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const processSale = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!currentUser) {
      alert('User not authenticated');
      return;
    }

    setProcessing(true);

    try {
      // Check stock availability
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (!product || product.quantity < item.quantity) {
          alert(`Insufficient stock for ${item.productName}`);
          setProcessing(false);
          return;
        }
      }

      if (!navigator.onLine) {
        // Offline: queue the sale
        await addToQueue({
          type: 'sale',
          payload: {
            items: cart,
            total: getTotalAmount(),
            attendantId: currentUser.uid,
            attendantEmail: currentUser.email
          },
          timestamp: Date.now()
        });
        setQueued(true);
        setCart([]);
        setProcessing(false);
        showToast('You are offline. Sale has been queued and will sync when online.', 'info');
        return;
      }

      // Online: process sale and sync any queued actions
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          await productService.updateStock(product.id, product.quantity - item.quantity);
        }
      }

      await salesService.processSale({
        items: cart,
        total: getTotalAmount(),
        attendantId: currentUser.uid,
        attendantEmail: currentUser.email
      });

      await syncQueuedActions((msg) => showToast(msg, 'error'))
        .then((ok) => {
          if (ok) showToast('Queued sales synced successfully!', 'success');
        })
        .catch(() => showToast('Some queued sales failed to sync.', 'error'));

      setCart([]);
      await loadProducts();
      showToast('Sale processed successfully!', 'success');
    } catch (error) {
      console.error('Error processing sale:', error);
      showToast('Failed to process sale', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Process sales and manage transactions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            <Receipt className="h-5 w-5 mr-2" />
            Sales History
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Products to Cart
              </h2>
              <button
                onClick={() => setShowProductSelector(true)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Product
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  Cart is empty
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Add products to start a sale
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg gap-3"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="p-1 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center font-medium text-gray-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="p-1 rounded-md bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="text-right min-w-[70px]">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(item.total)}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Summary */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 lg:p-6 lg:sticky lg:top-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Order Summary
            </h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Items:</span>
                <span className="text-gray-900 dark:text-white">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-gray-700 pt-3">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(getTotalAmount())}
                </span>
              </div>
            </div>
            
            <button
              onClick={processSale}
              disabled={cart.length === 0 || processing}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
            >
              {processing ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>

      {/* Product Selector Modal */}
      {showProductSelector && (
        <ProductSelector
          products={products}
          onAddToCart={addToCart}
          onClose={() => setShowProductSelector(false)}
        />
      )}

      {/* Sales History Modal */}
      {showHistory && (
        <SalesHistory onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
};

export default SalesPage;