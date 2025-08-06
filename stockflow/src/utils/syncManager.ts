import { getQueue, clearQueue, OfflineAction } from './offlineQueue';
import { salesService } from '../services/salesService';
import { restockService } from '../services/restockService';
import { productService } from '../services/productService';

export async function syncQueuedActions(onConflict?: (msg: string) => void) {
  const queue = await getQueue();
  for (const action of queue) {
    try {
      if (action.type === 'sale') {
        // Check product stock before processing
        let canProcess = true;
        for (const item of action.payload.items) {
          const products = await productService.getProducts();
          const product = products.find(p => p.id === item.productId);
          if (!product || product.quantity < item.quantity) {
            canProcess = false;
            if (onConflict) onConflict(`Sale for ${item.productName} skipped: insufficient stock.`);
            break;
          }
        }
        if (!canProcess) continue;
        await salesService.processSale(action.payload);
      } else if (action.type === 'restock') {
        await restockService.addRestock(action.payload);
      }
      // Optionally: notify user of successful sync
    } catch (err) {
      // Optionally: handle sync error (e.g., keep in queue)
      console.error('Sync error:', err);
      return false;
    }
  }
  await clearQueue();
  return true;
}

export function setupSyncOnReconnect(onConflict?: (msg: string) => void) {
  window.addEventListener('online', () => {
    syncQueuedActions(onConflict);
  });
} 