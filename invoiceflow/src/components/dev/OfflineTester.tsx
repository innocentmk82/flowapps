import React from 'react';
import { testOfflineFunctionality, checkDatabaseStatus } from '../../lib/testOffline';
import { useNetwork } from '../../contexts/NetworkContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const OfflineTester: React.FC = () => {
  const { isOnline, isSyncing, pendingChanges, syncData } = useNetwork();

  const handleTestOffline = async () => {
    await testOfflineFunctionality();
  };

  const handleCheckStatus = async () => {
    await checkDatabaseStatus();
  };

  const handleManualSync = async () => {
    await syncData();
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Offline Functionality Tester</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Network Status</p>
            <p className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sync Status</p>
            <p className={`font-medium ${isSyncing ? 'text-blue-600' : 'text-gray-600'}`}>
              {isSyncing ? 'Syncing...' : 'Idle'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Pending Changes</p>
            <p className="font-medium">{pendingChanges}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleTestOffline} variant="outline" size="sm">
            Test Offline Functionality
          </Button>
          
          <Button onClick={handleCheckStatus} variant="outline" size="sm">
            Check Database Status
          </Button>
          
          {isOnline && pendingChanges > 0 && (
            <Button onClick={handleManualSync} variant="outline" size="sm">
              Manual Sync
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>💡 Open browser console to see test results</p>
          <p>💡 Use DevTools Network tab to simulate offline mode</p>
        </div>
      </div>
    </Card>
  );
}; 