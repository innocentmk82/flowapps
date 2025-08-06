import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Building2, Info } from 'lucide-react';
import { Company } from '../../types';

export const RegisterForm: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    vatRegistrationNumber: '' // ESRA VAT compliance
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Check if email exists in admins collection
  const checkEmailInAdmins = async (email: string): Promise<boolean> => {
    try {
      const adminsRef = collection(db, 'admins');
      const q = query(adminsRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return false;
      }
      
      // Check if the admin is active
      const adminDoc = querySnapshot.docs[0];
      const adminData = adminDoc.data();
      return adminData.isActive === true;
    } catch (error) {
      console.error('Error checking admin email:', error);
      return false;
    }
  };

  // Validate email on blur
  const handleEmailBlur = async () => {
    if (!formData.email) return;
    
    setEmailError('');
    const isValidEmail = await checkEmailInAdmins(formData.email);
    
    if (!isValidEmail) {
      setEmailError('This email is not authorized to create an account. Please contact your administrator.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Check if email is authorized
      const isEmailAuthorized = await checkEmailInAdmins(formData.email);
      if (!isEmailAuthorized) {
        setError('This email is not authorized to create an account. Please contact your administrator.');
        setIsLoading(false);
        return;
      }

      // Generate company ID
      const companyId = `company_${Date.now()}`;
      
      // Create company document
      const company: Company = {
        id: companyId,
        name: formData.companyName,
        email: formData.companyEmail,
        phone: formData.companyPhone,
        address: formData.companyAddress,
        vatRegistrationNumber: formData.vatRegistrationNumber,
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'companies', companyId), company);

      // Create admin user account (only admins can register initially)
      await signUp(
        formData.email,
        formData.password,
        formData.displayName,
        companyId,
        'admin'
      );

      navigate('/dashboard');
    } catch (error) {
      setError('Error creating account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-[#181f2a] dark:to-[#232b3b] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Building2 className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create Your Company Account
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Set up your company and start invoicing
            </p>
          </div>

          {/* Info box about seller accounts */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                  Admin Account Registration
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  This registration creates an admin account. Your email must be pre-authorized in the system.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                placeholder="Enter your full name"
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                onBlur={handleEmailBlur}
                placeholder="Enter your email"
                required
                error={emailError}
              />
            </div>

            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="Enter your password"
              required
            />

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Company Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Company Name"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  placeholder="Enter company name"
                  required
                />
                <Input
                  label="Company Email"
                  type="email"
                  value={formData.companyEmail}
                  onChange={(e) => setFormData({...formData, companyEmail: e.target.value})}
                  placeholder="Enter company email"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input
                  label="Company Phone"
                  value={formData.companyPhone}
                  onChange={(e) => setFormData({...formData, companyPhone: e.target.value})}
                  placeholder="Enter company phone"
                  required
                />
                <Input
                  label="VAT Registration Number"
                  value={formData.vatRegistrationNumber}
                  onChange={(e) => setFormData({...formData, vatRegistrationNumber: e.target.value})}
                  placeholder="Enter VAT number (optional)"
                />
              </div>

              <div className="mt-4">
                <Input
                  label="Company Address"
                  value={formData.companyAddress}
                  onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
                  placeholder="Enter company address"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={!!emailError}
            >
              Create Company Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};