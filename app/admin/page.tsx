'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

type Tab = 'dashboard' | 'users' | 'businesses' | 'verifications';

interface DashboardStats {
  users: {
    total: number;
    vendors: number;
    customers: number;
    admins: number;
  };
  businesses: {
    total: number;
    verified: number;
    pending: number;
  };
  discussions: {
    total: number;
  };
  favorites: {
    total: number;
  };
  verifications: {
    pending: number;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  emailVerified: Date | null;
  createdAt: Date;
  _count?: {
    businesses: number;
  };
}

interface Business {
  id: number;
  name: string;
  description: string;
  category: string;
  barangay: string;
  isVerified: boolean;
  createdAt: Date;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Verification {
  id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  businessId: number;
  documentUrl: string;
  business: {
    id: number;
    name: string;
    owner: {
      name: string | null;
      email: string | null;
    };
  } | null;
  createdAt: Date;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, logout, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState<string>('all');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Businesses
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessesPage, setBusinessesPage] = useState(1);
  const [businessesTotalPages, setBusinessesTotalPages] = useState(1);
  const [businessesSearch, setBusinessesSearch] = useState('');
  const [businessesVerifiedFilter, setBusinessesVerifiedFilter] = useState<string>('all');
  const [updatingBusiness, setUpdatingBusiness] = useState<number | null>(null);

