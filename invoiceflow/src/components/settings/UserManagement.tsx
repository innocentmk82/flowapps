import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, UserPlus, Edit, Trash2, Shield, User, Key } from 'lucide-react';
import { userService } from '../../lib/dataService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { UserManagement as UserManagementType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { formatDate } from '../../lib/utils';

interface AddUserFormData {
  email: string;
  displayName: string;
  role: 'admin' | 'seller';
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserManagementType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUserData, setAddUserData] = useState<AddUserFormData>({
    email: '',
    displayName: '',
    role: 'seller'
  });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!userProfile?.companyId) return;

      try {
        const usersData = await userService.getCompanyUsers(userProfile.companyId);
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to fetch users.'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userProfile?.companyId, addToast]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.companyId) return;

    setIsAddingUser(true);
    try {
      // Call the server API to create the user
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: addUserData.email,
          displayName: addUserData.displayName,
          role: addUserData.role,
          companyId: userProfile.companyId,
          adminId: userProfile.uid
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      addToast({
        type: 'success',
        title: 'User Added',
        message: `User has been added successfully. Temporary password: ${result.tempPassword}`
      });

      setShowAddModal(false);
      setAddUserData({ email: '', displayName: '', role: 'seller' });
      
      // Refresh users list
      const usersData = await userService.getCompanyUsers(userProfile.companyId);
      setUsers(usersData);
    } catch (error: unknown) {
      console.error('Error adding user:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to add user. Please try again.'
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!userProfile?.uid) return;

    try {
      await userService.updateUserStatus(userId, !currentStatus, userProfile.uid);
      
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, isActive: !currentStatus, updatedAt: new Date() }
          : user
      ));

      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `User has been ${!currentStatus ? 'activated' : 'deactivated'}.`
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update user status.'
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!userProfile?.uid) return;
    if (!confirm(`Are you sure you want to delete ${userName}?`)) return;

    try {
      await userService.deleteUser(userId, userProfile.uid);
      setUsers(users.filter(user => user.id !== userId));
      
      addToast({
        type: 'success',
        title: 'User Deleted',
        message: 'User has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete user.'
      });
    }
  };

  const handleSetTempPassword = async (userId: string, userName: string) => {
    if (!userProfile?.uid) return;
    if (!confirm(`Are you sure you want to set a new temporary password for ${userName}?`)) return;

    try {
      const response = await fetch('/api/set-temp-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          adminId: userProfile.uid
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to set temporary password');
      }

      addToast({
        type: 'success',
        title: 'Temporary Password Set',
        message: `New temporary password for ${userName}: ${result.tempPassword}`
      });

      // Refresh users list to get updated data
      const usersData = await userService.getCompanyUsers(userProfile.companyId);
      setUsers(usersData);
    } catch (error: unknown) {
      console.error('Error setting temporary password:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to set temporary password.'
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage users in your company
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      <Card>
        <div className="p-6">
          <div className="mb-4">
            <Input
              label="Search Users"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
            />
          </div>

          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    {user.role === 'admin' ? (
                      <Shield className="w-5 h-5 text-white" />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.displayName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {user.role}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {user.temporaryPassword && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 cursor-pointer hover:bg-yellow-200 dark:hover:bg-yellow-800" 
                              title="Click to copy password"
                              onClick={() => {
                                navigator.clipboard.writeText(user.temporaryPassword!);
                                addToast({
                                  type: 'success',
                                  title: 'Password Copied',
                                  message: 'Temporary password copied to clipboard'
                                });
                              }}>
                          Temp Password: {user.temporaryPassword}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                    className={user.isActive ? 'text-red-600' : 'text-green-600'}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetTempPassword(user.id, user.displayName)}
                    className="text-blue-600 hover:text-blue-700"
                    title="Set Temporary Password"
                  >
                    <Key className="w-4 h-4" />
                  </Button>
                  
                  {user.id !== userProfile?.uid && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.displayName)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No users found
            </div>
          )}
        </div>
      </Card>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New User"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          <Input
            label="Full Name"
            value={addUserData.displayName}
            onChange={(e) => setAddUserData({...addUserData, displayName: e.target.value})}
            placeholder="Enter full name"
            required
          />
          
          <Input
            label="Email"
            type="email"
            value={addUserData.email}
            onChange={(e) => setAddUserData({...addUserData, email: e.target.value})}
            placeholder="Enter email address"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              value={addUserData.role}
              onChange={(e) => setAddUserData({...addUserData, role: e.target.value as 'admin' | 'seller'})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isAddingUser}
            >
              Add User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}; 