import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  const [isSidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-[#181f2a]">
      <Sidebar
        isMobileOpen={isSidebarMobileOpen}
        onClose={() => setSidebarMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMobileMenuClick={() => setSidebarMobileOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};