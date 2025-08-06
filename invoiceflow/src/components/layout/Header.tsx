import React, { useEffect, useState } from 'react';
import { Bell, Moon, Sun, User, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { isAppInstalled } from '../../lib/pwa';

interface HeaderProps {
  onMobileMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuClick }) => {
  const { isDark, toggleTheme } = useTheme();
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    setIsInstalled(isAppInstalled());

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstall(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowInstall(false);
          setIsInstalled(true);
          // Show success message
          setTimeout(() => {
            alert('App installed successfully! You can now access it from your home screen.');
          }, 1000);
        }
        setDeferredPrompt(null);
      } catch (error) {
        console.error('Error during install:', error);
        alert('Installation failed. Please try again or check your browser settings.');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Hamburger menu for mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden mr-2"
            onClick={onMobileMenuClick}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
            Dashboard
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          {showInstall && !isInstalled && deferredPrompt && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleInstallClick}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Install App</span>
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>
          <div className="flex items-center space-x-2 sm:space-x-3 pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-700">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {userProfile?.displayName?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {userProfile?.displayName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userProfile?.role}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};