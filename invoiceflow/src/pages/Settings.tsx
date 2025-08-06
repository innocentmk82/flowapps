import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Users, Shield, User } from 'lucide-react';
import { CompanySettings } from '../components/settings/CompanySettings';
import { UserManagement } from '../components/settings/UserManagement';
import { AdminManagement } from '../components/settings/AdminManagement';
import { UserSettings } from '../components/settings/UserSettings';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('company');
  const { userProfile, isAdmin } = useAuth();

  const tabs = [
    {
      id: 'company',
      name: 'Company Settings',
      icon: Building2,
      component: <CompanySettings />
    },
    {
      id: 'user',
      name: 'User Settings',
      icon: User,
      component: <UserSettings />
    }
  ];

  // Add admin-only tabs
  if (isAdmin) {
    tabs.push(
      {
        id: 'users',
        name: 'User Management',
        icon: Users,
        component: <UserManagement />
      }
    );
    // Only managers can see Admin Management
    if (userProfile?.role === 'manager') {
      tabs.push({
        id: 'admins',
        name: 'Admin Management',
        icon: Shield,
        component: <AdminManagement />
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account and company settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tabs.find(tab => tab.id === activeTab)?.component}
      </motion.div>
    </div>
  );
};