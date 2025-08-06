import React, { useEffect, useState } from 'react';
import { Quotation } from '../types';
import { quotationService } from '../lib/dataService';
import { QuotationList } from '../components/quotations/QuotationList';
import { QuotationForm } from '../components/quotations/QuotationForm';
import { QuotationView } from '../components/quotations/QuotationView';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { convertFirestoreTimestampToDate } from '../lib/utils';

export const Quotations: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formInitial, setFormInitial] = useState<any>(null);
  const { userProfile } = useAuth();

  const fetchQuotations = async () => {
    if (!userProfile?.companyId) return;
    setLoading(true);
    let data;
    if (userProfile.role === 'admin') {
      // Admin sees all quotations
      data = await quotationService.getQuotations(userProfile.companyId);
    } else {
      // Seller sees only their quotations
      data = await quotationService.getQuotationsBySeller(userProfile.companyId, userProfile.uid);
    }
    data = convertFirestoreTimestampToDate(data);
    setQuotations(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleAdd = () => {
    setFormInitial(null);
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = async (id: string) => {
    setEditingId(id);
    const quotation = await quotationService.getQuotation(id);
    setFormInitial(quotation);
    setShowForm(true);
  };

  const handleView = (id: string) => {
    setViewingId(id);
  };

  const handleDelete = async (id: string) => {
    if (!userProfile?.uid) return;
    if (window.confirm('Delete this quotation?')) {
      await quotationService.deleteQuotation(id, userProfile.uid);
      fetchQuotations();
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (!userProfile?.uid || !userProfile.companyId) return;
    setLoading(true);
    if (editingId) {
      await quotationService.updateQuotation(editingId, data, userProfile.uid);
    } else {
      await quotationService.createQuotation({ 
        ...data, 
        companyId: userProfile.companyId,
        createdBy: userProfile.uid // Track which seller created this quotation
      }, userProfile.uid);
    }
    setShowForm(false);
    setEditingId(null);
    fetchQuotations();
    setLoading(false);
  };

  const handleBack = () => {
    setViewingId(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {userProfile?.role === 'admin' ? 'Quotations' : 'My Quotations'}
        </h1>
        <Button onClick={handleAdd}>New Quotation</Button>
      </div>
      {showForm ? (
        <QuotationForm initialData={formInitial} onSubmit={handleFormSubmit} loading={loading} />
      ) : viewingId ? (
        <QuotationView quotation={quotations.find(q => q.id === viewingId)!} onBack={handleBack} />
      ) : (
        <QuotationList quotations={quotations} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </div>
  );
}; 