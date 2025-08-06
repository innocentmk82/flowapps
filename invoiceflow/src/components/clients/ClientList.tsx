import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Mail, Phone, Edit, Trash2 } from 'lucide-react';
import { clientService } from '../../lib/dataService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';
import { Client } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ClientForm } from './ClientForm';
import { formatDate } from '../../lib/utils';

export const ClientList: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const { userProfile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchClients = async () => {
      if (!userProfile?.companyId) return;

      try {
        const clientsData = await clientService.getClients(userProfile.companyId);
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [userProfile?.companyId]);

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setShowForm(true);
  };

  const handleDelete = async (client: Client) => {
    if (!confirm('Are you sure you want to delete this client?')) return;

    try {
      await clientService.deleteClient(client.id, userProfile?.uid || '');
      setClients(clients.filter(c => c.id !== client.id));
      addToast({
        type: 'success',
        title: 'Client Deleted',
        message: 'Client has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting client:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete client.'
      });
    }
  };

  const refreshData = () => {
    setLoading(true);
    const fetchClients = async () => {
      if (!userProfile?.companyId) return;

      try {
        const clientsData = await clientService.getClients(userProfile.companyId);
        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchClients();
  };
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clients</h1>
        <Button className="w-full sm:w-auto" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      <Card>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-4 mb-6">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {client.name}
                </h3>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => window.open(`mailto:${client.email}`)}>
                    <Mail className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(`tel:${client.phone}`)}>
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(client)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(client)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  {client.email}
                </p>
                <p className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  {client.phone}
                </p>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Added {formatDate(client.createdAt)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      <ClientForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedClient(undefined);
        }}
        client={selectedClient}
        onSave={refreshData}
      />
    </div>
  );
};