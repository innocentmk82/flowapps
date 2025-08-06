import React from 'react';
import { InvoiceList } from '../components/invoices/InvoiceList';

export const Invoices: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#181f2a]">
      <InvoiceList />
    </div>
  );
};