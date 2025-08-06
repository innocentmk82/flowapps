import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Users, 
  Receipt, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Building2,
  Quote
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { signOut, userProfile, isAdmin, isSeller } = useAuth();
  const navigate = useNavigate();

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Invoices', href: '/invoices', icon: FileText },
      { name: 'Quotations', href: '/quotations', icon: Quote },
      { name: 'Clients', href: '/clients', icon: Users },
    ];

    // Sellers see invoices, quotations, clients, and receipts
    if (isSeller) {
      return [
        ...baseItems,
        { name: 'Receipts', href: '/receipts', icon: Receipt },
      ];
    }

    // Admins see everything
    if (isAdmin) {
      return [
        ...baseItems,
        { name: 'Receipts', href: '/receipts', icon: Receipt },
        { name: 'Reports', href: '/reports', icon: BarChart3 },
        { name: 'Settings', href: '/settings', icon: Settings },
      ];
    }

    // Default fallback
    return baseItems;
  };

  const navigation = getNavigationItems();

  // Prevent background scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <motion.div
        initial={false}
        animate={{
          x: isMobileOpen || window.innerWidth >= 768 ? 0 : -300,
          width: isCollapsed && window.innerWidth >= 768 ? 64 : 256
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed z-50 md:static top-0 left-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shadow-xl transition-all duration-300
          ${isMobileOpen ? 'block' : 'hidden'} md:block`}
        style={{ maxWidth: 256 }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            className="flex items-center space-x-2"
          >
            <Building2 className="w-8 h-8 text-blue-600" />
            {!isCollapsed && (
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                InvoiceFlow
              </span>
            )}
          </motion.div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:inline-flex"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </Button>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="md:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) => `
                flex items-center px-3 py-2 rounded-lg transition-colors duration-200
                ${isActive 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span className="ml-3">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {userProfile?.displayName?.charAt(0) || 'U'}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {userProfile?.displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userProfile?.role}
                </p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full mt-3 justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          )}
        </div>
      </motion.div>
    </>
  );
};