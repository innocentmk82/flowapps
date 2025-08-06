import React, { useState } from 'react';
import { Quotation } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { generateQuotationPDF, generateQuotationPDFAsBlob } from '../../lib/pdf';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { convertFirestoreTimestampToDate, formatDate } from '../../lib/utils';
import { Company } from '../../types';

interface QuotationViewProps {
  quotation: Quotation;
  onBack: () => void;
}

export const QuotationView: React.FC<QuotationViewProps> = ({ quotation, onBack }) => {
  const { addToast } = useToast();
  const { userProfile } = useAuth();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  // Fetch company data
  React.useEffect(() => {
    const fetchCompany = async () => {
      if (!userProfile?.companyId) return;

      try {
        const docRef = doc(db, 'companies', userProfile.companyId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setCompany(convertFirestoreTimestampToDate(docSnap.data()) as Company);
        }
      } catch (error) {
        console.error('Error fetching company:', error);
      }
    };

    fetchCompany();
  }, [userProfile?.companyId]);

  const handleDownloadPDF = async () => {
    if (!company) {
      addToast({ type: 'error', title: 'Error', message: 'Company data not available.' });
      return;
    }
    
    try {
      await generateQuotationPDF(quotation, company);
    } catch (error) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to generate PDF.' });
    }
  };

  const handleShareEmail = () => {
    setShowEmailModal(true);
  };

  const handleSendEmailActual = async () => {
    if (!company) {
      addToast({ type: 'error', title: 'Error', message: 'Company data not available.' });
      return;
    }

    setSending(true);
    try {
      // Generate PDF as blob
      const pdfBlob = await new Promise<Blob>((resolve) => {
        const originalSave = (window as any).jsPDF.prototype.save;
        let blob: Blob | null = null;
        (window as any).jsPDF.prototype.save = function(this: any, filename: string) {
          blob = this.output('blob');
        };
        generateQuotationPDF(quotation, company).then(() => {
          (window as any).jsPDF.prototype.save = originalSave;
          resolve(blob!);
        });
      });
      // Convert to base64
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });
      // Send to API
      const subject = `Quotation from ${company.name}`;
      const html = `<p>Dear ${quotation.clientName},</p><p>Please find attached your quotation from ${company.name}.<br/>Total: <b>$${quotation.total.toFixed(2)}</b></p><p>Thank you for your business!</p>`;
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject,
          html,
          pdfBase64,
          pdfFilename: `quotation-${quotation.id}.pdf`
        })
      });
      if (res.ok) {
        addToast({ type: 'success', title: 'Email Sent', message: 'Quotation sent successfully.' });
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

  const handleShareWhatsApp = async () => {
    if (!company) {
      addToast({ type: 'error', title: 'Error', message: 'Company data not available.' });
      return;
    }
    try {
      // Generate PDF as blob and trigger download
      const doc = await generateQuotationPDFAsBlob(quotation, company);
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `quotation-${quotation.id || quotation.clientName}.pdf`;
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
    const message = `Hi ${quotation.clientName},%0A%0AHere is your quotation. Total: $${quotation.total.toFixed(2)}.%0A%0AThank you!`;
    const url = `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded shadow">
      <Button variant="outline" onClick={onBack} className="mb-4">Back</Button>
      <h2 className="text-2xl font-bold mb-2">Quotation for {quotation.clientName}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Quotation Details</h4>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Date:</span>
            <span className="text-gray-900 dark:text-white">{formatDate(new Date(quotation.date))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Expiry Date:</span>
            <span className="text-gray-900 dark:text-white">{formatDate(new Date(quotation.expiryDate))}</span>
          </div>
          {company?.vatRegistrationNumber && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">VAT Reg. Number:</span>
              <span className="text-gray-900 dark:text-white">{company.vatRegistrationNumber}</span>
            </div>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Totals</h4>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="text-gray-900 dark:text-white">${quotation.subtotal?.toFixed(2) ?? '0.00'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">VAT ({quotation.tax ?? 0}%):</span>
            <span className="text-gray-900 dark:text-white">${((quotation.subtotal ?? 0) * (quotation.tax ?? 0) / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span className="text-gray-900 dark:text-white">Total:</span>
            <span className="text-gray-900 dark:text-white">${quotation.total?.toFixed(2) ?? '0.00'}</span>
          </div>
        </div>
      </div>
      <div className="mb-2">Status: {quotation.status}</div>
      <div className="mb-2">Notes: {quotation.notes}</div>
      <table className="min-w-full bg-white dark:bg-gray-900 mb-4">
        <thead>
          <tr>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2">Qty</th>
            <th className="px-4 py-2">Unit Price</th>
            <th className="px-4 py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {quotation.items.map((item, idx) => (
            <tr key={idx} className="border-b">
              <td className="px-4 py-2">{item.description}</td>
              <td className="px-4 py-2">{item.quantity}</td>
              <td className="px-4 py-2">${item.unitPrice.toFixed(2)}</td>
              <td className="px-4 py-2">${(item.quantity * item.unitPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="font-bold text-lg mb-4">Total: ${quotation.total.toFixed(2)}</div>
      <div className="flex space-x-2 mb-4">
        <Button onClick={handleDownloadPDF}>Download PDF</Button>
        <Button variant="outline" onClick={handleShareEmail}>Share via Email</Button>
        <Button variant="outline" onClick={handleShareWhatsApp}>
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M20.52 3.48A11.93 11.93 0 0012 0C5.37 0 0 5.37 0 12c0 2.11.55 4.16 1.6 5.97L0 24l6.22-1.63A11.93 11.93 0 0012 24c6.63 0 12-5.37 12-12 0-3.19-1.24-6.19-3.48-8.52zM12 22c-1.85 0-3.67-.5-5.24-1.44l-.37-.22-3.69.97.99-3.59-.24-.37A9.94 9.94 0 012 12c0-5.52 4.48-10 10-10s10 4.48 10 10-4.48 10-10 10zm5.2-7.6c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.4-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.18-.29.28-.48.09-.19.05-.36-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.62-.47-.16-.01-.36-.01-.56-.01-.19 0-.5.07-.76.34-.26.27-1 1-.97 2.43.03 1.43 1.03 2.81 1.18 3 .15.19 2.03 3.1 4.93 4.23.69.3 1.23.48 1.65.61.69.22 1.32.19 1.81.12.55-.08 1.65-.67 1.89-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.19-.53-.33z"/></svg>
          Share via WhatsApp
        </Button>
      </div>
      <Modal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} title="Share Quotation via Email">
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
    </div>
  );
}; 