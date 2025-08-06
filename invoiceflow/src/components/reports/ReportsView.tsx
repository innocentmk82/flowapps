import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Calendar, DollarSign, FileText, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Invoice, Receipt, Client, Company } from '../../types';
import { formatCurrency, formatDateForSRA, validateSRAReportData } from '../../lib/utils';
import { convertFirestoreTimestampToDate } from '../../lib/utils';
import { invoiceService, receiptService, clientService, companyService } from '../../lib/dataService';
import { useToast } from '../ui/Toast';

// Helper function to safely format dates for file names
const getSafeDateString = (date: any): string => {
  if (!date) return 'unknown';
  const d = date instanceof Date ? date : new Date(date);
  return isNaN(d.getTime()) ? 'unknown' : d.toISOString().split('T')[0];
};

// Helper function to safely get date range for file names
const getDateRangeForFilename = (invoices: Invoice[]): string => {
  if (!invoices || invoices.length === 0) {
    return 'no-data';
  }
  
  const startDate = getSafeDateString(invoices[0]?.issueDate);
  const endDate = getSafeDateString(invoices[invoices.length - 1]?.issueDate);
  
  return `${startDate}-to-${endDate}`;
};

export const ReportsView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  // Restore dateRange state
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [reportType, setReportType] = useState('revenue');
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.companyId) return;
      try {
        // Fetch invoices
        let invoicesData = await invoiceService.getInvoices(userProfile.companyId);
        invoicesData = convertFirestoreTimestampToDate(invoicesData);
        invoicesData = invoicesData.map(inv => {
          // Safely convert dates with validation
          const safeDate = (date: any): Date => {
            if (date instanceof Date) return date;
            if (!date) return new Date();
            const d = new Date(date);
            return isNaN(d.getTime()) ? new Date() : d;
          };
          
          return {
            ...inv,
            issueDate: safeDate(inv.issueDate),
            dueDate: safeDate(inv.dueDate),
            createdAt: safeDate(inv.createdAt),
            updatedAt: safeDate(inv.updatedAt)
          };
        });
        setInvoices(invoicesData);

        // Fetch receipts
        let receiptsData = await receiptService.getReceipts(userProfile.companyId);
        receiptsData = convertFirestoreTimestampToDate(receiptsData);
        receiptsData = receiptsData.map(rec => {
          // Safely convert dates with validation
          const safeDate = (date: any): Date => {
            if (date instanceof Date) return date;
            if (!date) return new Date();
            const d = new Date(date);
            return isNaN(d.getTime()) ? new Date() : d;
          };
          
          return {
            ...rec,
            date: safeDate(rec.date),
            createdAt: safeDate(rec.createdAt),
            updatedAt: safeDate(rec.updatedAt)
          };
        });
        setReceipts(receiptsData);

        // Fetch clients
        const clientsData = await clientService.getClients(userProfile.companyId);
        setClients(clientsData);

        // Fetch company
        const companyData = await companyService.getCompany(userProfile.companyId);
        setCompany(companyData);
        setError(null);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        if (
          error?.message?.includes('permission') ||
          error?.code === 'permission-denied' ||
          error?.toString().includes('permission')
        ) {
          setError('You do not have permission to view this data. Please contact your administrator.');
        } else {
          setError('An error occurred while fetching data.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userProfile?.companyId]);

  // Filter invoices and receipts by date range
  const filteredInvoices = invoices.filter(invoice => {
    if (!invoice.issueDate) return false;
    const dateVal = invoice.issueDate instanceof Date ? invoice.issueDate : new Date(invoice.issueDate);
    if (isNaN(dateVal.getTime())) return false;
    const invoiceDate = dateVal.toISOString().split('T')[0];
    return invoiceDate >= dateRange.start && invoiceDate <= dateRange.end;
  });
  const filteredReceipts = receipts.filter(receipt => {
    if (!receipt.date) return false;
    const dateVal = receipt.date instanceof Date ? receipt.date : new Date(receipt.date);
    if (isNaN(dateVal.getTime())) return false;
    const receiptDate = dateVal.toISOString().split('T')[0];
    return receiptDate >= dateRange.start && receiptDate <= dateRange.end;
  });

  // Use filtered data for metrics
  const totalRevenue = filteredReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const totalInvoiced = filteredInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalOutstanding = filteredInvoices.filter(inv => inv.status !== 'paid').reduce((sum, invoice) => sum + invoice.total, 0);
  const totalOverdue = filteredInvoices.filter(inv => inv.status === 'overdue').reduce((sum, invoice) => sum + invoice.total, 0);

  // Monthly revenue data (filtered receipts)
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(2024, i, 1);
    const monthName = month.toLocaleDateString('en-US', { month: 'short' });
    const monthlyRevenue = filteredReceipts.filter(receipt => receipt.date.getMonth() === i).reduce((sum, receipt) => sum + receipt.amount, 0);
    return { month: monthName, revenue: monthlyRevenue };
  });

  // Status distribution (filtered invoices)
  const statusData = [
    { name: 'Paid', value: filteredInvoices.filter(inv => inv.status === 'paid').length, color: '#10B981' },
    { name: 'Sent', value: filteredInvoices.filter(inv => inv.status === 'sent').length, color: '#3B82F6' },
    { name: 'Draft', value: filteredInvoices.filter(inv => inv.status === 'draft').length, color: '#6B7280' },
    { name: 'Overdue', value: filteredInvoices.filter(inv => inv.status === 'overdue').length, color: '#EF4444' }
  ];

  // SRA-compliant export function
  const exportSRAReport = () => {
    const sraData = filteredInvoices.map(invoice => {
      const client = clients.find(c => c.id === invoice.clientId);
      // Safely handle issueDate
      let issueDate: Date;
      if (invoice.issueDate instanceof Date) {
        issueDate = invoice.issueDate;
      } else if (invoice.issueDate) {
        issueDate = new Date(invoice.issueDate);
        if (isNaN(issueDate.getTime())) {
          issueDate = new Date(); // Fallback to current date if invalid
        }
      } else {
        issueDate = new Date(); // Fallback to current date if missing
      }
      
      const vatAmount = invoice.subtotal * (invoice.tax / 100);
      
      return {
        'Customer/Supplier Name': client?.name || 'Unknown Client',
        'Taxpayer ID (TIN)': client?.taxId || '',
        'Invoice Number': invoice.invoiceNumber,
        'Invoice Date': formatDateForSRA(issueDate),
        'Description': invoice.title,
        'Amount (excl. VAT)': invoice.subtotal.toFixed(2),
        'VAT Amount': vatAmount.toFixed(2)
      };
    });

    // Validate data before export
    const validation = validateSRAReportData(sraData);
    if (!validation.isValid) {
      addToast({
        type: 'warning',
        title: 'Data Validation Warning',
        message: `Found ${validation.errors.length} validation issues. Report will still be exported.`
      });
      console.warn('SRA Report Validation Errors:', validation.errors);
    }

    if (sraData.length === 0) {
      addToast({
        type: 'error',
        title: 'No Data',
        message: 'No invoices found for the selected date range.'
      });
      return;
    }

    const csvContent = [
      Object.keys(sraData[0]).join(','),
      ...sraData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SRA-Revenue-Report-${getDateRangeForFilename(filteredInvoices)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'SRA Report Exported',
      message: 'Report exported successfully. Ready for TaxEase import.'
    });
  };

  // Comprehensive SRA report with both invoices and payments
  const exportSRAComprehensiveReport = () => {
    const comprehensiveData: any[] = [];

    // Add invoice data
    filteredInvoices.forEach(invoice => {
      const client = clients.find(c => c.id === invoice.clientId);
      // Safely handle issueDate
      let issueDate: Date;
      if (invoice.issueDate instanceof Date) {
        issueDate = invoice.issueDate;
      } else if (invoice.issueDate) {
        issueDate = new Date(invoice.issueDate);
        if (isNaN(issueDate.getTime())) {
          issueDate = new Date(); // Fallback to current date if invalid
        }
      } else {
        issueDate = new Date(); // Fallback to current date if missing
      }
      
      const vatAmount = invoice.subtotal * (invoice.tax / 100);
      
      comprehensiveData.push({
        'Type': 'Invoice',
        'Customer/Supplier Name': client?.name || 'Unknown Client',
        'Taxpayer ID (TIN)': client?.taxId || '',
        'Invoice Number': invoice.invoiceNumber,
        'Invoice Date': formatDateForSRA(issueDate),
        'Description': invoice.title,
        'Amount (excl. VAT)': invoice.subtotal.toFixed(2),
        'VAT Amount': vatAmount.toFixed(2),
        'Total Amount': invoice.total.toFixed(2),
        'Status': invoice.status,
        'Payment Date': '',
        'Payment Method': ''
      });
    });

    // Add payment data
    filteredReceipts.forEach(receipt => {
      const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
      const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
      
      // Safely handle payment date
      let paymentDate: Date;
      if (receipt.date instanceof Date) {
        paymentDate = receipt.date;
      } else if (receipt.date) {
        paymentDate = new Date(receipt.date);
        if (isNaN(paymentDate.getTime())) {
          paymentDate = new Date(); // Fallback to current date if invalid
        }
      } else {
        paymentDate = new Date(); // Fallback to current date if missing
      }
      
      // Safely handle invoice issue date
      let invoiceIssueDate: Date;
      if (invoice?.issueDate instanceof Date) {
        invoiceIssueDate = invoice.issueDate;
      } else if (invoice?.issueDate) {
        invoiceIssueDate = new Date(invoice.issueDate);
        if (isNaN(invoiceIssueDate.getTime())) {
          invoiceIssueDate = new Date(); // Fallback to current date if invalid
        }
      } else {
        invoiceIssueDate = new Date(); // Fallback to current date if missing
      }
      
      const vatAmount = invoice ? (invoice.subtotal * (invoice.tax / 100)) : 0;
      
      comprehensiveData.push({
        'Type': 'Payment',
        'Customer/Supplier Name': client?.name || 'Unknown Client',
        'Taxpayer ID (TIN)': client?.taxId || '',
        'Invoice Number': invoice?.invoiceNumber || '',
        'Invoice Date': invoice ? formatDateForSRA(invoiceIssueDate) : '',
        'Description': invoice?.title || 'Payment Receipt',
        'Amount (excl. VAT)': invoice?.subtotal.toFixed(2) || '0.00',
        'VAT Amount': vatAmount.toFixed(2),
        'Total Amount': receipt.amount.toFixed(2),
        'Status': 'Paid',
        'Payment Date': formatDateForSRA(paymentDate),
        'Payment Method': receipt.method
      });
    });

    if (comprehensiveData.length === 0) {
      addToast({
        type: 'error',
        title: 'No Data',
        message: 'No data found for the selected date range.'
      });
      return;
    }

    const csvContent = [
      Object.keys(comprehensiveData[0]).join(','),
      ...comprehensiveData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SRA-Comprehensive-Report-${getDateRangeForFilename(filteredInvoices)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Comprehensive Report Exported',
      message: 'Complete SRA report exported successfully.'
    });
  };

  // Enhanced export function for all report types
  const exportToCSV = () => {
    let csvData: any[] = [];
    let filename = '';
    
    if (reportType === 'invoices') {
      csvData = filteredInvoices.map(invoice => {
        // Safely handle issueDate
        let issueDate: Date;
        if (invoice.issueDate instanceof Date) {
          issueDate = invoice.issueDate;
        } else if (invoice.issueDate) {
          issueDate = new Date(invoice.issueDate);
          if (isNaN(issueDate.getTime())) {
            issueDate = new Date(); // Fallback to current date if invalid
          }
        } else {
          issueDate = new Date(); // Fallback to current date if missing
        }
        
        // Safely handle dueDate
        let dueDate: Date;
        if (invoice.dueDate instanceof Date) {
          dueDate = invoice.dueDate;
        } else if (invoice.dueDate) {
          dueDate = new Date(invoice.dueDate);
          if (isNaN(dueDate.getTime())) {
            dueDate = new Date(); // Fallback to current date if invalid
          }
        } else {
          dueDate = new Date(); // Fallback to current date if missing
        }
        
        const client = clients.find(c => c.id === invoice.clientId);
        const vatAmount = invoice.subtotal * (invoice.tax / 100);
        
        return {
          'Invoice Number': invoice.invoiceNumber,
          'Title': invoice.title,
          'Client': client ? client.name : invoice.clientId,
          'Client Email': client ? client.email : '',
          'Client Phone': client ? client.phone : '',
          'Taxpayer ID (TIN)': client?.taxId || '',
          'Subtotal': invoice.subtotal.toFixed(2),
          'VAT %': invoice.tax.toFixed(2),
          'VAT Amount': vatAmount.toFixed(2),
          'Total': invoice.total.toFixed(2),
          'Status': invoice.status,
          'Issue Date': formatDateForSRA(issueDate),
          'Due Date': formatDateForSRA(dueDate),
          'Notes': invoice.notes || '',
          'Company VAT': company?.vatRegistrationNumber || '',
        };
      });
      filename = `invoices-report-${getDateRangeForFilename(filteredInvoices)}.csv`;
    } else if (reportType === 'payments') {
      csvData = filteredReceipts.map(receipt => {
        const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
        const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
        
        // Safely handle receipt date
        let receiptDate: Date;
        if (receipt.date instanceof Date) {
          receiptDate = receipt.date;
        } else if (receipt.date) {
          receiptDate = new Date(receipt.date);
          if (isNaN(receiptDate.getTime())) {
            receiptDate = new Date(); // Fallback to current date if invalid
          }
        } else {
          receiptDate = new Date(); // Fallback to current date if missing
        }
        
        const vatAmount = invoice ? (invoice.subtotal * (invoice.tax / 100)) : 0;
        
        return {
          'Receipt ID': receipt.id,
          'Invoice Number': invoice?.invoiceNumber || '',
          'Client': client ? client.name : invoice?.clientId || '',
          'Client Email': client ? client.email : '',
          'Client Phone': client ? client.phone : '',
          'Taxpayer ID (TIN)': client?.taxId || '',
          'Subtotal': invoice?.subtotal.toFixed(2) ?? '0.00',
          'VAT %': invoice?.tax.toFixed(2) ?? '0.00',
          'VAT Amount': vatAmount.toFixed(2),
          'Invoice Total': invoice?.total.toFixed(2) ?? '0.00',
          'Amount Paid': receipt.amount.toFixed(2),
          'Method': receipt.method,
          'Payment Date': formatDateForSRA(receiptDate),
          'Company VAT': company?.vatRegistrationNumber || '',
        };
      });
      filename = `payments-report-${getDateRangeForFilename(filteredInvoices)}.csv`;
    } else if (reportType === 'revenue') {
      csvData = monthlyData.map(row => ({
        'Month': row.month,
        'Revenue': row.revenue.toFixed(2),
        'Company VAT': company?.vatRegistrationNumber || '',
      }));
      filename = `revenue-report-${getDateRangeForFilename(filteredInvoices)}.csv`;
    }

    if (csvData.length === 0) {
      addToast({
        type: 'error',
        title: 'No Data',
        message: 'No data available for export in the selected date range.'
      });
      return;
    }

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Report Exported',
      message: 'Report has been exported successfully.'
    });
  };

  const reportTypeOptions = [
    { value: 'revenue', label: 'Revenue Report' },
    { value: 'invoices', label: 'Invoice Report' },
    { value: 'payments', label: 'Payment Report' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400 text-lg font-semibold text-center">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Generate SRA-compliant reports for TaxEase submission
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700" 
            onClick={exportSRAReport}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export SRA Report
          </Button>
          <Button 
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700" 
            onClick={exportSRAComprehensiveReport}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Comprehensive Report
          </Button>
          <Button className="w-full sm:w-auto" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export {reportType === 'invoices' ? 'Invoices' : reportType === 'payments' ? 'Payments' : 'Revenue'} CSV
          </Button>
        </div>
      </div>

      {/* SRA Compliance Notice */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              SRA (Swaziland Revenue Authority) Compliance
            </h3>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p>
                <strong>SRA Report:</strong> Contains invoice data in the exact format required by SRA. 
                This report can be directly imported into TaxEase without any formatting changes.
              </p>
              <p>
                <strong>Comprehensive Report:</strong> Includes both invoices and payment records 
                for complete financial reporting and audit trails.
              </p>
              <p>
                <strong>Date Format:</strong> All dates are formatted as DD/MM/YYYY as required by SRA.
              </p>
              <p>
                <strong>VAT Compliance:</strong> VAT amounts are calculated and displayed separately 
                for easy tax reporting.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Select
            label="Report Type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={reportTypeOptions}
          />
          <Input
            label="Start Date"
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            min="2000-01-01"
            max={dateRange.end}
          />
          <Input
            label="End Date"
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            min={dateRange.start}
            max={new Date().toISOString().split('T')[0]}
          />
          <div className="flex items-end">
            <Button className="w-full" onClick={() => {
              setDateRange({
                start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              });
            }}>
              <Calendar className="w-4 h-4 mr-2" />
              Reset Dates
            </Button>
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(totalRevenue)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                From {filteredReceipts.length} payments
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Invoiced</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(totalInvoiced)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                From {filteredInvoices.length} invoices
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
              <TrendingUp className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Outstanding</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {formatCurrency(totalOutstanding)}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Pending collection
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
              <Calendar className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Overdue</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {formatCurrency(totalOverdue)}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Requires attention
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Revenue Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fill: '#6b7280', fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => `${formatCurrency(value)}`}
              />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="revenue" 
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Invoice Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [value, 'Invoices']}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Transactions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Reference</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Client</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">VAT</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceipts.slice(0, 10).map((receipt) => {
                const invoice = invoices.find(inv => inv.id === receipt.invoiceId);
                const client = invoice ? clients.find(c => c.id === invoice.clientId) : undefined;
                const vatAmount = invoice ? (invoice.subtotal * (invoice.tax / 100)) : 0;
                
                return (
                  <tr key={receipt.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {formatDateForSRA(receipt.date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-medium">
                        Payment
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                      {invoice?.invoiceNumber || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {client?.name || 'Unknown Client'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(receipt.amount)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {formatCurrency(vatAmount)}
                    </td>
                  </tr>
                );
              })}
              {filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                    No transactions found for the selected date range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* VAT Summary */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          VAT Summary for Selected Period
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total VAT Collected</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + (inv.subtotal * (inv.tax / 100)), 0))}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">VAT on Paid Invoices</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(filteredInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.subtotal * (inv.tax / 100)), 0))}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">VAT Registration</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {company?.vatRegistrationNumber || 'Not Set'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};