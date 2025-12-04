'use client';

import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { CATEGORY_LIST } from '../../src/constants/categories';
import type { CategoryOption } from '../../src/constants/categories';
import Navbar from '../../src/components/Layout/Navbar';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  const categories = CATEGORY_LIST;
  const [itemsPerSlide, setItemsPerSlide] = useState(3);

  // Responsive items per slide
  useEffect(() => {
    const updateItemsPerSlide = () => {
      if (window.innerWidth < 640) {
        setItemsPerSlide(1); // Mobile: 1 card
      } else if (window.innerWidth < 1024) {
        setItemsPerSlide(2); // Tablet: 2 cards
      } else {
        setItemsPerSlide(3); // Desktop: 3 cards
      }
    };

    updateItemsPerSlide();
    window.addEventListener('resize', updateItemsPerSlide);
    return () => window.removeEventListener('resize', updateItemsPerSlide);
  }, []);

  const totalSlides = Math.ceil(categories.length / itemsPerSlide);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleElements((prev) => new Set(prev).add(entry.target.id));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = [heroRef.current, searchRef.current, sectionRef.current].filter(Boolean);
    elements.forEach((el) => {
      if (el) observer.observe(el);
    });

    // Observe individual category cards after they're rendered
    const timeoutId = setTimeout(() => {
      const cardElements = document.querySelectorAll('[id^="category-card-"]');
      cardElements.forEach((el) => observer.observe(el));
    }, 100);

    return () => {
      elements.forEach((el) => {
        if (el) observer.unobserve(el);
      });
      const cardElements = document.querySelectorAll('[id^="category-card-"]');
      cardElements.forEach((el) => observer.unobserve(el));
      clearTimeout(timeoutId);
    };
  }, [categories.length]);

  const handleCategoryExplore = (categoryValue: string) => {
    router.push(`/businesses?category=${categoryValue}`);
  };

  // Debounced search for suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        loadSuggestions(searchQuery);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) && 
          searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSuggestions = async (query: string) => {
    try {
      setLoadingSuggestions(true);
      const response = await api.getSearchSuggestions(query, 5);
      if (response.success && response.data?.businesses) {
        setSuggestions(response.data.businesses);
        setShowSuggestions(response.data.businesses.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      return;
    }
    setShowSuggestions(false);
    router.push(`/businesses?search=${encodeURIComponent(searchQuery)}`);
  };

  const handleSuggestionClick = (businessName: string) => {
    setSearchQuery(businessName);
    setShowSuggestions(false);
    router.push(`/businesses?search=${encodeURIComponent(businessName)}`);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => {
      const maxSlide = Math.ceil(categories.length / itemsPerSlide) - 1;
      return (prev + 1) % (maxSlide + 1);
    });
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => {
      const maxSlide = Math.ceil(categories.length / itemsPerSlide) - 1;
      return (prev - 1 + maxSlide + 1) % (maxSlide + 1);
    });
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Reset slide when itemsPerSlide changes
  useEffect(() => {
    const maxSlide = Math.ceil(categories.length / itemsPerSlide) - 1;
    if (currentSlide > maxSlide) {
      setCurrentSlide(0);
    }
  }, [itemsPerSlide, categories.length, currentSlide]);

  // Autoplay slider
  useEffect(() => {
    const maxSlide = Math.ceil(categories.length / itemsPerSlide) - 1;
    // Only autoplay if there are multiple slides
    if (maxSlide <= 0) return;

    const autoplayInterval = setInterval(() => {
      if (!isPaused) {
        setCurrentSlide((prev) => (prev + 1) % (maxSlide + 1));
      }
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(autoplayInterval);
  }, [categories.length, itemsPerSlide, isPaused]);

  const getCategoryImage = (categoryValue: string): string => {
    // Map categories to images from public folder
    const categoryImages: Record<string, string> = {
      'food-dining': '/foodndining.jpg',
      'transportation': '/transportation.jpg',
      'accommodation': '/accomodation.jpg',
      'retail-shops': '/retail_shop.jpg',
      'services': '/services.jpg',
      'entertainment': '/entertainment.jpg',
    };
    return categoryImages[categoryValue] || '/Parola.jpg';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div ref={heroRef} id="hero-section" className="min-h-[50vh] sm:min-h-[60vh] flex items-center justify-center pt-[100px] sm:pt-[120px] pb-[40px] sm:pb-[60px] px-4 sm:px-5 text-white relative overflow-hidden">
        <img src="/Parola.jpg" alt="Background" className="absolute top-0 left-0 w-full h-full object-cover brightness-[0.6] z-0" />
        <div className="max-w-[900px] w-full text-center relative z-10">
          <h1 className={`text-6xl md:text-5xl sm:text-4xl font-bold mb-5 tracking-[4px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)] transition-all duration-800 ${visibleElements.has('hero-section') ? 'animate-fade-in-down opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>EXPLORE CORDOVA</h1>
          <p className={`text-xl md:text-lg sm:text-base mb-12 opacity-95 leading-relaxed transition-all duration-800 ${visibleElements.has('hero-section') ? 'animate-fade-in-up opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
            Find great places to stay, eat, shop, or visit from local experts.
          </p>
          
          <form ref={searchRef} id="search-form" className={`max-w-[800px] mx-auto transition-all duration-800 ${visibleElements.has('search-form') ? 'animate-fade-in-scale opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }} onSubmit={handleSearch}>
            <div className="relative bg-white/80 backdrop-blur-md rounded-[30px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] overflow-visible border border-white/30">
              <div className="flex items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-5">
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
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search for businesses, places, or services..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (suggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    className="w-full border-none outline-none text-lg text-gray-800 bg-transparent placeholder:text-gray-500 font-medium"
                  />
                  {/* Suggestions Dropdown */}
                  {showSuggestions && (searchQuery.trim().length >= 2 || suggestions.length > 0) && (
                    <div 
                      ref={suggestionsRef}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] border border-gray-200 max-h-64 overflow-y-auto z-50"
                    >
                      {loadingSuggestions ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1e3c72] mx-auto"></div>
                        </div>
                      ) : suggestions.length > 0 ? (
                        suggestions.map((business) => (
                          <button
                            key={business.id}
                            type="button"
                            onClick={() => handleSuggestionClick(business.name)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{business.name}</div>
                            <div className="text-sm text-gray-500 mt-1">{business.category} • {business.barangay}</div>
                          </button>
                        ))
                      ) : searchQuery.trim().length >= 2 ? (
                        <div className="p-4 text-center text-gray-500">No results found</div>
                      ) : null}
                    </div>
                  )}
                </div>
                <button 
                  type="submit" 
                  className="px-8 py-3 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white border-none rounded-[20px] text-base font-semibold cursor-pointer transition-all duration-300 whitespace-nowrap hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  Search
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div ref={sectionRef} id="category-section" className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 lg:px-[60px] bg-[#1a1a1a] flex-1">
        <div className={`mb-12 pb-5 border-b border-gray-700 transition-all duration-800 ${visibleElements.has('category-section') ? 'animate-fade-in-up opacity-100' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
          <h2 className="text-white text-4xl sm:text-2xl font-bold tracking-[2px]">EXPLORE BY CATEGORY</h2>
          <p className="text-white/80 text-xl mt-2 font-light">Discover the best of Cordova through our curated categories</p>
        </div>

        <div className="relative max-w-[1400px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          {/* Slider Container */}
          <div 
            className="relative overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ 
                transform: `translateX(-${currentSlide * 100}%)` 
              }}
            >
              {Array.from({ length: totalSlides }).map((_, slideIndex) => (
                <div key={slideIndex} className="flex-shrink-0 w-full flex gap-2 sm:gap-4 md:gap-6">
                  {categories.slice(slideIndex * itemsPerSlide, slideIndex * itemsPerSlide + itemsPerSlide).map((category, cardIndex) => {
                    const index = slideIndex * itemsPerSlide + cardIndex;
                    const cardId = `category-card-${index}`;
                    const isVisible = visibleElements.has(cardId) || visibleElements.has('category-section');
                    return (
                      <div 
                        key={category.value}
                        id={cardId}
                        className={`group flex-1 min-w-0 rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all duration-500 hover:-translate-y-2 sm:hover:-translate-y-3 hover:shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative ${isVisible ? 'animate-fade-in-up opacity-100' : 'opacity-0'}`}
                        style={{ 
                          animationDelay: `${index * 0.1}s`
                        }}
                      >
                    <div 
                      className="h-[300px] sm:h-[350px] md:h-[400px] bg-cover bg-center relative overflow-hidden rounded-[20px] sm:rounded-[24px]"
                      style={{ 
                        backgroundImage: `url(${getCategoryImage(category.value)})`,
                      }}
                    >
                      {/* Gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent group-hover:from-black/95 group-hover:via-black/50 transition-all duration-500"></div>
                      
                      {/* Shine effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                      
                      {/* Content inside image */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 z-20">
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-5 md:mb-6 text-white group-hover:text-[#6ab8d8] transition-colors duration-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                          {category.label}
                        </h3>
                        
                        <button
                          onClick={() => handleCategoryExplore(category.value)}
                          className="relative px-6 py-2.5 sm:px-7 sm:py-2.5 md:px-8 md:py-3 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white border-none rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(15,76,117,0.5)] overflow-hidden group/btn w-full sm:w-auto"
                        >
                          {/* Button shine effect */}
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></span>
                          <span className="relative z-10">Explore</span>
                        </button>
                      </div>
                      
                      {/* Category icon/badge */}
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300 z-20">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" fill="white">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          {totalSlides > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-0 sm:-left-4 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-300 hover:bg-white/20 hover:scale-110 z-30 border border-white/20"
                aria-label="Previous slide"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-0 sm:-right-4 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer transition-all duration-300 hover:bg-white/20 hover:scale-110 z-30 border border-white/20"
                aria-label="Next slide"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor">
                  <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                </svg>
              </button>
            </>
          )}

          {/* Pagination Dots */}
          {totalSlides > 1 && (
            <div className="flex justify-center items-center gap-2 sm:gap-3 mt-6 sm:mt-8">
              {Array.from({ length: totalSlides }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${
                    currentSlide === index
                      ? 'bg-white w-6 sm:w-8'
                      : 'bg-white/40 hover:bg-white/60 w-2 sm:w-3'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="bg-[#0a0a0a] py-[30px] px-5 text-center">
        <p className="text-white/70 text-sm">©2025 Locafy, All Rights Reserved</p>
      </footer>
    </div>
  );
}
