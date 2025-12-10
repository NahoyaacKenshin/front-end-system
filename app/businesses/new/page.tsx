'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/contexts/AuthContext';
import { api } from '../../../src/services/api';
import { CATEGORY_LIST } from '../../../src/constants/categories';
import { BARANGAYS } from '../../../src/constants/barangays';
import Navbar from '../../../src/components/Layout/Navbar';
import SuccessModal from '../../../src/components/SuccessModal';
import { fileToBase64 } from '../../../src/utils/imageOptimization';

type ContactType = 'email' | 'phone';

interface ContactInfo {
  type: ContactType;
  value: string;
}

export default function AddBusinessPage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    businessId: number;
    isFirstBusiness: boolean;
  } | null>(null);

  // Form state - only basic fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    barangay: '',
    location: '',
    contactInfo: [] as ContactInfo[],
  });
  const [verificationDocument, setVerificationDocument] = useState<File | null>(null);
  const [verificationDocumentPreview, setVerificationDocumentPreview] = useState<string>('');

  // Redirect if not authenticated
  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (isLoading) {
      return;
    }

    if (!user) {
      router.push('/login');
    } else if (user.role === 'ADMIN') {
      router.push('/admin');
    }
  }, [user, isLoading, router]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (verificationDocumentPreview) {
        URL.revokeObjectURL(verificationDocumentPreview);
      }
    };
  }, [verificationDocumentPreview]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Contact Info handlers
  const addContactInfo = () => {
    setFormData(prev => ({
      ...prev,
      contactInfo: [...prev.contactInfo, { type: 'email', value: '' }]
    }));
  };

  const removeContactInfo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: prev.contactInfo.filter((_, i) => i !== index)
    }));
  };

  const updateContactInfo = (index: number, field: 'type' | 'value', value: string) => {
    setFormData(prev => {
      const newContactInfo = [...prev.contactInfo];
      newContactInfo[index] = { ...newContactInfo[index], [field]: value };
      return {
        ...prev,
        contactInfo: newContactInfo
      };
    });
  };

  // Verification document handlers
  const handleVerificationDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Verification document must be less than 10MB');
        return;
      }
      setVerificationDocument(file);
      setVerificationDocumentPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const removeVerificationDocument = () => {
    setVerificationDocument(null);
    if (verificationDocumentPreview) {
      URL.revokeObjectURL(verificationDocumentPreview);
    }
    setVerificationDocumentPreview('');
  };


  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Business name is required');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return false;
    }
    if (!formData.category) {
      setError('Category is required');
      return false;
    }
    if (!formData.barangay) {
      setError('Barangay is required');
      return false;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }
    if (!verificationDocument) {
      setError('Verification document is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Format contact info
      const contactInfoObj: any = {};
      formData.contactInfo.forEach(contact => {
        if (contact.value.trim()) {
          if (contact.type === 'email') {
            contactInfoObj.email = contact.value.trim();
          } else {
            contactInfoObj.phone = contact.value.trim();
          }
        }
      });

      // Convert verification document to base64 (required)
      if (!verificationDocument) {
        setError('Verification document is required');
        setLoading(false);
        return;
      }
      const verificationDocumentUrl = await fileToBase64(verificationDocument);

      const businessData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        barangay: formData.barangay,
        location: formData.location.trim(),
        contactInfo: Object.keys(contactInfoObj).length > 0 ? contactInfoObj : undefined,
        verificationDocumentUrl,
      };

      const response = await api.createBusiness(businessData);

      if (response.success) {
        const businessId = response.data.id;
        // isFirstBusiness is at the root level of the response, not in data
        const isFirstBusiness = (response as any).isFirstBusiness || false;
        
        // Store business ID for redirect after relog (if customer)
        if (isFirstBusiness && user?.role === 'CUSTOMER') {
          localStorage.setItem('pendingBusinessRedirect', businessId.toString());
          localStorage.setItem('pendingBusinessEditMode', 'true');
        }

        // Show success modal
        setSuccessData({
          businessId,
          isFirstBusiness: isFirstBusiness && user?.role === 'CUSTOMER'
        });
        setShowSuccessModal(true);
      } else {
        setError(response.message || 'Failed to create business');
      }
    } catch (err: any) {
      console.error('Error creating business:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role === 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-24 sm:pt-28 pb-6 sm:pb-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Add New Business</h1>
          <p className="text-white/60">Fill in the basic information to register your business. You can add more details later by editing your business page.</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Success Modal */}
        <SuccessModal
          isOpen={showSuccessModal}
          title={successData?.isFirstBusiness ? "Business Created Successfully!" : "Success!"}
          message={
            successData?.isFirstBusiness
              ? "Your business has been created! Since this is your first business, your account has been upgraded to Vendor. Please log in again to apply the changes, then you'll be redirected to your business page in edit mode."
              : "Your business has been created successfully!"
          }
          showCloseButton={!successData?.isFirstBusiness}
          onClose={() => {
            if (successData?.isFirstBusiness) {
              // For first business, don't allow closing - force relog
              return;
            }
            setShowSuccessModal(false);
            router.push(`/business/${successData?.businessId}`);
          }}
        >
          {successData?.isFirstBusiness ? (
            <div className="space-y-4">
              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#6ab8d8]/20">
                <p className="text-sm text-white/80 mb-3">
                  <strong className="text-[#6ab8d8]">Note:</strong> Your account role has been upgraded from Customer to Vendor. You need to log in again for the changes to take effect.
                </p>
              </div>
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#6ab8d8] to-[#5aa8c8] text-white rounded-lg font-medium hover:from-[#5aa8c8] hover:to-[#4a98b8] transition-all"
              >
                Log Out & Go to Login
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/business-owner-dashboard');
                }}
                className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-white/10 text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push(`/business/${successData?.businessId}`);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#6ab8d8] to-[#5aa8c8] text-white rounded-lg font-medium hover:from-[#5aa8c8] hover:to-[#4a98b8] transition-all"
              >
                View Business
              </button>
            </div>
          )}
        </SuccessModal>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-2">
                  Business Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors"
                  placeholder="Enter business name"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors resize-none"
                  placeholder="Describe your business..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-white/80 mb-2">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ab8d8] transition-colors"
                  >
                    <option value="">Select category</option>
                    {CATEGORY_LIST.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="barangay" className="block text-sm font-medium text-white/80 mb-2">
                    Barangay <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="barangay"
                    name="barangay"
                    value={formData.barangay}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ab8d8] transition-colors"
                  >
                    <option value="">Select barangay</option>
                    {BARANGAYS.map(barangay => (
                      <option key={barangay} value={barangay}>{barangay}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-white/80 mb-2">
                  Location/Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors"
                  placeholder="Enter full address"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Contact Information</h2>
              <button
                type="button"
                onClick={addContactInfo}
                className="px-3 py-1 bg-[#6ab8d8]/10 text-[#6ab8d8] rounded-lg text-sm hover:bg-[#6ab8d8]/20 transition-colors"
              >
                + Add Contact
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.contactInfo.length === 0 ? (
                <p className="text-white/60 text-sm">No contact information added. Click "Add Contact" to add email or phone.</p>
              ) : (
                formData.contactInfo.map((contact, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                    <select
                      value={contact.type}
                      onChange={(e) => updateContactInfo(index, 'type', e.target.value)}
                      className="w-full sm:w-auto sm:min-w-[120px] px-3 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ab8d8] transition-colors"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                    </select>
                    <input
                      type={contact.type === 'email' ? 'email' : 'tel'}
                      value={contact.value}
                      onChange={(e) => updateContactInfo(index, 'value', e.target.value)}
                      placeholder={contact.type === 'email' ? 'email@example.com' : '+63 123 456 7890'}
                      className="flex-1 min-w-0 px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeContactInfo(index)}
                      className="w-full sm:w-auto sm:flex-shrink-0 px-4 py-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors whitespace-nowrap"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Verification Document */}
          <div className="bg-[#2a2a2a] rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-4">
              Verification Document <span className="text-red-400">*</span>
            </h2>
            <p className="text-white/60 text-sm mb-4">
              Upload a verification document to get your business verified. This can be a business permit, license, or any official document proving your business legitimacy.
            </p>
            
            {verificationDocumentPreview ? (
              <div className="space-y-3">
                {verificationDocument?.type.startsWith('image/') ? (
                  <img
                    src={verificationDocumentPreview}
                    alt="Document preview"
                    className="max-w-full h-48 object-contain rounded-lg border border-white/10 bg-[#1a1a1a]"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-48 border border-white/10 rounded-lg bg-[#1a1a1a]">
                    <svg className="w-16 h-16 text-white/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-white/60">{verificationDocument?.name}</p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={removeVerificationDocument}
                  className="w-full px-4 py-2 bg-red-500/10 text-red-400 rounded-lg font-medium hover:bg-red-500/20 transition-colors"
                >
                  Remove Document
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-[#6ab8d8] transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-10 h-10 mb-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-white/60">Click to upload verification document</p>
                  <p className="text-xs text-white/40">PDF, PNG, JPG up to 10MB</p>
                </div>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,image/*"
                  onChange={handleVerificationDocumentChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Info Note */}
          <div className="bg-[#2a2a2a]/50 rounded-xl p-4 border border-[#6ab8d8]/20">
            <p className="text-sm text-white/70">
              <strong className="text-[#6ab8d8]">Note:</strong> You can add photos, logo, gallery, store hours, and social media links later by editing your business page. A verification document is required to create a business.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-[#2a2a2a] border border-white/10 text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#6ab8d8] to-[#5aa8c8] text-white rounded-lg font-medium hover:from-[#5aa8c8] hover:to-[#4a98b8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                  Creating...
                </span>
              ) : (
                'Create Business'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
