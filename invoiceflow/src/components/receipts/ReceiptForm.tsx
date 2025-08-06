import React, { useState, useEffect } from 'react';
import { receiptService, invoiceService } from '../../lib/dataService';
import { Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { Receipt, Invoice } from '../../types';
import { convertFirestoreTimestampToDate, formatCurrency } from '../../lib/utils';
import { validateReceiptAmount, validateBusinessRules } from '../../lib/utils';

interface ReceiptFormProps {
  isOpen: boolean;
  onClose: () => void;
  receipt?: Receipt;
  onSave: () => void;
}

export const ReceiptForm: React.FC<ReceiptFormProps> = ({ isOpen, onClose, receipt, onSave }) => {
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: 0,
    method: 'cash' as Receipt['method'],
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (receipt) {
      // Ensure receipt.date is properly converted to a Date object
      const receiptDate = receipt.date instanceof Date ? receipt.date : new Date(receipt.date);
      setFormData({
        invoiceId: receipt.invoiceId,
        amount: receipt.amount,
        method: receipt.method,
        date: receiptDate.toISOString().split('T')[0],
        notes: receipt.notes || ''
      });
    } else {
      setFormData({
        invoiceId: '',
        amount: 0,
        method: 'cash',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
  }, [receipt]);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!userProfile?.companyId) return;
      try {
        // Fetch invoices based on user role
        let invoicesData: Invoice[];
        if (userProfile.role === 'admin') {
          // Admin sees all invoices
          invoicesData = await invoiceService.getInvoices(userProfile.companyId);
        } else {
          // Seller sees only their invoices
          invoicesData = await invoiceService.getInvoicesBySeller(userProfile.companyId, userProfile.uid);
        }
        
        // When editing a receipt, include all invoices (including the one already linked)
        // When creating a new receipt, only show unpaid invoices
        if (receipt) {
          setInvoices(invoicesData);
        } else {
          const unpaidInvoices = invoicesData.filter(inv => inv.status !== 'paid');
          setInvoices(unpaidInvoices);
        }
      } catch (error) {
        console.error('Error fetching invoices:', error);
      }
    };
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen, userProfile?.companyId, userProfile?.role, userProfile?.uid, receipt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.companyId) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'User profile not found. Please try logging in again.'
      });
      return;
    }
    if (!formData.invoiceId) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please select an invoice.'
      });
      return;
    }
    if (formData.amount <= 0) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Amount must be greater than 0.'
      });
      return;
    }
    
    // Check if amount exceeds invoice total when editing
    if (receipt && selectedInvoice && formData.amount > selectedInvoice.total) {
      addToast({
        type: 'error',
        title: 'Error',
        message: `Amount cannot exceed the invoice total of ${formatCurrency(selectedInvoice.total)}.`
      });
      return;
    }
    
    if (!formData.date) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please select a payment date.'
      });
      return;
    }
    setIsLoading(true);
    try {
      // Find the selected invoice for validation
      const selectedInvoice = invoices.find(inv => inv.id === formData.invoiceId);
      if (!selectedInvoice) {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Selected invoice not found.'
        });
        setIsLoading(false);
        return;
      }
      
      const receiptData = {
        companyId: userProfile.companyId,
        invoiceId: formData.invoiceId,
        amount: formData.amount,
        method: formData.method,
        date: new Date(formData.date),
        notes: formData.notes,
        updatedAt: new Date()
      };
      
      // Validate receipt amount against invoice
      const amountValidation = validateReceiptAmount(receiptData, selectedInvoice);
      if (!amountValidation.isValid) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: amountValidation.errors.join(', ')
        });
        setIsLoading(false);
        return;
      }
      
      // Validate business rules
      const businessValidation = validateBusinessRules(receiptData, 'receipt');
      if (!businessValidation.isValid) {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: businessValidation.errors.join(', ')
        });
        setIsLoading(false);
        return;
      }
      
      if (receipt) {
        await receiptService.updateReceipt(receipt.id, receiptData, userProfile?.uid || '');
        addToast({
          type: 'success',
          title: 'Receipt Updated',
          message: 'Receipt has been updated successfully.'
        });
      } else {
        await receiptService.createReceipt({ 
          ...receiptData, 
          createdAt: new Date(),
          createdBy: userProfile.uid 
        }, userProfile?.uid || '');
        // Update invoice status to paid
        try {
          await invoiceService.updateInvoice(formData.invoiceId, { status: 'paid', updatedAt: new Date() }, userProfile?.uid || '');
        } catch (invoiceError) {
          addToast({
            type: 'warning',
            title: 'Receipt Created',
            message: 'Receipt created successfully, but failed to update invoice status.'
          });
          onSave();
          onClose();
          return;
        }
        addToast({
          type: 'success',
          title: 'Receipt Created',
          message: 'Receipt has been created successfully and invoice marked as paid.'
        });
      }
      onSave();
      onClose();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save receipt. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const invoiceOptions = [
    { value: '', label: 'Select an invoice' },
    ...invoices.map(invoice => ({ 
      value: invoice.id, 
      label: `${invoice.invoiceNumber} - $${invoice.total.toFixed(2)}${receipt ? ` (${invoice.status})` : ''}` 
    }))
  ];

  const methodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'transfer', label: 'Bank Transfer' },
    { value: 'other', label: 'Other' }
  ];

  const selectedInvoice = invoices.find(inv => inv.id === formData.invoiceId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={receipt ? 'Edit Receipt' : 'Create Receipt'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Select
          label="Invoice"
          value={formData.invoiceId}
          onChange={(e) => {
            setFormData({ ...formData, invoiceId: e.target.value });
            const invoice = invoices.find(inv => inv.id === e.target.value);
            if (invoice) {
              setFormData(prev => ({ ...prev, amount: invoice.total }));
            }
          }}
          options={invoiceOptions}
          required
        />

        {/* Show appropriate message based on context */}
        {invoices.length === 0 && !receipt && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-2">
            <p className="text-sm text-red-800 dark:text-red-200">
              No unpaid invoices available. Please create an invoice or mark an existing invoice as sent or overdue.
            </p>
          </div>
        )}
        
        {invoices.length === 0 && receipt && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-2">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              The linked invoice is not available. This might happen if the invoice was deleted or you don't have access to it.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            min="0"
            step="0.01"
            required
          />
          <Select
            label="Payment Method"
            value={formData.method}
            onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
            options={methodOptions}
            required
          />
        </div>

        <Input
          label="Payment Date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />

        {selectedInvoice && (
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Invoice Details</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Invoice: {selectedInvoice.invoiceNumber}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total: ${selectedInvoice.total.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Status: {selectedInvoice.status}
            </p>
          </div>
        )}

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
        />

        {!receipt && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 <strong>Tip:</strong> You can also mark invoices as paid directly from the invoice list, which will automatically create receipts.
            </p>
          </div>
        )}

        {receipt && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✏️ <strong>Editing Receipt:</strong> You can modify the payment details, amount, method, and notes. The linked invoice will remain the same.
            </p>
          </div>
        )}

        {/* Debug information - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">Debug Info:</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              User Company ID: {userProfile?.companyId || 'Not set'}<br/>
              Available Invoices: {invoices.length}<br/>
              Selected Invoice: {formData.invoiceId || 'None'}<br/>
              Amount: ${formData.amount}<br/>
              Method: {formData.method}<br/>
              Date: {formData.date}
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {receipt ? 'Update' : 'Create'} Receipt
          </Button>
        </div>
      </form>
    </Modal>
  );
};