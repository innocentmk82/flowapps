import React, { useEffect, useState } from 'react';
import { getQueue, clearQueue, OfflineAction } from '../../utils/offlineQueue';
import { syncQueuedActions } from '../../utils/syncManager';
import { X, RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface QueuedActionsModalProps {
  open: boolean;
  onClose: () => void;
}

const QueuedActionsModal: React.FC<QueuedActionsModalProps> = ({ open, onClose }) => {
  const [actions, setActions] = useState<OfflineAction[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (open) {
      loadQueue();
    }
  }, [open]);

  const loadQueue = async () => {
    const queue = await getQueue();
    setActions(queue);
  };

  const handleSync = async () => {
    setLoading(true);
    const ok = await syncQueuedActions();
    setLoading(false);
    if (ok) {
      showToast('Queued actions synced successfully!', 'success');
      loadQueue();
    } else {
      showToast('Some actions failed to sync.', 'error');
    }
  };

  const handleClear = async () => {
    await clearQueue();
    showToast('Queue cleared.', 'info');
    loadQueue();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Queued Offline Actions</h2>
        {actions.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">No queued actions.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700 mb-4 max-h-64 overflow-y-auto">
            {actions.map((action, idx) => (
              <li key={idx} className="py-2 text-sm text-gray-800 dark:text-gray-200">
                <span className="font-semibold mr-2">{action.type.toUpperCase()}</span>
                {action.type === 'sale' ? 'Sale queued' : 'Restock queued'} at {new Date(action.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={handleSync}
            disabled={loading || actions.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Sync Now
          </button>
          <button
            onClick={handleClear}
            disabled={actions.length === 0}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Clear Queue
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueuedActionsModal; 