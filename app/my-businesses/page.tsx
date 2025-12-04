'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import type { Business } from '../../src/types';
import Navbar from '../../src/components/Layout/Navbar';

interface VerificationStatus {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  verifiedAt: string | null;
  createdAt: string;
}

interface BusinessWithVerification extends Business {
  verificationStatus?: VerificationStatus | null;
  canApplyForVerification?: boolean;
  cooldownHoursRemaining?: number;
}

export default function MyBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessWithVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingBusiness, setDeletingBusiness] = useState<number | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const loadBusinesses = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getMyBusinesses();
        
        if (response.success && response.data) {
          const businessesList = response.data.businesses || [];
          
          // Fetch verification status for each business
          const businessesWithVerification = await Promise.all(
            businessesList.map(async (business: Business) => {
              try {
                const verificationResponse = await api.getVerificationStatus(business.id);
                const verificationStatus = verificationResponse.success ? verificationResponse.data : null;
                
                // Calculate cooldown if rejected
                let canApplyForVerification = true;
                let cooldownHoursRemaining = 0;
                
                if (verificationStatus && verificationStatus.status === 'REJECTED' && verificationStatus.verifiedAt) {
                  const rejectionTime = new Date(verificationStatus.verifiedAt).getTime();
                  const now = new Date().getTime();
                  const hoursSinceRejection = (now - rejectionTime) / (1000 * 60 * 60);
                  
                  if (hoursSinceRejection < 24) {
                    canApplyForVerification = false;
                    cooldownHoursRemaining = Math.ceil(24 - hoursSinceRejection);
                  }
                }
                
                return {
                  ...business,
                  verificationStatus,
                  canApplyForVerification,
                  cooldownHoursRemaining,
                };
              } catch (err) {
                // If verification fetch fails, assume no verification exists
                return {
                  ...business,
                  verificationStatus: null,
                  canApplyForVerification: true,
                  cooldownHoursRemaining: 0,
                };
              }
            })
          );
          
          setBusinesses(businessesWithVerification);
        } else {
          setError(response.message || 'Failed to load businesses');
        }
      } catch (err: any) {
        console.error('Error loading businesses:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load businesses');
      } finally {
        setLoading(false);
      }
    };

    loadBusinesses();
  }, [user, router]);

  const handleViewBusiness = (id: number) => {
    router.push(`/business/${id}?mode=view`);
  };

  const handleEditBusiness = (id: number) => {
    router.push(`/business/${id}`);
    };

  const handleDeleteBusiness = async (businessId: number) => {
    const business = businesses.find(b => b.id === businessId);
    const businessName = business?.name || 'this business';
    
    if (!confirm(`Are you sure you want to delete "${businessName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingBusiness(businessId);
      setError(null);
      
      const response = await api.deleteBusiness(businessId);
      
      if (response.success) {
        // Remove the business from the list
        setBusinesses(prev => prev.filter(b => b.id !== businessId));
        alert('Business deleted successfully');
      } else {
        setError(response.message || 'Failed to delete business');
      }
    } catch (err: any) {
      console.error('Error deleting business:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete business');
    } finally {
      setDeletingBusiness(null);
    }
  };


  if (!user || (user.role !== 'VENDOR' && user.role !== 'ADMIN')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-24 sm:pt-28 pb-6 sm:pb-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Businesses</h1>
          <p className="text-white/60">Manage and view all your businesses</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#2a2a2a] rounded-xl p-6 border border-white/10 animate-pulse">
                <div className="h-48 bg-white/10 rounded-lg mb-4"></div>
                <div className="h-6 bg-white/10 rounded mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="bg-[#2a2a2a] rounded-xl p-12 border border-white/10 text-center">
            <svg 
              className="w-16 h-16 mx-auto mb-4 text-white/40" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No businesses yet</h3>
            <p className="text-white/60 mb-6">Get started by adding your first business</p>
            <button
              onClick={() => router.push('/businesses/new')}
              className="px-6 py-3 bg-gradient-to-r from-[#6ab8d8] to-[#4a9bc7] text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              Add Your First Business
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {businesses.map((business) => (
              <div
                key={business.id}
                className="bg-[#2a2a2a] rounded-xl overflow-hidden border border-white/10 hover:border-[#6ab8d8]/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                {/* Cover Photo */}
                <div className="relative h-[280px] bg-gradient-to-br from-[#1e3c72] to-[#2a5298]">
                  {business.coverPhoto ? (
                    <img
                      src={business.coverPhoto}
                      alt={business.name}
                      className="w-full h-full object-cover"
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-white/40 text-4xl font-bold">
                        {business.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Verification Badge */}
                  {business.isVerified && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-green-500/90 backdrop-blur-sm text-white rounded-full text-xs font-semibold flex items-center gap-1">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                      Verified
                    </div>
                  )}
                  {!business.isVerified && business.verificationStatus?.status === 'PENDING' && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-500/90 backdrop-blur-sm text-white rounded-full text-xs font-semibold">
                      Pending
                    </div>
                  )}
                  {!business.isVerified && business.verificationStatus?.status === 'REJECTED' && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/90 backdrop-blur-sm text-white rounded-full text-xs font-semibold flex items-center gap-1">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      Rejected
                    </div>
                  )}
                  {!business.isVerified && !business.verificationStatus && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-gray-500/90 backdrop-blur-sm text-white rounded-full text-xs font-semibold">
                      Unverified
                    </div>
                  )}
                </div>

                {/* Business Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{business.name}</h3>
                  
                  <div className="flex items-center gap-2 text-sm text-white/80 mb-4">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span>{business.barangay}</span>
                    <span>•</span>
                    <span>{business.category}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewBusiness(business.id)}
                        className="flex-1 px-4 py-2 bg-[#6ab8d8]/20 text-[#6ab8d8] rounded-lg font-medium hover:bg-[#6ab8d8]/30 transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditBusiness(business.id)}
                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBusiness(business.id)}
                        disabled={deletingBusiness === business.id}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        title="Delete business"
                      >
                        {deletingBusiness === business.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                            <span className="text-xs">Deleting...</span>
                          </>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                            <span className="text-xs">Delete</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

