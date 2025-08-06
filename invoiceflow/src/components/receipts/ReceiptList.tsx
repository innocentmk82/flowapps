import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Search, Download, Edit, Trash2, Mail, Filter } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { Receipt, Invoice, Client, Company } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { ReceiptForm } from './ReceiptForm';
import { formatCurrency, formatDate } from '../../lib/utils';
import { generateReceiptPDF, generateReceiptPDFAsBlob } from '../../lib/pdf';
import { convertFirestoreTimestampToDate } from '../../lib/utils';
import { Modal } from '../ui/Modal';
import jsPDF from 'jspdf';
import { receiptService, invoiceService, clientService, companyService } from '../../lib/dataService';

export const ReceiptList: React.FC = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | undefined>();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    method: '',
    dateFrom: '',
    dateTo: '',
    amountFrom: '',
    amountTo: ''
  });
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [modalReceipt, setModalReceipt] = useState<Receipt | null>(null);
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.companyId) return;
      setLoading(true);
      try {
        // Fetch receipts based on user role
        let receiptsData: Receipt[];
        if (userProfile.role === 'admin') {
          // Admin sees all receipts
          receiptsData = await receiptService.getReceipts(userProfile.companyId);
        } else {
          // Seller sees only their receipts
          receiptsData = await receiptService.getReceiptsBySeller(userProfile.companyId, userProfile.uid);
        }
        
        // Ensure all dates are properly converted to Date objects
        const processedReceipts = receiptsData.map(receipt => ({
          ...receipt,
          date: receipt.date instanceof Date ? receipt.date : new Date(receipt.date),
          createdAt: receipt.createdAt instanceof Date ? receipt.createdAt : new Date(receipt.createdAt),
          updatedAt: receipt.updatedAt instanceof Date ? receipt.updatedAt : new Date(receipt.updatedAt)
        }));
        
        setReceipts(processedReceipts);
        
        // Fetch invoices based on user role
        let invoicesData: Invoice[];
        if (userProfile.role === 'admin') {
          // Admin sees all invoices
          invoicesData = await invoiceService.getInvoices(userProfile.companyId);
        } else {
          // Seller sees only their invoices
          invoicesData = await invoiceService.getInvoicesBySeller(userProfile.companyId, userProfile.uid);
        }
        setInvoices(invoicesData);
        
        // Fetch clients
        const clientsData = await clientService.getClients(userProfile.companyId);
        setClients(clientsData);
        
        // Fetch company
        const companyData = await companyService.getCompany(userProfile.companyId);
        if (companyData) {
          setCompany(companyData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userProfile?.companyId, userProfile?.role, userProfile?.uid]);

  const handleEdit = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setShowForm(true);
  };

  const handleDelete = async (receipt: Receipt) => {
    if (!confirm('Are you sure you want to delete this receipt?')) return;
    try {
      await receiptService.deleteReceipt(receipt.id, userProfile?.uid || '');
      setReceipts(receipts.filter(r => r.id !== receipt.id));
      addToast({
        type: 'success',
        title: 'Receipt Deleted',
        message: 'Receipt has been deleted successfully.'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete receipt.'
      });
    }
  };

  const handleDownload = async (receipt: Receipt) => {
    const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
    const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
    
    if (!invoice || !client || !company) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Unable to generate PDF. Missing data.'
      });
      return;
    }

    try {
      await generateReceiptPDF(receipt, invoice, client, company);
      addToast({
        type: 'success',
        title: 'PDF Generated',
        message: 'Receipt PDF has been downloaded.'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate PDF.'
      });
    }
  };

  const handleShareEmail = (receipt: Receipt, clientEmail: string) => {
    setModalReceipt(receipt);
    setEmail(clientEmail);
    setShowEmailModal(true);
  };

  const handleSendEmailActual = async () => {
    if (!modalReceipt) return;
    setSending(true);
    try {
      const invoice = invoices.find(inv => inv.id === modalReceipt.invoiceId);
      const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
      if (!invoice || !client || !company) throw new Error('Missing data');
      // Generate PDF as blob
      const doc = await generateReceiptPDFAsBlob(modalReceipt, invoice, client, company);
      const pdfBlob = doc.output('blob');
      // Convert to base64
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });
      // Send to API
      const subject = `Receipt for Invoice ${invoice.invoiceNumber} from ${company.name}`;
      const html = `<p>Dear ${client.name},</p><p>Please find attached your receipt for invoice <b>${invoice.invoiceNumber}</b> amount <b>${formatCurrency(modalReceipt.amount)}</b>.<br/>Date: <b>${formatDate(modalReceipt.date)}</b></p><p>Thank you for your business!<br/>Best regards,<br/>${company.name}</p>`;
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject,
          html,
          pdfBase64,
          pdfFilename: `receipt-${modalReceipt.id}.pdf`
        })
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Email Sent', message: 'Receipt sent successfully.' });
        setShowEmailModal(false);
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.message || 'Failed to send email.';
        addToast({ 
          type: 'error', 
          title: 'Email Error', 
          message: errorMessage 
        });
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to send email.' });
    } finally {
      setSending(false);
    }
  };

  const handleShareWhatsApp = async (receipt: Receipt) => {
    const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
    const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
    if (!invoice || !client || !company) return;
    try {
      // Generate PDF as blob and trigger download
      const doc = await generateReceiptPDFAsBlob(receipt, invoice, client, company);
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `receipt-${receipt.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pdfUrl);
      addToast({
        type: 'info',
        title: 'PDF Downloaded',
        message: 'PDF downloaded. Please attach it in WhatsApp.'
      });
    } catch (error) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to generate PDF for WhatsApp.' });
    }
    // Open WhatsApp Web with pre-filled message
    const message = `Hi ${client.name},%0A%0AHere is your receipt for invoice (${invoice.invoiceNumber}) from ${company.name} amount ${formatCurrency(receipt.amount)}. Date: ${formatDate(receipt.date)}.%0A%0AThank you!`;
    const url = `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const refreshData = async () => {
    setLoading(true);
    if (!userProfile?.companyId) return;
    try {
      // Fetch receipts based on user role
      let receiptsData: Receipt[];
      if (userProfile.role === 'admin') {
        // Admin sees all receipts
        receiptsData = await receiptService.getReceipts(userProfile.companyId);
      } else {
        // Seller sees only their receipts
        receiptsData = await receiptService.getReceiptsBySeller(userProfile.companyId, userProfile.uid);
      }
      
      // Ensure all dates are properly converted to Date objects
      const processedReceipts = receiptsData.map(receipt => ({
        ...receipt,
        date: receipt.date instanceof Date ? receipt.date : new Date(receipt.date),
        createdAt: receipt.createdAt instanceof Date ? receipt.createdAt : new Date(receipt.createdAt),
        updatedAt: receipt.updatedAt instanceof Date ? receipt.updatedAt : new Date(receipt.updatedAt)
      }));
      
      setReceipts(processedReceipts);
      
      // Fetch invoices based on user role
      let invoicesData: Invoice[];
      if (userProfile.role === 'admin') {
        // Admin sees all invoices
        invoicesData = await invoiceService.getInvoices(userProfile.companyId);
      } else {
        // Seller sees only their invoices
        invoicesData = await invoiceService.getInvoicesBySeller(userProfile.companyId, userProfile.uid);
      }
      setInvoices(invoicesData);
      
      const clientsData = await clientService.getClients(userProfile.companyId);
      setClients(clientsData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
    const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
    
    // Search filter - include receipt ID, invoice number, client name, and payment method
    const matchesSearch = 
      receipt.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice?.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.method.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Method filter
    if (filters.method && receipt.method !== filters.method) return false;
    
    // Date range filter
    if (filters.dateFrom) {
      const receiptDate = new Date(receipt.date);
      const fromDate = new Date(filters.dateFrom);
      if (receiptDate < fromDate) return false;
    }
    
    if (filters.dateTo) {
      const receiptDate = new Date(receipt.date);
      const toDate = new Date(filters.dateTo);
      if (receiptDate > toDate) return false;
    }
    
    // Amount range filter
    if (filters.amountFrom && receipt.amount < parseFloat(filters.amountFrom)) return false;
    if (filters.amountTo && receipt.amount > parseFloat(filters.amountTo)) return false;
    
    return true;
  });

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-800';
      case 'card':
        return 'bg-blue-100 text-blue-800';
      case 'transfer':
        return 'bg-purple-100 text-purple-800';
      case 'other':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receipts</h1>
          <div className="flex gap-2">
            <Button className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Receipt
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => {
              const csvData = filteredReceipts.map(receipt => {
                const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
                const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
                return {
                  'Receipt ID': receipt.id,
                  'Invoice Number': invoice?.invoiceNumber || '',
                  'Client': client?.name || invoice?.clientId || '',
                  'Subtotal': invoice?.subtotal ?? '',
                  'VAT %': invoice?.tax ?? '',
                  'VAT Amount': invoice ? ((invoice.subtotal * (invoice.tax / 100)).toFixed(2)) : '',
                  'Total': invoice?.total ?? '',
                  'Amount Paid': receipt.amount,
                  'Method': receipt.method,
                  'Date': (receipt.date instanceof Date ? receipt.date : new Date(receipt.date)).toISOString().split('T')[0],
                  'VAT Registration Number': company?.vatRegistrationNumber || ''
                };
              });
              if (csvData.length === 0) return;
              const csvContent = [
                Object.keys(csvData[0]).join(','),
                ...csvData.map(row => Object.values(row).join(','))
              ].join('\n');
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `receipts-report.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4 mb-6">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              className={`w-full sm:w-auto ${Object.values(filters).some(f => f !== '') ? 'border-blue-500 text-blue-600' : ''}`}
              onClick={() => setShowFilterModal(true)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
              {Object.values(filters).some(f => f !== '') && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-1">
                  {Object.values(filters).filter(f => f !== '').length}
                </span>
              )}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Receipt ID
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Invoice
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Method
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => {
                  const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
                  const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
                  return (
                    <motion.tr
                      key={receipt.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="py-4 px-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {receipt.id.slice(-8)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <span>{invoice?.invoiceNumber || 'N/A'}</span>
                          {receipt.notes?.includes('Payment received for invoice') && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Auto
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <span>{client?.name || 'N/A'}</span>
                          {client?.email && (
                            <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline text-sm">
                              {client.email}
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(receipt.amount)}
                      </td>
                      <td className="py-4 px-4">
                        <Badge className={getMethodColor(receipt.method)}>
                          {receipt.method}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                        {formatDate(receipt.date)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(receipt)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(receipt)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleShareEmail(receipt, client?.email || '')}>
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleShareWhatsApp(receipt)}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.52 3.48A11.93 11.93 0 0012 0C5.37 0 0 5.37 0 12c0 2.11.55 4.16 1.6 5.97L0 24l6.22-1.63A11.93 11.93 0 0012 24c6.63 0 12-5.37 12-12 0-3.19-1.24-6.19-3.48-8.52zM12 22c-1.85 0-3.67-.5-5.24-1.44l-.37-.22-3.69.97.99-3.59-.24-.37A9.94 9.94 0 012 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.2-7.6c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.4-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.18-.29.28-.48.09-.19.05-.36-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.62-.47-.16-.01-.36-.01-.56-.01-.19 0-.5.07-.76.34-.26.27-1 1-.97 2.43.03 1.43 1.03 2.81 1.18 3 .15.19 2.03 3.1 4.93 4.23.69.3 1.23.48 1.65.61.69.22 1.32.19 1.81.12.55-.08 1.65-.67 1.89-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.19-.53-.33z"/></svg>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(receipt)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <ReceiptForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedReceipt(undefined);
          }}
          receipt={selectedReceipt}
          onSave={refreshData}
        />
      </div>
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="Share Receipt via Email">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Recipient Email</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEmailModal(false)}>Cancel</Button>
            <Button onClick={handleSendEmailActual} isLoading={sending} disabled={sending || !email}>
              Send Email
            </Button>
          </div>
        </div>
      </Modal>

      {/* Filter Modal */}
      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter Receipts">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={filters.method}
              onChange={(e) => setFilters({ ...filters, method: e.target.value })}
              options={[
                { value: '', label: 'All Methods' },
                { value: 'cash', label: 'Cash' },
                { value: 'card', label: 'Card' },
                { value: 'transfer', label: 'Bank Transfer' },
                { value: 'check', label: 'Check' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date From"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
            <Input
              label="Date To"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Amount From"
              type="number"
              placeholder="0.00"
              value={filters.amountFrom}
              onChange={(e) => setFilters({ ...filters, amountFrom: e.target.value })}
            />
            <Input
              label="Amount To"
              type="number"
              placeholder="0.00"
              value={filters.amountTo}
              onChange={(e) => setFilters({ ...filters, amountTo: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setFilters({
                  method: '',
                  dateFrom: '',
                  dateTo: '',
                  amountFrom: '',
                  amountTo: ''
                });
              }}
            >
              Clear Filters
            </Button>
            <Button onClick={() => setShowFilterModal(false)}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};