import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { clientService } from '../../lib/dataService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Client } from '../../types';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  client?: Client;
  onSave: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ isOpen, onClose, client, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        taxId: client.taxId || ''
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        taxId: ''
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.companyId) return;

    setIsLoading(true);
    try {
      const clientData = {
        companyId: userProfile.companyId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        taxId: formData.taxId,
        updatedAt: new Date()
      };

      if (client) {
        await clientService.updateClient(client.id, clientData, userProfile?.uid || '');
        addToast({
          type: 'success',
          title: 'Client Updated',
          message: 'Client has been updated successfully.'
        });
      } else {
        await clientService.createClient({
          ...clientData,
          createdAt: new Date()
        }, userProfile?.uid || '');
        addToast({
          type: 'success',
          title: 'Client Created',
          message: 'Client has been created successfully.'
        });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save client. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={client ? 'Edit Client' : 'Add Client'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Client Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter client name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email address"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
            required
          />
          <Input
            label="Taxpayer ID (TIN)"
            value={formData.taxId}
            onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            placeholder="Enter taxpayer ID for SRA compliance"
          />
        </div>

        <Textarea
          label="Address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="Enter client address"
          required
        />

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {client ? 'Update' : 'Add'} Client
          </Button>
        </div>
      </form>
    </Modal>
  );
};