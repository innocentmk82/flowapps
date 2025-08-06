import React, { useState } from 'react';
import { X, Download, FileText, Table } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { format } from 'date-fns';

interface ExportModalProps {
  data: {
    totalSales: number;
    totalTransactions: number;
    averageTransactionValue: number;
    topProducts: Array<{
      id: string;
      name: string;
      quantity: number;
      revenue: number;
    }>;
    salesData: any[];
  };
  period: string;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ data, period, onClose }) => {
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    const csvContent = [
      ['Sales Report', `Period: ${period}`],
      [''],
      ['Summary'],
      ['Total Sales', formatCurrency(data.totalSales)],
      ['Total Transactions', data.totalTransactions.toString()],
      ['Average Transaction Value', formatCurrency(data.averageTransactionValue)],
      [''],
      ['Top Products'],
      ['Product Name', 'Quantity Sold', 'Revenue'],
      ...data.topProducts.map(product => [
        product.name,
        product.quantity.toString(),
        formatCurrency(product.revenue)
      ]),
      [''],
      ['Sales Data'],
      ['Date', 'Total Sales', 'Transactions'],
      ...data.salesData.map(sale => [
        format(new Date(sale.createdAt), 'yyyy-MM-dd HH:mm'),
        formatCurrency(sale.total),
        '1'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${period}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text('Sales Report', 20, 30);
      
      doc.setFontSize(12);
      doc.text(`Period: ${period}`, 20, 45);
      doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, 20, 55);

      // Summary
      doc.setFontSize(16);
      doc.text('Summary', 20, 75);
      
      doc.setFontSize(12);
      doc.text(`Total Sales: ${formatCurrency(data.totalSales)}`, 20, 90);
      doc.text(`Total Transactions: ${data.totalTransactions}`, 20, 100);
      doc.text(`Average Transaction Value: ${formatCurrency(data.averageTransactionValue)}`, 20, 110);

      // Top Products
      doc.setFontSize(16);
      doc.text('Top Products', 20, 130);
      
      doc.setFontSize(12);
      let yPos = 145;
      data.topProducts.slice(0, 10).forEach((product, index) => {
        doc.text(
          `${index + 1}. ${product.name} - ${product.quantity} units - ${formatCurrency(product.revenue)}`,
          20,
          yPos
        );
        yPos += 10;
      });

      doc.save(`sales-report-${period}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try CSV export instead.');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (exportType === 'csv') {
        exportToCSV();
      } else {
        await exportToPDF();
      }
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Export Report
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Export Format
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="csv"
                  checked={exportType === 'csv'}
                  onChange={(e) => setExportType(e.target.value as 'csv')}
                  className="mr-3"
                />
                <Table className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-gray-900 dark:text-white">CSV (Excel compatible)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="pdf"
                  checked={exportType === 'pdf'}
                  onChange={(e) => setExportType(e.target.value as 'pdf')}
                  className="mr-3"
                />
                <FileText className="h-5 w-5 mr-2 text-gray-500" />
                <span className="text-gray-900 dark:text-white">PDF Report</span>
              </label>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              Report Contents
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Sales summary for {period}</li>
              <li>• Top selling products</li>
              <li>• Transaction details</li>
              <li>• Revenue analytics</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {exporting ? (
                'Exporting...'
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;