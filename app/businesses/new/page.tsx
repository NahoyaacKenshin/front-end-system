'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/contexts/AuthContext';
import { api } from '../../../src/services/api';
import { CATEGORY_LIST } from '../../../src/constants/categories';
import { BARANGAYS } from '../../../src/constants/barangays';
import Navbar from '../../../src/components/Layout/Navbar';

type ContactType = 'email' | 'phone';

interface ContactInfo {
  type: ContactType;
  value: string;
}

export default function AddBusinessPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - only basic fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    barangay: '',
    location: '',
    contactInfo: [] as ContactInfo[],
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (user.role === 'ADMIN') {
      router.push('/admin');
    }
  }, [user, router]);

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

      const businessData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        barangay: formData.barangay,
        location: formData.location.trim(),
        contactInfo: Object.keys(contactInfoObj).length > 0 ? contactInfoObj : undefined,
      };

      const response = await api.createBusiness(businessData);

      if (response.success) {
        // Redirect to the new business page
        router.push(`/business/${response.data.id}`);
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
                  <div key={index} className="flex gap-2 items-start">
                    <select
                      value={contact.type}
                      onChange={(e) => updateContactInfo(index, 'type', e.target.value)}
                      className="px-3 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#6ab8d8] transition-colors"
                    >
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                    </select>
                    <input
                      type={contact.type === 'email' ? 'email' : 'tel'}
                      value={contact.value}
                      onChange={(e) => updateContactInfo(index, 'value', e.target.value)}
                      placeholder={contact.type === 'email' ? 'email@example.com' : '+63 123 456 7890'}
                      className="flex-1 px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#6ab8d8] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => removeContactInfo(index)}
                      className="px-4 py-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-[#2a2a2a]/50 rounded-xl p-4 border border-[#6ab8d8]/20">
            <p className="text-sm text-white/70">
              <strong className="text-[#6ab8d8]">Note:</strong> You can add photos, logo, gallery, store hours, social media links, and verification documents later by editing your business page.
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
