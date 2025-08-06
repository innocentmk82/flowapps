import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatDate } from '../../lib/utils';

export const UserSettings: React.FC = () => {
  const { userProfile } = useAuth();
  const { addToast } = useToast();
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyTempPassword = async () => {
    if (userProfile?.temporaryPassword) {
      try {
        await navigator.clipboard.writeText(userProfile.temporaryPassword);
        setCopied(true);
        addToast({
          type: 'success',
          title: 'Copied',
          message: 'Temporary password copied to clipboard.'
        });
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to copy password to clipboard.'
        });
      }
    }
  };

  const handleClearTempPassword = async () => {
    if (!userProfile?.uid) return;
    
    try {
      const response = await fetch('/api/clear-temp-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userProfile.uid
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to clear temporary password');
      }

      addToast({
        type: 'success',
        title: 'Password Cleared',
        message: 'Temporary password has been cleared successfully.'
      });

      // Refresh the page to update the user profile
      window.location.reload();
    } catch (error) {
      console.error('Error clearing temporary password:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to clear temporary password.'
      });
    }
  };

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Settings</h1>

      <Card>
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {userProfile.displayName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {userProfile.email}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name
              </label>
              <Input
                value={userProfile.displayName}
                disabled
                className="bg-gray-50 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <Input
                value={userProfile.email}
                disabled
                className="bg-gray-50 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <Input
                value={userProfile.role}
                disabled
                className="bg-gray-50 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Status
              </label>
              <Input
                value={userProfile.isActive ? 'Active' : 'Inactive'}
                disabled
                className="bg-gray-50 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Created At
              </label>
              <Input
                value={formatDate(userProfile.createdAt)}
                disabled
                className="bg-gray-50 dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Updated
              </label>
              <Input
                value={formatDate(userProfile.updatedAt)}
                disabled
                className="bg-gray-50 dark:bg-gray-700"
              />
            </div>
          </div>

          {/* Temporary Password Section */}
          {userProfile.temporaryPassword && (
            <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-4">
                Temporary Password
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                This is your temporary password set by an administrator. Please change it after your first login.
              </p>
              
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <Input
                    type={showTempPassword ? 'text' : 'password'}
                    value={userProfile.temporaryPassword}
                    disabled
                    className="bg-white dark:bg-gray-700 border-yellow-300 dark:border-yellow-600"
                  />
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTempPassword(!showTempPassword)}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  {showTempPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyTempPassword}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearTempPassword}
                  className="text-yellow-600 border-yellow-300 hover:bg-yellow-50 dark:border-yellow-600 dark:hover:bg-yellow-900/20"
                >
                  Clear Temporary Password
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 