import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, getDocs, orderBy, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Plus, Search, Filter, Eye, Edit, Trash2, Download, Mail, CheckCircle, User } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { Invoice, Client, Company, User as UserType } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { InvoiceForm } from './InvoiceForm';
import { InvoiceView } from './InvoiceView';
import { formatCurrency, formatDate } from '../../lib/utils';
import { generateInvoicePDF } from '../../lib/pdf';
import { convertFirestoreTimestampToDate, createReceiptFromInvoice } from '../../lib/utils';
import { invoiceService, clientService, companyService, userService } from '../../lib/dataService';

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [creators, setCreators] = useState<Record<string, UserType>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    amountFrom: '',
    amountTo: '',
    createdBy: ''
  });
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.companyId) return;
      setLoading(true);
      try {
        // Fetch invoices based on user role
        let invoicesData;
        if (userProfile.role === 'admin') {
          // Admin sees all invoices
          invoicesData = await invoiceService.getInvoices(userProfile.companyId);
        } else {
          // Seller sees only their invoices
          invoicesData = await invoiceService.getInvoicesBySeller(userProfile.companyId, userProfile.uid);
        }
        
        // Ensure all dates are properly converted to Date objects
        const processedInvoices = invoicesData.map(invoice => ({
          ...invoice,
          issueDate: invoice.issueDate instanceof Date ? invoice.issueDate : new Date(invoice.issueDate),
          dueDate: invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate),
          createdAt: invoice.createdAt instanceof Date ? invoice.createdAt : new Date(invoice.createdAt),
          updatedAt: invoice.updatedAt instanceof Date ? invoice.updatedAt : new Date(invoice.updatedAt)
        }));
        
        setInvoices(processedInvoices);
        
        // Fetch creator information for all invoices
        const creatorIds = [...new Set(invoicesData.map(inv => inv.createdBy).filter((id): id is string => Boolean(id)))];
        const creatorsData: Record<string, UserType> = {};
        for (const creatorId of creatorIds) {
          try {
            const creator = await userService.getUserByUid(creatorId);
            if (creator) {
              creatorsData[creatorId] = creator;
            }
          } catch (error) {
            console.error('Error fetching creator:', creatorId, error);
          }
        }
        setCreators(creatorsData);
        
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

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowForm(true);
  };

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowView(true);
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await invoiceService.deleteInvoice(invoice.id, userProfile?.uid || '');
      setInvoices(invoices.filter(inv => inv.id !== invoice.id));
      addToast({
        type: 'success',
        title: 'Invoice Deleted',
        message: 'Invoice has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete invoice.'
      });
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    if (!client || !company) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Unable to generate PDF. Missing client or company data.'
      });
      return;
    }

    try {
      const creator = invoice.createdBy ? creators[invoice.createdBy] : null;
      await generateInvoicePDF(invoice, client, company, creator);
      addToast({
        type: 'success',
        title: 'PDF Generated',
        message: 'Invoice PDF has been downloaded.'
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

  const handleSendEmail = (invoice: Invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    if (!client) return;

    const subject = `Invoice ${invoice.invoiceNumber} from ${company?.name}`;
    const body = `Dear ${client.name},\n\nPlease find attached your invoice ${invoice.invoiceNumber} for ${formatCurrency(invoice.total)}.\n\nDue Date: ${formatDate(invoice.dueDate)}\n\nThank you for your business!\n\nBest regards,\n${company?.name}`;
    
    window.open(`mailto:${client.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (invoice.status === 'paid') {
      addToast({
        type: 'info',
        title: 'Already Paid',
        message: 'This invoice is already marked as paid.'
      });
      return;
    }
    if (!confirm(`Mark invoice ${invoice.invoiceNumber} as paid? This will automatically create a receipt.`)) {
      return;
    }
    try {
      await invoiceService.updateInvoice(invoice.id, { status: 'paid', updatedAt: new Date() }, userProfile?.uid || '');
      // Create receipt automatically (existing logic)
      const receiptResult = await createReceiptFromInvoice(invoice, 'cash', userProfile?.uid);
      if (receiptResult.success) {
        addToast({
          type: 'success',
          title: 'Invoice Marked as Paid',
          message: 'Invoice has been marked as paid and receipt has been automatically created.'
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Invoice Marked as Paid',
          message: `Invoice has been marked as paid, but failed to create receipt: ${receiptResult.error}`
        });
      }
      refreshData();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark invoice as paid.'
      });
    }
  };

  const refreshData = () => {
    setLoading(true);
    const fetchData = async () => {
      if (!userProfile?.companyId) return;
      try {
        let invoicesData;
        if (userProfile.role === 'admin') {
          // Admin sees all invoices
          invoicesData = await invoiceService.getInvoices(userProfile.companyId);
        } else {
          // Seller sees only their invoices
          invoicesData = await invoiceService.getInvoicesBySeller(userProfile.companyId, userProfile.uid);
        }
        
        // Ensure all dates are properly converted to Date objects
        const processedInvoices = invoicesData.map(invoice => ({
          ...invoice,
          issueDate: invoice.issueDate instanceof Date ? invoice.issueDate : new Date(invoice.issueDate),
          dueDate: invoice.dueDate instanceof Date ? invoice.dueDate : new Date(invoice.dueDate),
          createdAt: invoice.createdAt instanceof Date ? invoice.createdAt : new Date(invoice.createdAt),
          updatedAt: invoice.updatedAt instanceof Date ? invoice.updatedAt : new Date(invoice.updatedAt)
        }));
        
        setInvoices(processedInvoices);
      } catch (error) {
        console.error('Error fetching invoices:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  };
  const filteredInvoices = invoices.filter(invoice => {
    // Search filter
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Status filter
    if (filters.status && invoice.status !== filters.status) return false;
    
    // Date range filter
    if (filters.dateFrom) {
      const invoiceDate = new Date(invoice.issueDate);
      const fromDate = new Date(filters.dateFrom);
      if (invoiceDate < fromDate) return false;
    }
    
    if (filters.dateTo) {
      const invoiceDate = new Date(invoice.issueDate);
      const toDate = new Date(filters.dateTo);
      if (invoiceDate > toDate) return false;
    }
    
    // Amount range filter
    if (filters.amountFrom && invoice.total < parseFloat(filters.amountFrom)) return false;
    if (filters.amountTo && invoice.total > parseFloat(filters.amountTo)) return false;
    
    // Created by filter (only for admin)
    if (filters.createdBy && userProfile?.role === 'admin') {
      if (invoice.createdBy !== filters.createdBy) return false;
    }
    
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
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
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {userProfile?.role === 'admin' ? 'Invoices' : 'My Invoices'}
        </h1>
        <Button className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          <span onClick={() => setShowForm(true)}>New Invoice</span>
        </Button>
      </div>

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4 mb-6">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search invoices..."
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
                  Invoice
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                  Title
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                  Amount
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                  Date
                </th>
                {userProfile?.role === 'admin' && (
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Created By
                  </th>
                )}
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <motion.tr
                  key={invoice.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {invoice.invoiceNumber}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                    {invoice.title}
                  </td>
                  <td className="py-4 px-4 font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(invoice.total)}
                  </td>
                  <td className="py-4 px-4">
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                    {formatDate(invoice.issueDate)}
                  </td>
                  {userProfile?.role === 'admin' && (
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {invoice.createdBy && creators[invoice.createdBy] ? (
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          <span>{creators[invoice.createdBy].displayName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Unknown</span>
                      )}
                    </td>
                  )}
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleView(invoice)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(invoice)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      {invoice.status !== 'paid' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleMarkAsPaid(invoice)}
                          className="text-green-600 hover:text-green-700"
                          title="Mark as Paid"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(invoice)}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleSendEmail(invoice)}>
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(invoice)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <InvoiceForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedInvoice(undefined);
        }}
        invoice={selectedInvoice}
        onSave={refreshData}
      />

      <InvoiceView
        isOpen={showView}
        onClose={() => {
          setShowView(false);
          setSelectedInvoice(undefined);
        }}
        invoice={selectedInvoice}
        client={selectedInvoice ? clients.find(c => c.id === selectedInvoice.clientId) : undefined}
        company={company}
        onSave={refreshData}
      />

      {/* Filter Modal */}
      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter Invoices">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'paid', label: 'Paid' },
                { value: 'overdue', label: 'Overdue' }
              ]}
            />
            
            {userProfile?.role === 'admin' && (
              <Select
                label="Created By"
                value={filters.createdBy}
                onChange={(e) => setFilters({ ...filters, createdBy: e.target.value })}
                options={[
                  { value: '', label: 'All Users' },
                  ...Object.entries(creators).map(([id, user]) => ({
                    value: id,
                    label: user.displayName
                  }))
                ]}
              />
            )}
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
                  status: '',
                  dateFrom: '',
                  dateTo: '',
                  amountFrom: '',
                  amountTo: '',
                  createdBy: ''
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