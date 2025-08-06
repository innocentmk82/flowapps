import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Info, X } from 'lucide-react';

const DebugInfo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { currentUser, isOnline, loading } = useAuth();

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg z-50"
        title="Debug Info"
      >
        <Info className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Debug Info</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Network:</span>
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Auth Loading:</span>
          <span className={loading ? 'text-yellow-600' : 'text-green-600'}>
            {loading ? 'Loading' : 'Ready'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">User:</span>
          <span className={currentUser ? 'text-green-600' : 'text-red-600'}>
            {currentUser ? 'Logged In' : 'Not Logged In'}
          </span>
        </div>
        
        {currentUser && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Role:</span>
            <span className="text-blue-600">{currentUser.role}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Platform:</span>
          <span className="text-blue-600">
            {window.navigator.userAgent.includes('Android') ? 'Android' : 
             window.navigator.userAgent.includes('iPhone') ? 'iOS' : 'Web'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DebugInfo; 