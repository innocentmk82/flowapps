import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { Camera, Save } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../ui/Toast';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Company } from '../../types';
import { convertFirestoreTimestampToDate } from '../../lib/utils';
import { companyService } from '../../lib/dataService';

export const CompanySettings: React.FC = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeSignature, setRemoveSignature] = useState(false);
  const [removeStamp, setRemoveStamp] = useState(false);
  const { userProfile } = useAuth();
  const { primaryColor, secondaryColor, setPrimaryColor, setSecondaryColor } = useTheme();
  const { addToast } = useToast();

  useEffect(() => {
    const fetchCompany = async () => {
      if (!userProfile?.companyId) return;
      try {
        const companyData = await companyService.getCompany(userProfile.companyId);
        if (companyData) {
          setCompany(companyData);
          setPrimaryColor(companyData.primaryColor || '#3B82F6');
          setSecondaryColor(companyData.secondaryColor || '#10B981');
        }
      } catch (error) {
        console.error('Error fetching company:', error);
      }
    };
    fetchCompany();
  }, [userProfile?.companyId]);

  const handleSave = async () => {
    if (!company || !userProfile?.companyId) return;

    setIsLoading(true);
    try {
      let logoUrl = company.logo;
      let signatureUrl = company.digitalSignature;
      let stampUrl = company.digitalStamp;

      // Process all files simultaneously
      const processFile = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              resolve(e.target.result as string);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      };

      // Process all files that have been selected
      const promises: Promise<void>[] = [];
      
      if (logoFile) {
        promises.push(
          processFile(logoFile).then(url => {
            logoUrl = url;
          })
        );
      }
      
      if (signatureFile) {
        promises.push(
          processFile(signatureFile).then(url => {
            signatureUrl = url;
          })
        );
      }
      
      if (stampFile) {
        promises.push(
          processFile(stampFile).then(url => {
            stampUrl = url;
          })
        );
      }

      // Wait for all files to be processed
      if (promises.length > 0) {
        await Promise.all(promises);
      }

      // Save all changes
      await processFiles(logoUrl, signatureUrl, stampUrl);
    } catch (error) {
      console.error('Error updating company:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update company settings.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processFiles = async (logoUrl?: string, signatureUrl?: string, stampUrl?: string) => {
    if (!company || !userProfile?.companyId) return;
    try {
      const updateData: any = {
        ...company,
        primaryColor,
        secondaryColor,
        updatedAt: new Date()
      };
      // Handle logo
      if (removeLogo) {
        updateData.logo = undefined;
      } else if (logoUrl !== undefined) {
        updateData.logo = logoUrl;
      }
      // Handle digital signature
      if (removeSignature) {
        updateData.digitalSignature = undefined;
      } else if (signatureUrl !== undefined) {
        updateData.digitalSignature = signatureUrl;
      }
      // Handle digital stamp
      if (removeStamp) {
        updateData.digitalStamp = undefined;
      } else if (stampUrl !== undefined) {
        updateData.digitalStamp = stampUrl;
      }
      await companyService.updateCompany(userProfile.companyId, updateData, userProfile.uid || '');
      // Update local state
      const updatedCompany = {
        ...company,
        logo: removeLogo ? undefined : (logoUrl !== undefined ? logoUrl : company.logo),
        digitalSignature: removeSignature ? undefined : (signatureUrl !== undefined ? signatureUrl : company.digitalSignature),
        digitalStamp: removeStamp ? undefined : (stampUrl !== undefined ? stampUrl : company.digitalStamp),
        primaryColor,
        secondaryColor,
        updatedAt: new Date()
      };
      setCompany(updatedCompany);
      setLogoFile(null);
      setSignatureFile(null);
      setStampFile(null);
      setRemoveLogo(false);
      setRemoveSignature(false);
      setRemoveStamp(false);
      // Clear file input fields
      const logoInput = document.getElementById('logo-upload') as HTMLInputElement;
      const signatureInput = document.getElementById('signature-upload') as HTMLInputElement;
      const stampInput = document.getElementById('stamp-upload') as HTMLInputElement;
      if (logoInput) logoInput.value = '';
      if (signatureInput) signatureInput.value = '';
      if (stampInput) stampInput.value = '';
      addToast({
        type: 'success',
        title: 'Settings Updated',
        message: 'Company settings have been updated successfully.'
      });
    } catch (error) {
      throw error;
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateImageFile(file)) {
        setLogoFile(file);
      }
    }
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateImageFile(file)) {
        setSignatureFile(file);
      }
    }
  };

  const handleStampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateImageFile(file)) {
        setStampFile(file);
      }
    }
  };

  const validateImageFile = (file: File): boolean => {
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Please select an image smaller than 2MB.'
      });
      return false;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid File Type',
        message: 'Please select a valid image file (PNG, JPG, etc.).'
      });
      return false;
    }

    return true;
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Company Settings</h1>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Company Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Input
              label="Company Name"
              value={company.name}
              onChange={(e) => setCompany({...company, name: e.target.value})}
            />
          </div>
          <div>
            <Input
              label="VAT Registration Number"
              value={company.vatRegistrationNumber || ''}
              onChange={e => setCompany({ ...company, vatRegistrationNumber: e.target.value })}
              placeholder="Enter VAT registration number"
            />
          </div>
          
          <div>
            <Input
              label="Email"
              type="email"
              value={company.email}
              onChange={(e) => setCompany({...company, email: e.target.value})}
            />
          </div>
          
          <div>
            <Input
              label="Phone"
              value={company.phone}
              onChange={(e) => setCompany({...company, phone: e.target.value})}
            />
          </div>
          
          <div>
            <Input
              label="Website"
              value={company.website || ''}
              onChange={(e) => setCompany({...company, website: e.target.value})}
            />
          </div>
          
          <div className="md:col-span-2">
            <Input
              label="Address"
              value={company.address}
              onChange={(e) => setCompany({...company, address: e.target.value})}
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Branding
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Logo
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                {company.logo ? (
                  <img src={company.logo} alt="Company Logo" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block"
                >
                  Upload Logo
                </label>
                {logoFile && (
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ {logoFile.name} (ready to save)
                  </div>
                )}
                {company.logo && !logoFile && (
                  <button
                    type="button"
                    onClick={() => setRemoveLogo(true)}
                    className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Remove Logo
                  </button>
                )}
                {removeLogo && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    Logo will be removed on save
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Digital Signature
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                {company.digitalSignature ? (
                  <img src={company.digitalSignature} alt="Digital Signature" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-1 border-2 border-gray-400 rounded"></div>
                    <span className="text-xs text-gray-400">Signature</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureChange}
                  className="hidden"
                  id="signature-upload"
                />
                <label
                  htmlFor="signature-upload"
                  className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors inline-block"
                >
                  Upload Signature
                </label>
                {signatureFile && (
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ {signatureFile.name} (ready to save)
                  </div>
                )}
                {company.digitalSignature && !signatureFile && (
                  <button
                    type="button"
                    onClick={() => setRemoveSignature(true)}
                    className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Remove Signature
                  </button>
                )}
                {removeSignature && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    Signature will be removed on save
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload a transparent PNG signature image (recommended: 200x80px)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Digital Stamp
            </label>
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                {company.digitalStamp ? (
                  <img src={company.digitalStamp} alt="Digital Stamp" className="w-full h-full object-contain rounded-lg" />
                ) : (
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-1 border-2 border-gray-400 rounded-full"></div>
                    <span className="text-xs text-gray-400">Stamp</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleStampChange}
                  className="hidden"
                  id="stamp-upload"
                />
                <label
                  htmlFor="stamp-upload"
                  className="cursor-pointer bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-block"
                >
                  Upload Stamp
                </label>
                {stampFile && (
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ {stampFile.name} (ready to save)
                  </div>
                )}
                {company.digitalStamp && !stampFile && (
                  <button
                    type="button"
                    onClick={() => setRemoveStamp(true)}
                    className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    Remove Stamp
                  </button>
                )}
                {removeStamp && (
                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                    Stamp will be removed on save
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload a transparent PNG stamp image (recommended: 100x100px)
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Digital Signature & Stamp Tips</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>Digital Signature:</strong> Use a transparent PNG of your handwritten signature or company signature</li>
              <li>• <strong>Digital Stamp:</strong> Use a transparent PNG of your company stamp, logo, or seal</li>
              <li>• <strong>Format:</strong> PNG with transparent background works best</li>
              <li>• <strong>Size:</strong> Keep files under 2MB for optimal performance</li>
              <li>• <strong>Usage:</strong> These will automatically appear on all generated PDFs (invoices, receipts, quotations)</li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Primary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Secondary Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          isLoading={isLoading}
          disabled={!logoFile && !signatureFile && !stampFile && !removeLogo && !removeSignature && !removeStamp && !company.name && !company.email && !company.phone && !company.address}
        >
          <Save className="w-4 h-4 mr-2" />
          {logoFile || signatureFile || stampFile || removeLogo || removeSignature || removeStamp ? 'Save Changes & Update Files' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};