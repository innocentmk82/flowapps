import React, { useState, useEffect } from 'react';
import { invoiceService, clientService } from '../../lib/dataService';
import { Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Invoice, InvoiceItem, Client } from '../../types';
import { generateInvoiceNumber, createReceiptFromInvoice } from '../../lib/utils';
import { validateInvoiceCalculations, validateBusinessRules } from '../../lib/utils';

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
  onSave: () => void;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({ isOpen, onClose, invoice, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    clientId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    tax: 15, // Default VAT for Eswatini
    status: 'draft' as Invoice['status']
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, rate: 0, total: 0 }
  ]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (invoice) {
      // Ensure issueDate and dueDate are valid Date objects
      let issueDateRaw = invoice.issueDate;
      let dueDateRaw = invoice.dueDate;
      let issueDate: Date;
      let dueDate: Date;
      try {
        issueDate = issueDateRaw instanceof Date ? issueDateRaw : new Date(issueDateRaw);
        if (isNaN(issueDate.getTime())) throw new Error('Invalid issueDate');
      } catch {
        issueDate = new Date();
      }
      try {
        dueDate = dueDateRaw instanceof Date ? dueDateRaw : new Date(dueDateRaw);
        if (isNaN(dueDate.getTime())) throw new Error('Invalid dueDate');
      } catch {
        dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      }
      setFormData({
        title: invoice.title,
        clientId: invoice.clientId,
        issueDate: issueDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        notes: invoice.notes || '',
        tax: invoice.tax,
        status: invoice.status
      });
      setItems(invoice.items);
    }
  }, [invoice]);

  useEffect(() => {
    const fetchClients = async () => {
      if (!userProfile?.companyId) return;
      try {
        const clientsData = await clientService.getClients(userProfile.companyId);
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen, userProfile?.companyId]);

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updatedItem.total = updatedItem.quantity * updatedItem.rate;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + (subtotal * formData.tax / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.companyId) return;
    
    // Validate form data
    if (!formData.title.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Invoice title is required.'
      });
      return;
    }
    
    if (!formData.clientId) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a client.'
      });
      return;
    }
    
    if (items.length === 0 || items.every(item => !item.description.trim())) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please add at least one item with a description.'
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const subtotal = calculateSubtotal();
      const total = calculateTotal();
      
      const invoiceData = {
        companyId: userProfile.companyId,
        invoiceNumber: invoice?.invoiceNumber || generateInvoiceNumber(),
        title: formData.title,
        clientId: formData.clientId,
        items,
        subtotal,
        tax: formData.tax,
        total,
        status: formData.status,
        issueDate: new Date(formData.issueDate),
        dueDate: new Date(formData.dueDate),
        notes: formData.notes,
        createdBy: userProfile.uid, // Track which seller created this invoice
        updatedAt: new Date()
      };
      
      // Validate calculations
      const calculationValidation = validateInvoiceCalculations(invoiceData);
      if (!calculationValidation.isValid) {
        addToast({
          type: 'error',
          title: 'Calculation Error',
          message: calculationValidation.errors.join(', ')
        });
        setIsLoading(false);
        return;
      }
      
      // Validate business rules
      const businessValidation = validateBusinessRules(invoiceData, 'invoice');
      if (!businessValidation.isValid) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: businessValidation.errors.join(', ')
        });
        setIsLoading(false);
        return;
      }
      
      if (invoice) {
        const wasPaid = invoice.status === 'paid';
        const isNowPaid = formData.status === 'paid';
        await invoiceService.updateInvoice(invoice.id, invoiceData, userProfile?.uid || '');
        if (!wasPaid && isNowPaid) {
          try {
            const receiptResult = await createReceiptFromInvoice({ ...invoice, ...invoiceData }, 'cash', userProfile?.uid);
            if (receiptResult.success) {
              addToast({
                type: 'success',
                title: 'Invoice Updated & Receipt Created',
                message: 'Invoice has been updated and receipt has been automatically created.'
              });
            } else {
              addToast({
                type: 'warning',
                title: 'Invoice Updated',
                message: `Invoice has been updated successfully, but failed to create receipt: ${receiptResult.error}`
              });
            }
          } catch (receiptError) {
            addToast({
              type: 'warning',
              title: 'Invoice Updated',
              message: 'Invoice has been updated successfully, but failed to create receipt due to an error.'
            });
          }
        } else {
          addToast({
            type: 'success',
            title: 'Invoice Updated',
            message: 'Invoice has been updated successfully.'
          });
        }
      } else {
        await invoiceService.createInvoice({ ...invoiceData, createdAt: new Date() }, userProfile?.uid || '');
        addToast({
          type: 'success',
          title: 'Invoice Created',
          message: 'Invoice has been created successfully.'
        });
      }
      onSave();
      onClose();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save invoice. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clientOptions = [
    { value: '', label: 'Select a client' },
    ...clients.map(client => ({ value: client.id, label: client.name }))
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={invoice ? 'Edit Invoice' : 'Create Invoice'} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Invoice Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter invoice title"
            required
          />
          <Select
            label="Client"
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            options={clientOptions}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Issue Date"
            type="date"
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            required
          />
          <Input
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            required
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            options={statusOptions}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h3>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={item.total.toFixed(2)}
                    readOnly
                    className="bg-gray-50 dark:bg-gray-600"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
              <span className="font-semibold">${calculateSubtotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Tax (%):</span>
              <div className="w-24">
                <Input
                  type="number"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
        />

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {invoice ? 'Update' : 'Create'} Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
};