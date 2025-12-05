'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import Navbar from '../../src/components/Layout/Navbar';
import type { Business, Favorite } from '../../src/types';

interface FavoriteWithBusiness extends Favorite {
  business: Business;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteWithBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingFavorite, setRemovingFavorite] = useState<number | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadFavorites();
  }, [user, router]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getUserFavorites();
      
      if (response.success && response.data) {
        setFavorites(response.data || []);
      } else {
        setError(response.message || 'Failed to load favorites');
      }
    } catch (err: any) {
      console.error('Error loading favorites:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (businessId: number) => {
    const business = favorites.find(f => f.businessId === businessId)?.business;
    const businessName = business?.name || 'this business';
    
    if (!confirm(`Are you sure you want to remove "${businessName}" from your favorites?`)) {
      return;
    }

    try {
      setRemovingFavorite(businessId);
      setError(null);
      
      const response = await api.removeFavorite(businessId);
      
      if (response.success) {
        // Remove the favorite from the list
        setFavorites(prev => prev.filter(f => f.businessId !== businessId));
      } else {
        setError(response.message || 'Failed to remove favorite');
      }
    } catch (err: any) {
      console.error('Error removing favorite:', err);
      setError(err.response?.data?.message || err.message || 'Failed to remove favorite');
    } finally {
      setRemovingFavorite(null);
    }
  };

  const handleViewBusiness = (businessId: number) => {
    router.push(`/business/${businessId}?mode=view`);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-24 sm:pt-28 pb-6 sm:pb-8">
        {/* Header */}
        <div className="mt-1 sm:mt-8 mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">My Favorites</h1>
          <p className="text-white/60">All your favorite businesses in one place</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#2a2a2a] rounded-xl overflow-hidden border border-white/10 animate-pulse">
                <div className="h-48 bg-white/10"></div>
                <div className="p-6">
                  <div className="h-6 bg-white/10 rounded mb-2"></div>
                  <div className="h-4 bg-white/10 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-[#2a2a2a] rounded-xl p-12 border border-white/10 text-center">
            <svg 
              className="w-16 h-16 mx-auto mb-4 text-white/40" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">No favorites yet</h3>
            <p className="text-white/60 mb-6">Start exploring businesses and add them to your favorites</p>
            <button
              onClick={() => router.push('/businesses')}
              className="px-6 py-3 bg-gradient-to-r from-[#6ab8d8] to-[#4a9bc7] text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
            >
              Browse Businesses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-[#2a2a2a] rounded-xl overflow-hidden border border-white/10 hover:border-[#6ab8d8]/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                {/* Cover Photo */}
                <div className="relative h-48 bg-gradient-to-br from-[#1e3c72] to-[#2a5298] cursor-pointer" onClick={() => handleViewBusiness(favorite.business.id)}>
                  {favorite.business.coverPhoto ? (
                    <img
                      src={favorite.business.coverPhoto}
                      alt={favorite.business.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-white/40 text-4xl font-bold">
                        {favorite.business.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {/* Favorite Badge */}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/90 backdrop-blur-sm text-white rounded-full text-xs font-semibold flex items-center gap-1">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    Favorited
                  </div>
                </div>

                {/* Business Info */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1 cursor-pointer hover:text-[#6ab8d8] transition-colors" onClick={() => handleViewBusiness(favorite.business.id)}>
                    {favorite.business.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-sm text-white/80 mb-4">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    <span>{favorite.business.barangay}</span>
                    <span>•</span>
                    <span>{favorite.business.category}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewBusiness(favorite.business.id)}
                      className="flex-1 px-4 py-2 bg-[#6ab8d8]/20 text-[#6ab8d8] rounded-lg font-medium hover:bg-[#6ab8d8]/30 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleRemoveFavorite(favorite.business.id)}
                      disabled={removingFavorite === favorite.business.id}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      title="Remove from favorites"
                    >
                      {removingFavorite === favorite.business.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                          <span className="text-xs">Removing...</span>
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                          <span className="text-xs">Remove</span>
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
    </div>
  );
}