  // Verifications
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [verificationsPage, setVerificationsPage] = useState(1);
  const [verificationsTotalPages, setVerificationsTotalPages] = useState(1);
  const [verificationsStatusFilter, setVerificationsStatusFilter] = useState<string>('all');
  const [updatingVerification, setUpdatingVerification] = useState<number | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  // Check if user is admin - wait for auth to load first
  useEffect(() => {
    // Don't check authentication until AuthContext has finished loading
    if (authLoading) {
      return;
    }

    // Check if user is authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      router.push('/home');
      return;
    }

    // User is admin, load dashboard stats
    loadDashboardStats();
  }, [user, authLoading, router]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'businesses') {
      loadBusinesses();
    } else if (activeTab === 'verifications') {
      loadVerifications();
    }
  }, [activeTab, usersPage, usersSearch, usersRoleFilter, businessesPage, businessesSearch, businessesVerifiedFilter, verificationsPage, verificationsStatusFilter]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.getDashboardStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: usersPage,
        limit: 10,
      };
      if (usersSearch) params.search = usersSearch;
      if (usersRoleFilter !== 'all') params.role = usersRoleFilter;

      const response = await api.getAllUsers(params);
      if (response.success && response.data) {
        setUsers(response.data.users || []);
        setUsersTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: businessesPage,
        limit: 10,
      };
      if (businessesSearch) params.search = businessesSearch;
      if (businessesVerifiedFilter !== 'all') {
        params.isVerified = businessesVerifiedFilter === 'verified';
      }

      const response = await api.getAllBusinessesAdmin(params);
      if (response.success && response.data) {
        setBusinesses(response.data.businesses || []);
        setBusinessesTotalPages(response.data.pagination?.totalPages || 1);
      }
    } catch (err: any) {
      console.error('Error loading businesses:', err);
      setError(err.response?.data?.message || 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const loadVerifications = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: verificationsPage,
        limit: 10,
      };
      if (verificationsStatusFilter !== 'all') {
        params.status = verificationsStatusFilter;
      }

      const response = await api.getAllVerifications(params);
      if (response.success && response.data) {
        const verificationsData = response.data.verifications || response.data || [];
        setVerifications(Array.isArray(verificationsData) ? verificationsData : []);
        if (response.data.pagination) {
          setVerificationsTotalPages(response.data.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      console.error('Error loading verifications:', err);
      setError(err.response?.data?.message || 'Failed to load verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'CUSTOMER' | 'VENDOR' | 'ADMIN') => {
    // Find the user to check their current role
    const user = users.find(u => u.id === userId);
    
    // Prevent changing admin roles
    if (user?.role === 'ADMIN') {
      alert('Cannot change the role of an admin user');
      return;
    }

    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      setUpdatingUser(userId);
      const response = await api.updateUserRole(userId, newRole);
      if (response.success) {
        await loadUsers();
        await loadDashboardStats();
      } else {
        alert(response.message || 'Failed to update user role');
      }
    } catch (err: any) {
      console.error('Error updating user role:', err);
      alert(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      setUpdatingUser(userId);
      const response = await api.deleteUser(userId);
      if (response.success) {
        await loadUsers();
        await loadDashboardStats();
      } else {
        alert(response.message || 'Failed to delete user');
      }
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleVerifyBusiness = async (businessId: number) => {
    if (!confirm('Are you sure you want to verify this business?')) return;

    try {
      setUpdatingBusiness(businessId);
      const response = await api.verifyBusiness(businessId);
      if (response.success) {
        await loadBusinesses();
        await loadDashboardStats();
        await loadVerifications();
      } else {
        alert(response.message || 'Failed to verify business');
      }
    } catch (err: any) {
      console.error('Error verifying business:', err);
      alert(err.response?.data?.message || 'Failed to verify business');
    } finally {
      setUpdatingBusiness(null);
    }
  };

  const handleUnverifyBusiness = async (businessId: number) => {
    if (!confirm('Are you sure you want to unverify this business?')) return;

    try {
      setUpdatingBusiness(businessId);
      const response = await api.unverifyBusiness(businessId);
      if (response.success) {
        await loadBusinesses();
        await loadDashboardStats();
      } else {
        alert(response.message || 'Failed to unverify business');
      }
    } catch (err: any) {
      console.error('Error unverifying business:', err);
      alert(err.response?.data?.message || 'Failed to unverify business');
    } finally {
      setUpdatingBusiness(null);
    }
  };

  const handleDeleteBusiness = async (businessId: number) => {
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) return;

    try {
      setUpdatingBusiness(businessId);
      const response = await api.deleteBusinessAdmin(businessId);
      if (response.success) {
        await loadBusinesses();
        await loadDashboardStats();
      } else {
        alert(response.message || 'Failed to delete business');
      }
    } catch (err: any) {
      console.error('Error deleting business:', err);
      alert(err.response?.data?.message || 'Failed to delete business');
    } finally {
      setUpdatingBusiness(null);
    }
  };

  const handleApproveVerification = async (verificationId: number) => {
    if (!confirm('Are you sure you want to approve this verification request?')) return;

    try {
      setUpdatingVerification(verificationId);
      const response = await api.approveVerification(verificationId);
      if (response.success) {
        await loadVerifications();
        await loadDashboardStats();
        await loadBusinesses();
      } else {
        alert(response.message || 'Failed to approve verification');
      }
    } catch (err: any) {
      console.error('Error approving verification:', err);
      alert(err.response?.data?.message || 'Failed to approve verification');
    } finally {
      setUpdatingVerification(null);
    }
  };

  const handleRejectVerification = async (verificationId: number) => {
    if (!confirm('Are you sure you want to reject this verification request?')) return;

    try {
      setUpdatingVerification(verificationId);
      const response = await api.rejectVerification(verificationId);
      if (response.success) {
        await loadVerifications();
        await loadDashboardStats();
      } else {
        alert(response.message || 'Failed to reject verification');
      }
    } catch (err: any) {
      console.error('Error rejecting verification:', err);
      alert(err.response?.data?.message || 'Failed to reject verification');
    } finally {
      setUpdatingVerification(null);
    }
  };

  const handleViewDocument = (documentUrl: string) => {
    setSelectedDocument(documentUrl);
    setIsDocumentModalOpen(true);
  };

  const handleCloseDocumentModal = () => {
    setIsDocumentModalOpen(false);
    setSelectedDocument(null);
  };

  const isImageFile = (url: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext)) || lowerUrl.startsWith('data:image/');
  };

  const isPdfFile = (url: string): boolean => {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.pdf') || lowerUrl.startsWith('data:application/pdf');
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="inline-block w-12 h-12 border-4 border-white/20 border-t-[#6ab8d8] rounded-full animate-spin"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not admin (handled in useEffect, but show nothing while redirecting)
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleHome = () => {
    router.push('/home');
  };

  const userName = user?.name || 'Admin';

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Custom Header */}
      <nav className="flex justify-between items-center px-4 sm:px-6 md:px-14 py-3 bg-[#2a2a2a] border-b border-white/10 sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 flex items-center justify-center rounded-[10px] bg-[#6ab8d8]/10">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="#6ab8d8">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white m-0 ml-3">Admin Dashboard</h3>
        </div>
        <div className="flex items-center gap-5.5">
          <button 
            className="bg-transparent border-none cursor-pointer p-2 rounded-full flex items-center justify-center transition-colors text-white/80 hover:bg-white/10 hover:text-white" 
            onClick={handleHome} 
            title="Home"
          >
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
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Welcome Back, {userName}</h1>
          <p className="text-white/60 text-lg">Manage users, businesses, and verifications</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10">
          {(['dashboard', 'users', 'businesses', 'verifications'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setError(null);
                if (tab === 'users') {
                  setUsersPage(1);
                } else if (tab === 'businesses') {
                  setBusinessesPage(1);
                } else if (tab === 'verifications') {
                  setVerificationsPage(1);
                }
              }}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[#2a2a2a] text-white border-b-2 border-[#6ab8d8]'
                  : 'text-white/60 hover:text-white hover:bg-[#2a2a2a]/50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-[#6ab8d8]"></div>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {/* Stats Cards */}
                <div className="bg-[#2a2a2a] rounded-xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white/60 text-sm font-medium">Total Users</h3>
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.users.total}</p>
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Vendors</span>
                      <span className="text-white">{stats.users.vendors}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-white/60">Customers</span>
                      <span className="text-white">{stats.users.customers}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-white/60">Admins</span>
                      <span className="text-white">{stats.users.admins}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a2a2a] rounded-xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white/60 text-sm font-medium">Total Businesses</h3>
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.businesses.total}</p>
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Verified</span>
                      <span className="text-green-400">{stats.businesses.verified}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-white/60">Pending</span>
                      <span className="text-yellow-400">{stats.businesses.pending}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#2a2a2a] rounded-xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white/60 text-sm font-medium">Discussions</h3>
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.discussions.total}</p>
                </div>

                <div className="bg-[#2a2a2a] rounded-xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white/60 text-sm font-medium">Favorites</h3>
                    <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.favorites.total}</p>
                </div>

                <div className="bg-[#2a2a2a] rounded-xl p-6 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white/60 text-sm font-medium">Pending Verifications</h3>
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.verifications.pending}</p>
                  <button
                    onClick={() => setActiveTab('verifications')}
                    className="mt-4 text-sm text-[#6ab8d8] hover:text-[#5aa8c8] transition-colors"
                  >
                    View all verifications →
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-white/60">No statistics available</div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[#2a2a2a] border border-white/10 rounded-xl">
                <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={usersSearch}
                  onChange={(e) => {
                    setUsersSearch(e.target.value);
                    setUsersPage(1);
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40"
                />
              </div>
              <select
                value={usersRoleFilter}
                onChange={(e) => {
                  setUsersRoleFilter(e.target.value);
                  setUsersPage(1);
                }}
                className="px-4 py-3 bg-[#2a2a2a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6ab8d8]"
              >
                <option value="all">All Roles</option>
                <option value="CUSTOMER">Customer</option>
                <option value="VENDOR">Vendor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-[#6ab8d8]"></div>
              </div>
            ) : (
              <>
                <div className="bg-[#2a2a2a] rounded-xl border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#1a1a1a] border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Email</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Role</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Businesses</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Verified</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-white/5 hover:bg-[#1a1a1a]/50 transition-colors">
                            <td className="px-4 py-3 text-white">{user.name || 'N/A'}</td>
                            <td className="px-4 py-3 text-white/80">{user.email || 'N/A'}</td>
                            <td className="px-4 py-3">
                              {user.role === 'ADMIN' ? (
                                <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-medium">
                                  Admin
                                </span>
                              ) : (
                                <select
                                  value={user.role}
                                  onChange={(e) => handleUpdateUserRole(user.id, e.target.value as 'CUSTOMER' | 'VENDOR' | 'ADMIN')}
                                  disabled={updatingUser === user.id}
                                  className="px-2 py-1 bg-[#1a1a1a] border border-white/10 rounded text-white text-sm focus:outline-none focus:border-[#6ab8d8] disabled:opacity-50"
                                >
                                  <option value="CUSTOMER">Customer</option>
                                  <option value="VENDOR">Vendor</option>
                                  <option value="ADMIN">Admin</option>
                                </select>
                              )}
                            </td>
                            <td className="px-4 py-3 text-white/80">{user._count?.businesses || 0}</td>
                            <td className="px-4 py-3">
                              {user.emailVerified ? (
                                <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Verified</span>
                              ) : (
                                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">Pending</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={updatingUser === user.id}
                                className="px-3 py-1 bg-red-500/10 text-red-400 rounded text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {usersTotalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setUsersPage(prev => Math.max(1, prev - 1))}
                      disabled={usersPage === 1}
                      className="px-4 py-2 bg-[#2a2a2a] border border-white/10 text-white rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-white/60 text-sm">Page {usersPage} of {usersTotalPages}</span>
                    <button
                      onClick={() => setUsersPage(prev => Math.min(usersTotalPages, prev + 1))}
                      disabled={usersPage === usersTotalPages}
                      className="px-4 py-2 bg-[#2a2a2a] border border-white/10 text-white rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === 'businesses' && (
          <div>
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-[#2a2a2a] border border-white/10 rounded-xl">
                <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search businesses..."
                  value={businessesSearch}
                  onChange={(e) => {
                    setBusinessesSearch(e.target.value);
                    setBusinessesPage(1);
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40"
                />
              </div>
              <select
                value={businessesVerifiedFilter}
                onChange={(e) => {
                  setBusinessesVerifiedFilter(e.target.value);
                  setBusinessesPage(1);
                }}
                className="px-4 py-3 bg-[#2a2a2a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6ab8d8]"
              >
                <option value="all">All Businesses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-[#6ab8d8]"></div>
              </div>
            ) : (
              <>
                <div className="bg-[#2a2a2a] rounded-xl border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#1a1a1a] border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Category</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Owner</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {businesses.map((business) => (
                          <tr key={business.id} className="border-b border-white/5 hover:bg-[#1a1a1a]/50 transition-colors">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => router.push(`/business/${business.id}`)}
                                className="text-white hover:text-[#6ab8d8] transition-colors text-left"
                              >
                                {business.name}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-white/80">{business.category}</td>
                            <td className="px-4 py-3 text-white/80">{business.owner.name || business.owner.email || 'N/A'}</td>
                            <td className="px-4 py-3">
                              {business.isVerified ? (
                                <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Verified</span>
                              ) : (
                                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">Pending</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {business.isVerified ? (
                                  <button
                                    onClick={() => handleUnverifyBusiness(business.id)}
                                    disabled={updatingBusiness === business.id}
                                    className="px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded text-sm hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                                  >
                                    Unverify
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleVerifyBusiness(business.id)}
                                    disabled={updatingBusiness === business.id}
                                    className="px-3 py-1 bg-green-500/10 text-green-400 rounded text-sm hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                  >
                                    Verify
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteBusiness(business.id)}
                                  disabled={updatingBusiness === business.id}
                                  className="px-3 py-1 bg-red-500/10 text-red-400 rounded text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {businessesTotalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setBusinessesPage(prev => Math.max(1, prev - 1))}
                      disabled={businessesPage === 1}
                      className="px-4 py-2 bg-[#2a2a2a] border border-white/10 text-white rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-white/60 text-sm">Page {businessesPage} of {businessesTotalPages}</span>
                    <button
                      onClick={() => setBusinessesPage(prev => Math.min(businessesTotalPages, prev + 1))}
                      disabled={businessesPage === businessesTotalPages}
                      className="px-4 py-2 bg-[#2a2a2a] border border-white/10 text-white rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Verifications Tab */}
        {activeTab === 'verifications' && (
          <div>
            <div className="mb-6">
              <select
                value={verificationsStatusFilter}
                onChange={(e) => {
                  setVerificationsStatusFilter(e.target.value);
                  setVerificationsPage(1);
                }}
                className="px-4 py-3 bg-[#2a2a2a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#6ab8d8]"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-[#6ab8d8]"></div>
              </div>
            ) : (
              <>
                <div className="bg-[#2a2a2a] rounded-xl border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#1a1a1a] border-b border-white/10">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Business</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Owner</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-white/60">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {verifications.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-white/60">
                              No verifications found
                            </td>
                          </tr>
                        ) : (
                          verifications.map((verification) => (
                            <tr key={verification.id} className="border-b border-white/5 hover:bg-[#1a1a1a]/50 transition-colors">
                              <td className="px-4 py-3">
                                {verification.business ? (
                                  <button
                                    onClick={() => router.push(`/business/${verification.business!.id}`)}
                                    className="text-white hover:text-[#6ab8d8] transition-colors text-left"
                                  >
                                    {verification.business.name}
                                  </button>
                                ) : (
                                  <span className="text-white/60">Business not found</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-white/80">
                                {verification.business?.owner.name || verification.business?.owner.email || 'N/A'}
                              </td>
                              <td className="px-4 py-3">
                                {verification.status === 'PENDING' && (
                                  <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">Pending</span>
                                )}
                                {verification.status === 'APPROVED' && (
                                  <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs">Approved</span>
                                )}
                                {verification.status === 'REJECTED' && (
                                  <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">Rejected</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-white/80">
                                {new Date(verification.createdAt).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-2">
                                  {verification.documentUrl && (
                                    <button
                                      onClick={() => handleViewDocument(verification.documentUrl)}
                                      className="px-3 py-1 bg-[#6ab8d8]/10 text-[#6ab8d8] rounded text-sm hover:bg-[#6ab8d8]/20 transition-colors flex items-center gap-1.5"
                                    >
                                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                                      </svg>
                                      View Document
                                    </button>
                                  )}
                                  {verification.status === 'PENDING' && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleApproveVerification(verification.id)}
                                        disabled={updatingVerification === verification.id}
                                        className="px-3 py-1 bg-green-500/10 text-green-400 rounded text-sm hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleRejectVerification(verification.id)}
                                        disabled={updatingVerification === verification.id}
                                        className="px-3 py-1 bg-red-500/10 text-red-400 rounded text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  )}
                                  {verification.status !== 'PENDING' && (
                                    <span className="text-white/40 text-sm">No actions available</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {isDocumentModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#2a2a2a] rounded-xl border border-white/10 max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-white text-lg font-semibold">Verification Document</h3>
              <button
                onClick={handleCloseDocumentModal}
                className="text-white/60 hover:text-white transition-colors p-1"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-4">
              {isImageFile(selectedDocument) ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <img
                    src={selectedDocument}
                    alt="Verification document"
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const errorDiv = target.nextElementSibling as HTMLElement;
                      if (errorDiv) errorDiv.style.display = 'flex';
                    }}
                  />
                  <div className="hidden items-center justify-center min-h-[400px] text-white/60">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>Failed to load image</p>
                    </div>
                  </div>
                </div>
              ) : isPdfFile(selectedDocument) ? (
                <div className="w-full h-[70vh]">
                  <iframe
                    src={selectedDocument}
                    className="w-full h-full rounded-lg border border-white/10"
                    title="Verification document"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[400px]">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-white/60 mb-4">Document preview not available</p>
                    <a
                      href={selectedDocument}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#6ab8d8]/20 text-[#6ab8d8] rounded-lg hover:bg-[#6ab8d8]/30 transition-colors inline-flex items-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                      </svg>
                      Open in New Tab
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10">
              <a
                href={selectedDocument}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#6ab8d8]/20 text-[#6ab8d8] rounded-lg hover:bg-[#6ab8d8]/30 transition-colors flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                </svg>
                Open in New Tab
              </a>
              <button
                onClick={handleCloseDocumentModal}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
