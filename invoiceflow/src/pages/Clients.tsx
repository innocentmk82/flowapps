import React from 'react';
import { ClientList } from '../components/clients/ClientList';

export const Clients: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#181f2a]">
      <ClientList />
    </div>
  );
};