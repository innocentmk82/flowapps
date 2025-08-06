import React from 'react';
import { Quotation } from '../../types';
import { Button } from '../ui/Button';
import { formatDate } from '../../lib/utils';

interface QuotationListProps {
  quotations: Quotation[];
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export const QuotationList: React.FC<QuotationListProps> = ({ quotations, onView, onEdit, onDelete }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-900">
        <thead>
          <tr>
            <th className="px-4 py-2">Client</th>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Expiry</th>
            <th className="px-4 py-2">Total</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {quotations.map(q => (
            <tr key={q.id} className="border-b">
              <td className="px-4 py-2">{q.clientName}</td>
              <td className="px-4 py-2">{formatDate(new Date(q.date))}</td>
              <td className="px-4 py-2">{formatDate(new Date(q.expiryDate))}</td>
              <td className="px-4 py-2">${q.total.toFixed(2)}</td>
              <td className="px-4 py-2">{q.status}</td>
              <td className="px-4 py-2 space-x-2">
                <Button size="sm" variant="outline" onClick={() => onView(q.id)}>View</Button>
                <Button size="sm" variant="outline" onClick={() => onEdit(q.id)}>Edit</Button>
                <Button size="sm" variant="destructive" onClick={() => onDelete(q.id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 