import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const NetworkStatus: React.FC = () => {
  const { isOnline } = useAuth();

  if (isOnline) {
    return null; // Don't show anything when online
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 flex items-center justify-center text-sm font-medium">
      <WifiOff className="h-4 w-4 mr-2" />
      <span>No Internet Connection</span>
    </div>
  );
};

export default NetworkStatus; 