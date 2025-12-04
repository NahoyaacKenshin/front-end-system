'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import type { Business, Discussion } from '../../src/types';

interface Stat {
  id: number;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
}

interface StatusItem {
  id: number;
  label: string;
  status: string;
  statusColor: string;
  icon: React.ReactNode;
}

export default function DashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stat[]>([]);
  const [recentDiscussions, setRecentDiscussions] = useState<Discussion[]>([]);
  const [deletingBusiness, setDeletingBusiness] = useState<number | null>(null);
  const router = useRouter();
  const { user, logout } = useAuth();
  
  // Get user's name from auth context, fallback to 'User' if not available
  const userName = user?.name || 'User';

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Load user's businesses
        const businessesResponse = await api.getMyBusinesses();
        const userBusinesses = businessesResponse.data?.businesses || [];
        setBusinesses(userBusinesses);

        // Calculate statistics
        let totalFavorites = 0;
        let totalDiscussions = 0;
        let verifiedCount = 0;
        let pendingCount = 0;

        // Fetch favorite counts and discussions for each business
        const businessStatsPromises = userBusinesses.map(async (business: Business) => {
          try {
            const [favoriteResponse, discussionsResponse] = await Promise.all([
              api.getBusinessFavoriteCount(business.id),
              api.getBusinessDiscussions(business.id)
            ]);
            
            const favoriteCount = favoriteResponse.data?.count || 0;
            const discussions = discussionsResponse.data || [];
            
            totalFavorites += favoriteCount;
            totalDiscussions += Array.isArray(discussions) ? discussions.length : 0;
            
            if (business.isVerified) {
              verifiedCount++;
            } else {
              pendingCount++;
            }
          } catch (error) {
            console.error(`Error loading stats for business ${business.id}:`, error);
          }
        });

        await Promise.all(businessStatsPromises);

        // Get recent discussions across all businesses
        const allDiscussions: Discussion[] = [];
        for (const business of userBusinesses) {
          try {
            const discussionsResponse = await api.getBusinessDiscussions(business.id);
            const discussions = discussionsResponse.data || [];
            if (Array.isArray(discussions)) {
              discussions.forEach((disc: Discussion) => {
                allDiscussions.push({ ...disc, business });
              });
            }
          } catch (error) {
            console.error(`Error loading discussions for business ${business.id}:`, error);
          }
        }
        
        // Sort by date and get most recent 5
        const sortedDiscussions = allDiscussions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5);
        setRecentDiscussions(sortedDiscussions);

        // Update stats
        setStats([
          {
            id: 1,
            title: 'My Businesses',
            value: userBusinesses.length,
            icon: (
              <svg viewBox="0 0 24 24" width="40" height="40" fill="#6ab8d8">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
              </svg>
            )
          },
          {
            id: 2,
            title: 'Total Favorites',
            value: totalFavorites,
            icon: (
              <svg viewBox="0 0 24 24" width="40" height="40" fill="#6ab8d8">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            )
          },
          {
            id: 3,
            title: 'Total Discussions',
            value: totalDiscussions,
            icon: (
              <svg viewBox="0 0 24 24" width="40" height="40" fill="#6ab8d8">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              </svg>
            )
          }
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // Format date helper
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const handleViewBusiness = (businessId: number) => {
    router.push(`/business/${businessId}?mode=view`);
  };

  const handleEditBusiness = (businessId: number) => {
    router.push(`/business/${businessId}`);
  };

  const handleDeleteBusiness = async (businessId: number) => {
    const business = businesses.find(b => b.id === businessId);
    const businessName = business?.name || 'this business';
    
    if (!confirm(`Are you sure you want to delete "${businessName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingBusiness(businessId);
      
      const response = await api.deleteBusiness(businessId);
      
      if (response.success) {
        // Remove the business from the list
        setBusinesses(prev => prev.filter(b => b.id !== businessId));
        
        // Reload dashboard data to update stats
        const businessesResponse = await api.getMyBusinesses();
        const userBusinesses = businessesResponse.data?.businesses || [];
        setBusinesses(userBusinesses);

        // Recalculate stats
        let totalFavorites = 0;
        let totalDiscussions = 0;

        const businessStatsPromises = userBusinesses.map(async (business: Business) => {
          try {
            const [favoriteResponse, discussionsResponse] = await Promise.all([
              api.getBusinessFavoriteCount(business.id),
              api.getBusinessDiscussions(business.id)
            ]);
            
            const favoriteCount = favoriteResponse.data?.count || 0;
            const discussions = discussionsResponse.data || [];
            
            totalFavorites += favoriteCount;
            totalDiscussions += Array.isArray(discussions) ? discussions.length : 0;
          } catch (error) {
            console.error(`Error loading stats for business ${business.id}:`, error);
          }
        });

        await Promise.all(businessStatsPromises);

        // Update stats
        setStats([
          {
            id: 1,
            title: 'My Businesses',
            value: userBusinesses.length,
            icon: (
              <svg viewBox="0 0 24 24" width="40" height="40" fill="#6ab8d8">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
              </svg>
            )
          },
          {
            id: 2,
            title: 'Total Favorites',
            value: totalFavorites,
            icon: (
              <svg viewBox="0 0 24 24" width="40" height="40" fill="#6ab8d8">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            )
          },
          {
            id: 3,
            title: 'Total Discussions',
            value: totalDiscussions,
            icon: (
              <svg viewBox="0 0 24 24" width="40" height="40" fill="#6ab8d8">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
              </svg>
            )
          }
        ]);

        // Reload recent discussions
        const allDiscussions: Discussion[] = [];
        for (const business of userBusinesses) {
          try {
            const discussionsResponse = await api.getBusinessDiscussions(business.id);
            const discussions = discussionsResponse.data || [];
            if (Array.isArray(discussions)) {
              discussions.forEach((disc: Discussion) => {
                allDiscussions.push({ ...disc, business });
              });
            }
          } catch (error) {
            console.error(`Error loading discussions for business ${business.id}:`, error);
          }
        }
        
        const sortedDiscussions = allDiscussions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5);
        setRecentDiscussions(sortedDiscussions);

        alert('Business deleted successfully');
      } else {
        alert(response.message || 'Failed to delete business');
      }
    } catch (err: any) {
      console.error('Error deleting business:', err);
      alert(err.response?.data?.message || err.message || 'Failed to delete business');
    } finally {
      setDeletingBusiness(null);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleHome = () => {
    router.push('/home');
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <nav className="flex justify-between items-center px-4 sm:px-6 md:px-14 py-3 bg-[#2a2a2a] border-b border-white/10 sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 flex items-center justify-center rounded-[10px] bg-[#6ab8d8]/10">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="#6ab8d8">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white m-0 ml-3">Business Owner Dashboard</h3>
        </div>
        <div className="flex items-center gap-5.5">
          <button className="bg-transparent border-none cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors text-white/80 hover:bg-white/10 hover:text-white" onClick={handleHome} title="Home">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </button>
          <button 
            className="bg-transparent border-none cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors text-white/80 hover:bg-white/10 hover:text-white" 
            onClick={handleLogout} 
            title="Logout"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Welcome Back, {userName}</h1>
          <p className="text-white/60 text-lg">Manage your business, track performance, and connect with customers</p>
        </div>

        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-[#2a2a2a] rounded-xl p-6 border border-white/10 relative animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-24 mb-4"></div>
                  <div className="h-8 bg-white/10 rounded w-16"></div>
                </div>
              ))
            ) : (
              stats.map((s) => (
                <div key={s.id} className="bg-[#2a2a2a] rounded-xl p-6 border border-white/10 relative hover:border-[#6ab8d8]/50 transition-all">
                  <div className="text-sm font-medium text-white/60 mb-2">{s.title}</div>
                  <div className="absolute top-6 right-6 text-white/40">{s.icon}</div>
                  <div className="text-3xl font-bold text-white mt-4">{s.value}</div>
                </div>
              ))
            )}
          </div>

          {/* My Businesses Section */}
          <div className="bg-[#2a2a2a] rounded-xl p-4 sm:p-6 border border-white/10 overflow-x-hidden">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
              <div className="text-lg sm:text-xl font-bold text-white">My Businesses</div>
              <button
                onClick={() => router.push('/businesses/new')}
                className="px-4 py-2 bg-gradient-to-r from-[#6ab8d8] to-[#4a9bc7] hover:from-[#5aa8c8] hover:to-[#3a8bb7] text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm sm:text-base w-full sm:w-auto"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Add Business
              </button>
            </div>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6ab8d8] mx-auto"></div>
                <p className="text-white/60 mt-4">Loading businesses...</p>
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-12">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" className="text-white/40 mx-auto mb-4">
                  <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                </svg>
                <p className="text-white/60 mb-4">You don't have any businesses yet</p>
                <button
                  onClick={() => router.push('/businesses/new')}
                  className="px-6 py-2 bg-gradient-to-r from-[#6ab8d8] to-[#4a9bc7] hover:from-[#5aa8c8] hover:to-[#3a8bb7] text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
                >
                  Create Your First Business
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {businesses.map((business) => (
                  <div key={business.id} className="border border-white/10 rounded-lg p-4 sm:p-5 hover:border-[#6ab8d8]/50 transition-colors bg-[#1a1a1a]">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-white break-words">{business.name}</h3>
                          {business.isVerified && (
                            <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-semibold flex items-center gap-1 border border-green-500/20 whitespace-nowrap">
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                              Verified
                            </span>
                          )}
                          {!business.isVerified && (
                            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs font-semibold border border-yellow-500/20 whitespace-nowrap">
                              Pending Verification
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-white/80 mb-2 break-words">{business.category} • {business.barangay}</p>
                        <p className="text-xs sm:text-sm text-white/60 line-clamp-2 break-words">{business.description}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:ml-4 sm:flex-nowrap">
                        <button
                          onClick={() => handleViewBusiness(business.id)}
                          className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm bg-[#6ab8d8]/20 hover:bg-[#6ab8d8]/30 text-[#6ab8d8] rounded-lg transition-colors whitespace-nowrap"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditBusiness(business.id)}
                          className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors whitespace-nowrap"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteBusiness(business.id)}
                          disabled={deletingBusiness === business.id}
                          className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap"
                          title="Delete business"
                        >
                          {deletingBusiness === business.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                              <span className="hidden sm:inline">Deleting...</span>
                            </>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                              </svg>
                              <span className="hidden sm:inline">Delete</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Discussions Section */}
          {recentDiscussions.length > 0 && (
            <div className="bg-[#2a2a2a] rounded-xl p-6 border border-white/10">
              <div className="text-xl font-bold text-white mb-6">Recent Discussions</div>
              <div className="space-y-4">
                {recentDiscussions.map((discussion) => (
                  <div key={discussion.id} className="border-l-4 border-[#6ab8d8] pl-4 py-2">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{discussion.user.name}</span>
                        <span className="text-sm text-white/60">on</span>
                        <span className="font-medium text-[#6ab8d8]">{discussion.business?.name || 'Business'}</span>
                      </div>
                      <span className="text-sm text-white/60">{formatDate(discussion.createdAt)}</span>
                    </div>
                    <p className="text-white/80 text-sm line-clamp-2">{discussion.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
