import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNetwork } from '../../contexts/NetworkContext';
import { Badge } from './Badge';

export const NetworkStatus: React.FC = () => {
  const { isOnline, isSyncing, pendingChanges, syncData } = useNetwork();

  // Always show status for better user awareness
  const shouldShow = !isOnline || isSyncing || pendingChanges > 0;

  return (
    <>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className={`flex items-center gap-2 rounded-lg shadow-lg border px-3 py-2 backdrop-blur-sm ${
            isOnline 
              ? 'bg-white/90 dark:bg-gray-800/90 border-gray-200 dark:border-gray-700' 
              : 'bg-red-50/90 dark:bg-red-900/90 border-red-200 dark:border-red-800'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Online</span>
                {isSyncing && (
                  <>
                    <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Syncing...</span>
                  </>
                )}
                {pendingChanges > 0 && !isSyncing && (
                  <Badge className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                    {pendingChanges} pending
                  </Badge>
                )}
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">Offline Mode</span>
                {pendingChanges > 0 && (
                  <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                    {pendingChanges} pending
                  </Badge>
                )}
              </>
            )}
            
            {isOnline && pendingChanges > 0 && !isSyncing && (
              <button
                onClick={syncData}
                className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                Sync Now
              </button>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
}; 