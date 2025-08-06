import React from 'react';
import { WifiOff } from 'lucide-react';

const OfflineFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
    <WifiOff className="h-16 w-16 text-gray-400 mb-6" />
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You are offline</h1>
    <p className="text-gray-600 dark:text-gray-400 mb-4">This page isn’t available offline. Please check your connection.</p>
    <button
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Retry
    </button>
  </div>
);

export default OfflineFallback; 