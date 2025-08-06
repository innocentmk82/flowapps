import React, { useState, useEffect } from 'react';
import { Download, Mail, X, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Invoice, Client, Company, User as UserType } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { generateInvoicePDF, generateInvoicePDFAsBlob } from '../../lib/pdf';
import { useToast } from '../ui/Toast';
import { userService, invoiceService } from '../../lib/dataService';
import jsPDF from 'jspdf';

interface InvoiceViewProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice;
  client?: Client;
  company?: Company | null;
  onSave?: () => void;
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({ 
  isOpen, 
  onClose, 
  invoice, 
  client, 
  company,
  onSave 
}) => {
  const { addToast } = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState(client?.email || '');
  const [sending, setSending] = useState(false);
  const [creator, setCreator] = useState<UserType | null>(null);

  // Fetch creator information when invoice is available
  useEffect(() => {
    const fetchCreator = async () => {
      if (invoice?.createdBy) {
        try {
          const creatorData = await userService.getUserByUid(invoice.createdBy);
          setCreator(creatorData);
        } catch (error) {
          console.error('Error fetching creator information:', error);
        }
      }
    };

    if (invoice) {
      fetchCreator();
    }
  }, [invoice]);

  if (!invoice || !client || !company) return null;

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

  const handleDownload = async () => {
    try {
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

  const handleShareEmail = () => {
    setShowEmailModal(true);
  };

  const handleSendEmailActual = async () => {
    setSending(true);
    try {
      // Generate PDF as blob
      const doc = await generateInvoicePDFAsBlob(invoice, client, company, creator);
      const pdfBlob = doc.output('blob');
      // Convert to base64
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });
      // Send to API
      const subject = `Invoice ${invoice.invoiceNumber} from ${company.name}`;
      const html = `<p>Dear ${client.name},</p><p>Please find attached your invoice <b>${invoice.invoiceNumber}</b> for <b>${formatCurrency(invoice.total)}</b>.<br/>Due Date: <b>${formatDate(invoice.dueDate)}</b></p><p>Thank you for your business!<br/>Best regards,<br/>${company.name}</p>`;
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject,
          html,
          pdfBase64,
          pdfFilename: `invoice-${invoice.invoiceNumber}.pdf`
        })
      });
      if (res.ok) {
        // Update invoice status to 'sent' after successful email sending
        try {
          await invoiceService.updateInvoice(invoice.id, { 
            status: 'sent',
            updatedAt: new Date()
          }, invoice.createdBy || '');
          
          addToast({ type: 'success', title: 'Email Sent', message: 'Invoice sent successfully and status updated.' });
          setShowEmailModal(false);
          
          // Refresh the data if onSave callback is provided
          if (onSave) {
            onSave();
          }
        } catch (updateError) {
          console.error('Error updating invoice status:', updateError);
          addToast({ type: 'success', title: 'Email Sent', message: 'Invoice sent successfully, but failed to update status.' });
          setShowEmailModal(false);
        }
      } else {
        let errorMsg = 'Failed to send email.';
        try {
          const errorData = await res.json();
          if (errorData?.error || errorData?.details) {
            errorMsg = `${errorData.error || ''} ${errorData.details || ''}`.trim();
          }
        } catch (e) {}
        addToast({ type: 'error', title: 'Error', message: errorMsg });
      }
    } catch (error) {
      addToast({ type: 'error', title: 'Error', message: error instanceof Error ? error.message : 'Failed to send email.' });
    } finally {
      setSending(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoice || !client || !company) return;
    try {
      // Generate PDF as blob and trigger download
      const doc = await generateInvoicePDFAsBlob(invoice, client, company);
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
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
    const message = `Hi ${client.name},%0A%0AHere is your invoice (${invoice.invoiceNumber}) from ${company.name} for ${formatCurrency(invoice.total)}. Due: ${formatDate(invoice.dueDate)}.%0A%0AThank you!`;
    const url = `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Invoice Details" size="xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {company.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{company.address}</p>
              <p className="text-gray-600 dark:text-gray-400">{company.phone}</p>
              <p className="text-gray-600 dark:text-gray-400">{company.email}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">INVOICE</h3>
              <p className="text-gray-600 dark:text-gray-400">#{invoice.invoiceNumber}</p>
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Bill To:</h4>
              <p className="text-gray-600 dark:text-gray-400">{client.name}</p>
              <p className="text-gray-600 dark:text-gray-400">{client.address}</p>
              <p className="text-gray-600 dark:text-gray-400">{client.email}</p>
              <p className="text-gray-600 dark:text-gray-400">{client.phone}</p>
            </div>
            <div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Issue Date:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(invoice.issueDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(invoice.dueDate)}</span>
                </div>
                {creator && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created By:</span>
                    <span className="text-gray-900 dark:text-white flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {creator.displayName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 font-medium text-gray-900 dark:text-white">Description</th>
                  <th className="text-right py-3 font-medium text-gray-900 dark:text-white">Qty</th>
                  <th className="text-right py-3 font-medium text-gray-900 dark:text-white">Rate</th>
                  <th className="text-right py-3 font-medium text-gray-900 dark:text-white">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 text-gray-900 dark:text-white">{item.description}</td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">{item.quantity}</td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.rate)}</td>
                    <td className="py-3 text-right text-gray-900 dark:text-white">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2 px-2 sm:w-64 sm:px-0">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tax ({invoice.tax}%):</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(invoice.total - invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span className="text-gray-900 dark:text-white">Total:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Notes:</h4>
              <p className="text-gray-600 dark:text-gray-400">{invoice.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleShareEmail}>
              <Mail className="w-4 h-4 mr-2" />
              Share via Email
            </Button>
            <Button variant="outline" onClick={handleShareWhatsApp}>
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M20.52 3.48A11.93 11.93 0 0012 0C5.37 0 0 5.37 0 12c0 2.11.55 4.16 1.6 5.97L0 24l6.22-1.63A11.93 11.93 0 0012 24c6.63 0 12-5.37 12-12 0-3.19-1.24-6.19-3.48-8.52zM12 22c-1.85 0-3.67-.5-5.24-1.44l-.37-.22-3.69.97.99-3.59-.24-.37A9.94 9.94 0 012 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.2-7.6c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.4-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.18-.29.28-.48.09-.19.05-.36-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.62-.47-.16-.01-.36-.01-.56-.01-.19 0-.5.07-.76.34-.26.27-1 1-.97 2.43.03 1.43 1.03 2.81 1.18 3 .15.19 2.03 3.1 4.93 4.23.69.3 1.23.48 1.65.61.69.22 1.32.19 1.81.12.55-.08 1.65-.67 1.89-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.19-.53-.33z"/></svg>
              Share via WhatsApp
            </Button>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
      {/* Email Modal */}
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="Share Invoice via Email">
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
    </>
  );
};