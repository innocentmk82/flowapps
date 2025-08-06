import React from 'react';
import { ReceiptList } from '../components/receipts/ReceiptList';

export const Receipts: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#181f2a]">
      <ReceiptList />
    </div>
  );
};