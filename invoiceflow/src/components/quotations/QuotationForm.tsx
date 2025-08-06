import React, { useState } from 'react';
import { Quotation, QuotationItem, QuotationStatus } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

interface QuotationFormProps {
  initialData?: Partial<Quotation>;
  onSubmit: (quotation: Omit<Quotation, 'id'>) => void;
  loading?: boolean;
}

const defaultItem: QuotationItem = { description: '', quantity: 1, unitPrice: 0 };

export const QuotationForm: React.FC<QuotationFormProps> = ({ initialData, onSubmit, loading }) => {
  const safeInitial = initialData || {};
  const [clientName, setClientName] = useState(safeInitial.clientName || '');
  const [items, setItems] = useState<QuotationItem[]>(safeInitial.items || [defaultItem]);
  const [date, setDate] = useState(safeInitial.date || '');
  const [expiryDate, setExpiryDate] = useState(safeInitial.expiryDate || '');
  const [notes, setNotes] = useState(safeInitial.notes || '');
  const [status, setStatus] = useState<QuotationStatus>(safeInitial.status || 'Draft');
  const [tax, setTax] = useState(typeof safeInitial.tax === 'number' ? safeInitial.tax : 15); // Default VAT 15%

  const handleItemChange = (index: number, field: keyof QuotationItem, value: string | number) => {
    setItems(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleAddItem = () => setItems([...items, defaultItem]);
  const handleRemoveItem = (index: number) => setItems(items => items.filter((_, i) => i !== index));

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const vatAmount = subtotal * (tax / 100);
  const total = subtotal + vatAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      companyId: '', // To be set by parent if needed
      clientId: '', // To be set by parent if needed
      clientName,
      items,
      subtotal,
      tax,
      total,
      status,
      date,
      expiryDate,
      notes,
      createdBy: '', // To be set by parent if needed
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Client Name" value={clientName} onChange={e => setClientName(e.target.value)} required />
      <div>
        <label className="block font-medium mb-1">Items</label>
        {items.map((item, idx) => (
          <div key={idx} className="flex space-x-2 mb-2">
            <Input
              placeholder="Description"
              value={item.description}
              onChange={e => handleItemChange(idx, 'description', e.target.value)}
              required
            />
            <Input
              type="number"
              min={1}
              placeholder="Qty"
              value={item.quantity}
              onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
              required
              style={{ width: 80 }}
            />
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Unit Price"
              value={item.unitPrice}
              onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
              required
              style={{ width: 100 }}
            />
            <Button type="button" variant="ghost" onClick={() => handleRemoveItem(idx)} disabled={items.length === 1}>Remove</Button>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={handleAddItem}>Add Item</Button>
      </div>
      <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
      <Input label="Expiry Date" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required />
      <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="flex items-center space-x-4">
        <span className="font-medium">Status:</span>
        <select value={status} onChange={e => setStatus(e.target.value as QuotationStatus)} className="border rounded px-2 py-1">
          <option value="Draft">Draft</option>
          <option value="Sent">Sent</option>
          <option value="Accepted">Accepted</option>
          <option value="Declined">Declined</option>
          <option value="Expired">Expired</option>
        </select>
      </div>
      <div className="flex items-center space-x-4">
        <Input
          label="VAT (%)"
          type="number"
          value={tax}
          onChange={e => setTax(Number(e.target.value))}
          min={0}
          max={100}
          step={0.01}
          style={{ width: 120 }}
        />
        <span>Subtotal: <b>${subtotal.toFixed(2)}</b></span>
        <span>VAT: <b>${vatAmount.toFixed(2)}</b></span>
        <span>Total: <b>${total.toFixed(2)}</b></span>
      </div>
      <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Quotation'}</Button>
    </form>
  );
}; 