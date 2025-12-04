'use client';

import React, { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { CATEGORY_LIST } from '../../src/constants/categories';
import { BARANGAYS } from '../../src/constants/barangays';
import Navbar from '../../src/components/Layout/Navbar';
import type { Business } from '../../src/types';

type SortOption = 'alphabetical' | 'reverse' | 'newest' | 'oldest' | 'highest-favorites' | 'lowest-favorites';

function BusinessesContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBarangay, setSelectedBarangay] = useState<string>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [favoriteBusinessIds, setFavoriteBusinessIds] = useState<Set<number>>(new Set());
  const [favoriteCounts, setFavoriteCounts] = useState<Map<number, number>>(new Map());
  const [loadingFavoriteCounts, setLoadingFavoriteCounts] = useState<boolean>(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  
  // Mobile dropdown states
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState<boolean>(false);
  const [barangayDropdownOpen, setBarangayDropdownOpen] = useState<boolean>(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState<boolean>(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const itemsPerPage = 6; // 3x2 grid

  // Load user favorites on mount (if authenticated)
  useEffect(() => {
    if (user) {
      loadUserFavorites();
    } else {
      setFavoriteBusinessIds(new Set());
      setShowFavoritesOnly(false);
    }
  }, [user]);

  // Load businesses on mount and when filters change
  useEffect(() => {
    loadBusinesses();
  }, [selectedCategory, selectedBarangay]);

  // Handle URL params for category filter (from homepage)
  useEffect(() => {
    const categoryParam = searchParams?.get('category');
    const searchParam = searchParams?.get('search');
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  // Load favorite counts when sorting by favorites
  useEffect(() => {
    if (sortOption === 'highest-favorites' || sortOption === 'lowest-favorites') {
      loadFavoriteCounts();
    }
  }, [sortOption, businesses]);

  // Apply filters and sorting
  useEffect(() => {
    applyFiltersAndSort();
  }, [businesses, selectedCategory, selectedBarangay, sortOption, searchQuery, favoriteCounts]);

  const loadUserFavorites = async () => {
    if (!user) return;
    
    try {
      const response = await api.getUserFavorites();
      if (response.success && response.data) {
        const favorites = Array.isArray(response.data) ? response.data : (response.data.favorites || []);
        const favoriteIds = new Set<number>(favorites.map((fav: any) => fav.businessId || fav.business?.id).filter(Boolean));
        setFavoriteBusinessIds(favoriteIds);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const loadFavoriteCounts = async () => {
    if (businesses.length === 0) return;
    
    try {
      setLoadingFavoriteCounts(true);
      const counts = new Map<number, number>();
      
      // Fetch favorite counts for all businesses in parallel
      const promises = businesses.map(async (business) => {
        try {
          const response = await api.getBusinessFavoriteCount(business.id);
          if (response.success && response.data) {
            counts.set(business.id, response.data.count || 0);
          } else {
            counts.set(business.id, 0);
          }
        } catch (error) {
          console.error(`Error loading favorite count for business ${business.id}:`, error);
          counts.set(business.id, 0);
        }
      });
      
      await Promise.all(promises);
      setFavoriteCounts(counts);
    } catch (error) {
      console.error('Error loading favorite counts:', error);
    } finally {
      setLoadingFavoriteCounts(false);
    }
  };

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const filters: any = {
        page: 1,
        limit: 100, // Load more to allow client-side filtering
      };

      if (selectedCategory) {
        filters.category = selectedCategory;
      }
      if (selectedBarangay) {
        filters.barangay = selectedBarangay;
      }

      const response = await api.getBusinesses(filters);
      if (response.success && response.data) {
        setBusinesses(response.data.businesses || []);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...businesses];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (business) =>
          business.name.toLowerCase().includes(query) ||
          business.description.toLowerCase().includes(query) ||
          business.category.toLowerCase().includes(query) ||
          business.location.toLowerCase().includes(query) ||
          business.barangay.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter((business) => business.category === selectedCategory);
    }

    // Apply barangay filter
    if (selectedBarangay) {
      filtered = filtered.filter((business) => business.barangay === selectedBarangay);
    }

    // Apply sorting
    switch (sortOption) {
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'reverse':
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'highest-favorites':
        filtered.sort((a, b) => {
          const countA = favoriteCounts.get(a.id) || 0;
          const countB = favoriteCounts.get(b.id) || 0;
          return countB - countA; // Descending order
        });
        break;
      case 'lowest-favorites':
        filtered.sort((a, b) => {
          const countA = favoriteCounts.get(a.id) || 0;
          const countB = favoriteCounts.get(b.id) || 0;
          return countA - countB; // Ascending order
        });
        break;
    }

    setFilteredBusinesses(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    applyFiltersAndSort();
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === selectedCategory ? '' : category);
  };

  const handleBarangayChange = (barangay: string) => {
    setSelectedBarangay(barangay === selectedBarangay ? '' : barangay);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedBarangay('');
    setSortOption('newest');
    setSearchQuery('');
  };

  const handleBusinessClick = (businessId: number) => {
    router.push(`/business/${businessId}`);
  };

  // Get current page businesses
  const getCurrentPageBusinesses = (): Business[] => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredBusinesses.slice(start, end);
  };

  const getCategoryLabel = (categoryValue: string): string => {
    const category = CATEGORY_LIST.find((cat) => cat.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#1a1a1a]">
      <Navbar />

      {/* Search Bar Section with Background Image */}
      <div className="pt-[120px] pb-[60px] px-5 text-white relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/Parola.jpg" 
            alt="Background" 
            className="absolute top-0 left-0 w-full h-full object-cover brightness-[0.7]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50"></div>
        </div>
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          <h1 className="text-5xl md:text-4xl sm:text-3xl font-bold mb-4 tracking-[3px] text-center drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            EXPLORE CORDOVA
          </h1>
          <p className="text-xl md:text-lg sm:text-base mb-8 opacity-90 text-center leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
            Find great places to stay, eat, shop, or visit from local experts.
          </p>
          
          <form className="max-w-[800px] mx-auto" onSubmit={handleSearch}>
            <div className="relative bg-white/80 backdrop-blur-md rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] overflow-hidden border border-white/30">
              <div className="flex items-center gap-4 px-6 py-5">
                <svg 
                  className="text-[#1e3c72] flex-shrink-0"
                  viewBox="0 0 24 24" 
                  width="28" 
                  height="28" 
                  fill="none" 
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  placeholder="Search for businesses, places, or services..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-none outline-none text-lg text-gray-800 bg-transparent placeholder:text-gray-400"
                />
                <button 
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)]"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-8 px-6 md:px-4 pt-12 pb-12 max-w-[1600px] mx-auto w-full bg-[#1a1a1a]">
        {/* Mobile Filters - Horizontal Dropdowns */}
        <div className="lg:hidden flex flex-wrap gap-3 mb-4">
          {/* Category Dropdown */}
          <div className="relative flex-1 min-w-[140px]">
            <button
              onClick={() => {
                setCategoryDropdownOpen(!categoryDropdownOpen);
                setBarangayDropdownOpen(false);
                setSortDropdownOpen(false);
              }}
              className="w-full px-3 py-2 bg-[#2a2a2a] border border-white/10 rounded-lg text-white text-sm font-medium flex items-center justify-between hover:bg-[#333] transition-colors"
            >
              <span className="truncate">
                {selectedCategory ? getCategoryLabel(selectedCategory) : 'Category'}
              </span>
              <svg 
                className={`w-4 h-4 transition-transform ${categoryDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {categoryDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setCategoryDropdownOpen(false)}
                ></div>
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] border border-white/10 rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                  <button
                    onClick={() => {
                      handleCategoryChange('');
                      setCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedCategory === ''
                        ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  {CATEGORY_LIST.map((category) => (
                    <button
                      key={category.value}
                      onClick={() => {
                        handleCategoryChange(category.value);
                        setCategoryDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        selectedCategory === category.value
                          ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Barangay Dropdown */}
          <div className="relative flex-1 min-w-[140px]">
            <button
              onClick={() => {
                setBarangayDropdownOpen(!barangayDropdownOpen);
                setCategoryDropdownOpen(false);
                setSortDropdownOpen(false);
              }}
              className="w-full px-3 py-2 bg-[#2a2a2a] border border-white/10 rounded-lg text-white text-sm font-medium flex items-center justify-between hover:bg-[#333] transition-colors"
            >
              <span className="truncate">
                {selectedBarangay || 'Barangay'}
              </span>
              <svg 
                className={`w-4 h-4 transition-transform ${barangayDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {barangayDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setBarangayDropdownOpen(false)}
                ></div>
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] border border-white/10 rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                  <button
                    onClick={() => {
                      handleBarangayChange('');
                      setBarangayDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedBarangay === ''
                        ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    All Barangays
                  </button>
                  {BARANGAYS.map((barangay) => (
                    <button
                      key={barangay}
                      onClick={() => {
                        handleBarangayChange(barangay);
                        setBarangayDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        selectedBarangay === barangay
                          ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {barangay}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative flex-1 min-w-[140px]">
            <button
              onClick={() => {
                setSortDropdownOpen(!sortDropdownOpen);
                setCategoryDropdownOpen(false);
                setBarangayDropdownOpen(false);
              }}
              className="w-full px-3 py-2 bg-[#2a2a2a] border border-white/10 rounded-lg text-white text-sm font-medium flex items-center justify-between hover:bg-[#333] transition-colors"
            >
              <span className="truncate">
                {sortOption === 'newest' ? 'Newest' :
                 sortOption === 'oldest' ? 'Oldest' :
                 sortOption === 'alphabetical' ? 'A-Z' :
                 sortOption === 'reverse' ? 'Z-A' :
                 sortOption === 'highest-favorites' ? 'Highest Fav' :
                 sortOption === 'lowest-favorites' ? 'Lowest Fav' : 'Sort'}
              </span>
              <svg 
                className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sortDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setSortDropdownOpen(false)}
                ></div>
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2a2a] border border-white/10 rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto">
                  <button
                    onClick={() => {
                      handleSortChange('newest');
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                      sortOption === 'newest'
                        ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Newest First
                  </button>
                  <button
                    onClick={() => {
                      handleSortChange('oldest');
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      sortOption === 'oldest'
                        ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Oldest First
                  </button>
                  <button
                    onClick={() => {
                      handleSortChange('alphabetical');
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      sortOption === 'alphabetical'
                        ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    A-Z
                  </button>
                  <button
                    onClick={() => {
                      handleSortChange('reverse');
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      sortOption === 'reverse'
                        ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Z-A
                  </button>
                  <button
                    onClick={() => {
                      handleSortChange('highest-favorites');
                      setSortDropdownOpen(false);
                    }}
                    disabled={loadingFavoriteCounts}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                      sortOption === 'highest-favorites'
                        ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    } ${loadingFavoriteCounts ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      width="14" 
                      height="14" 
                      fill={sortOption === 'highest-favorites' ? 'currentColor' : 'none'} 
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    Highest Favorites
                  </button>
                  <button
                    onClick={() => {
                      handleSortChange('lowest-favorites');
                      setSortDropdownOpen(false);
                    }}
                    disabled={loadingFavoriteCounts}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                      sortOption === 'lowest-favorites'
                        ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    } ${loadingFavoriteCounts ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      width="14" 
                      height="14" 
                      fill={sortOption === 'lowest-favorites' ? 'currentColor' : 'none'} 
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    Lowest Favorites
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Clear Filters Button */}
          {(selectedCategory || selectedBarangay || sortOption !== 'newest') && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 bg-[#2a2a2a] border border-white/10 rounded-lg text-white text-sm font-medium hover:bg-[#333] transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sidebar Filters - Desktop Only */}
        <aside className="hidden lg:block w-80 flex-shrink-0">
          <div className="bg-[#2a2a2a] rounded-[20px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] border border-white/5 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white tracking-[1px]">Filter By</h2>
              {(selectedCategory || selectedBarangay || sortOption !== 'newest') && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-[#6ab8d8] hover:text-[#8bc5d9] transition-colors duration-300"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3 tracking-[0.5px]">Category</h3>
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-2">
                <button
                  onClick={() => handleCategoryChange('')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 ${
                    selectedCategory === ''
                      ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  All
                </button>
                {CATEGORY_LIST.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => handleCategoryChange(category.value)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 ${
                      selectedCategory === category.value
                        ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                        : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Barangay Filter */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3 tracking-[0.5px]">Barangay</h3>
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-2">
                <button
                  onClick={() => handleBarangayChange('')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 ${
                    selectedBarangay === ''
                      ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  All Barangays
                </button>
                {BARANGAYS.map((barangay) => (
                  <button
                    key={barangay}
                    onClick={() => handleBarangayChange(barangay)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 ${
                      selectedBarangay === barangay
                        ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                        : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {barangay}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 tracking-[0.5px]">Sort By</h3>
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-2">
                <button
                  onClick={() => handleSortChange('newest')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 ${
                    sortOption === 'newest'
                      ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Newest First
                </button>
                <button
                  onClick={() => handleSortChange('oldest')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 ${
                    sortOption === 'oldest'
                      ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Oldest First
                </button>
                <button
                  onClick={() => handleSortChange('alphabetical')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 ${
                    sortOption === 'alphabetical'
                      ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  A-Z
                </button>
                <button
                  onClick={() => handleSortChange('reverse')}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 ${
                    sortOption === 'reverse'
                      ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Z-A
                </button>
                <button
                  onClick={() => handleSortChange('highest-favorites')}
                  disabled={loadingFavoriteCounts}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                    sortOption === 'highest-favorites'
                      ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  } ${loadingFavoriteCounts ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    width="16" 
                    height="16" 
                    fill={sortOption === 'highest-favorites' ? 'currentColor' : 'none'} 
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span>Highest Favorites</span>
                  {loadingFavoriteCounts && sortOption === 'highest-favorites' && (
                    <span className="ml-auto text-xs">Loading...</span>
                  )}
                </button>
                <button
                  onClick={() => handleSortChange('lowest-favorites')}
                  disabled={loadingFavoriteCounts}
                  className={`w-full text-left px-4 py-2.5 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                    sortOption === 'lowest-favorites'
                      ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                      : 'bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  } ${loadingFavoriteCounts ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    width="16" 
                    height="16" 
                    fill={sortOption === 'lowest-favorites' ? 'currentColor' : 'none'} 
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                  <span>Lowest Favorites</span>
                  {loadingFavoriteCounts && sortOption === 'lowest-favorites' && (
                    <span className="ml-auto text-xs">Loading...</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Business Cards Grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="text-center py-20 text-white">
              <div className="inline-block w-12 h-12 border-4 border-white/20 border-t-[#6ab8d8] rounded-full animate-spin"></div>
              <p className="mt-4 text-lg">Loading businesses...</p>
            </div>
          ) : getCurrentPageBusinesses().length === 0 ? (
            <div className="text-center py-20 text-white">
              <p className="text-xl mb-2">No businesses found</p>
              <p className="text-white/60">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <p className="text-white/80">
                  Showing {getCurrentPageBusinesses().length} of {filteredBusinesses.length} businesses
                </p>
              </div>

              {/* 3x2 Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {getCurrentPageBusinesses().map((business) => (
                  <div
                    key={business.id}
                    className="group rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-500 bg-[#2a2a2a] hover:-translate-y-3 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col relative border border-white/5"
                  >
                    {/* Decorative gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0f4c75]/0 via-[#1b627d]/0 to-[#0f4c75]/0 group-hover:from-[#0f4c75]/20 group-hover:via-[#1b627d]/10 group-hover:to-[#0f4c75]/20 transition-all duration-500 z-10 pointer-events-none"></div>

                    <div
                      className="h-[280px] bg-cover bg-center relative overflow-hidden"
                      style={{
                        backgroundImage: `url(${business.coverPhoto || '/Parola.jpg'})`,
                      }}
                    >
                      {/* Gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:from-black/95 group-hover:via-black/50 transition-all duration-500"></div>

                      {/* Shine effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>

                      {/* Category Badge */}
                      <div className="absolute top-4 left-4 z-20">
                        <span className="px-4 py-2 bg-gradient-to-br from-[#0f4c75]/95 to-[#1b627d]/95 backdrop-blur-md rounded-full text-white text-sm font-semibold border border-white/30 shadow-[0_4px_15px_rgba(0,0,0,0.3)]">
                          {getCategoryLabel(business.category)}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-[#6ab8d8] transition-colors duration-300">
                        {business.name}
                      </h3>
                      
                      <div className="mb-4 flex items-start gap-2 text-white/70">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="flex-shrink-0 mt-0.5">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                        <span className="text-sm">{business.barangay}, {business.location}</span>
                      </div>

                      <button
                        onClick={() => handleBusinessClick(business.id)}
                        className="mt-auto relative px-6 py-3 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white border-none rounded-xl text-base font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(15,76,117,0.5)] overflow-hidden group/btn w-full"
                      >
                        {/* Button shine effect */}
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></span>
                        <span className="relative z-10">View Details</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-8">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-lg text-white border border-white/20 transition-all duration-300 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  <div className="flex gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-lg transition-all duration-300 ${
                          currentPage === page
                            ? 'bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white'
                            : 'bg-white/10 text-white/80 hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-lg text-white border border-white/20 transition-all duration-300 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-center text-white">
          <div className="inline-block w-12 h-12 border-4 border-white/20 border-t-[#6ab8d8] rounded-full animate-spin"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <BusinessesContent />
    </Suspense>
  );
}