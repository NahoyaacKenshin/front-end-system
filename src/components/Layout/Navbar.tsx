'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleMenuClick = () => {
    setMenuOpen(false);
  };

  // Admin menu items
  const adminMenuItems = [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/admin', label: 'Admin Dashboard', icon: 'admin' },
    { href: '/businesses', label: 'Businesses', icon: 'list' },
  ];

  // Vendor menu items
  const vendorMenuItems = [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/business-owner-dashboard', label: 'Dashboard', icon: 'dashboard' },
    { href: '/my-businesses', label: 'My Business', icon: 'my-business' },
    { href: '/businesses/new', label: 'Add Business', icon: 'add' },
    { href: '/favorites', label: 'Favorites', icon: 'heart' },
    { href: '/businesses', label: 'Browse', icon: 'list' },
  ];

  // Customer menu items
  const customerMenuItems = [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/favorites', label: 'Favorites', icon: 'heart' },
    { href: '/businesses/new', label: 'Add Business', icon: 'add' },
    { href: '/businesses', label: 'Browse', icon: 'list' },
  ];

  const getMenuItems = () => {
    if (!user) return [];
    if (user.role === 'ADMIN') return adminMenuItems;
    if (user.role === 'VENDOR') return vendorMenuItems;
    return customerMenuItems;
  };

  const menuItems = getMenuItems();

  const getIcon = (iconName: string) => {
    const icons: Record<string, JSX.Element> = {
      home: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
      ),
      admin: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      ),
      users: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      ),
      list: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
        </svg>
      ),
      dashboard: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
        </svg>
      ),
      business: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
        </svg>
      ),
      'my-business': (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
        </svg>
      ),
      add: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      ),
      heart: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ),
      login: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v-2h8V5h-8V3h8c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2z"/>
        </svg>
      ),
      signup: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2zm-7-9C6.48 4 2 8.48 2 14s4.48 10 10 10 10-4.48 10-10S17.52 4 12 4zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
      ),
    };
    return icons[iconName] || icons.list;
  };

  // Guest menu items (when not logged in)
  const guestMenuItems = [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/businesses', label: 'Browse', icon: 'list' },
  ];

  const displayMenuItems = user ? menuItems : guestMenuItems;

  return (
    <nav className={`flex justify-between items-center py-5 px-[60px] md:px-8 sm:px-5 fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
      isScrolled 
        ? 'bg-[rgba(15,76,117,0.95)] backdrop-blur-md shadow-[0_4px_10px_rgba(0,0,0,0.2)]' 
        : 'bg-transparent'
    }`}>
      <Link href="/home" className="flex items-center gap-4 no-underline">
        <img src="/logo.jpg" alt="Logo" className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#1e3c72] to-[#2a5298]" />
        <h3 className="text-white text-2xl sm:text-xl font-bold tracking-[2px]">LOCAFY</h3>
      </Link>
      
      {/* Desktop menu - always visible */}
      <div className="hidden md:flex items-center gap-5">
        {displayMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 p-2.5 bg-white/10 border-none rounded-lg text-white cursor-pointer transition-all duration-300 hover:bg-white/25 hover:-translate-y-0.5"
            title={item.label}
          >
            <span className="flex-shrink-0">{getIcon(item.icon)}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
        
        {user ? (
          <button 
            className="flex items-center gap-2 p-2.5 bg-white/10 border-none rounded-lg text-white cursor-pointer transition-all duration-300 hover:bg-white/25 hover:-translate-y-0.5" 
            onClick={handleLogout} 
            title="Logout"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            <span className="text-sm font-medium">Logout</span>
          </button>
        ) : (
          <>
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 border-none rounded-lg text-white cursor-pointer transition-all duration-300 hover:bg-white/25 hover:-translate-y-0.5"
              title="Login"
            >
              <span className="flex-shrink-0">{getIcon('login')}</span>
              <span className="text-sm font-medium">Login</span>
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] border-none rounded-lg text-white cursor-pointer transition-all duration-300 hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)] hover:-translate-y-0.5"
              title="Sign Up"
            >
              <span className="flex-shrink-0">{getIcon('signup')}</span>
              <span className="text-sm font-medium">Sign Up</span>
            </Link>
          </>
        )}
      </div>

      {/* Mobile hamburger button */}
      <button 
        className="md:hidden bg-transparent border-none text-white text-3xl cursor-pointer"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      
      {/* Mobile menu - dropdown */}
      <div className={`md:hidden absolute top-full right-0 bg-[rgba(15,76,117,0.98)] backdrop-blur-md flex-col w-[250px] p-5 shadow-[0_4px_10px_rgba(0,0,0,0.2)] rounded-b-lg transition-all duration-300 ease-in-out ${
        menuOpen 
          ? 'translate-y-0 opacity-100 pointer-events-auto' 
          : '-translate-y-full opacity-0 pointer-events-none'
      }`}>
        {displayMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleMenuClick}
            className="flex items-center gap-3 p-2.5 bg-white/10 border-none rounded-lg text-white cursor-pointer transition-all duration-300 hover:bg-white/25 hover:-translate-y-0.5 w-full mb-2"
            title={item.label}
          >
            <span className="flex-shrink-0">{getIcon(item.icon)}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
        
        {user ? (
          <button 
            className="flex items-center gap-3 p-2.5 bg-white/10 border-none rounded-lg text-white cursor-pointer transition-all duration-300 hover:bg-white/25 hover:-translate-y-0.5 w-full" 
            onClick={handleLogout} 
            title="Logout"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            <span className="text-sm font-medium">Logout</span>
          </button>
        ) : (
          <>
            <Link
              href="/login"
              onClick={handleMenuClick}
              className="flex items-center gap-3 p-2.5 bg-white/10 border-none rounded-lg text-white cursor-pointer transition-all duration-300 hover:bg-white/25 hover:-translate-y-0.5 w-full mb-2"
              title="Login"
            >
              <span className="flex-shrink-0">{getIcon('login')}</span>
              <span className="text-sm font-medium">Login</span>
            </Link>
            <Link
              href="/register"
              onClick={handleMenuClick}
              className="flex items-center gap-3 p-2.5 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] border-none rounded-lg text-white cursor-pointer transition-all duration-300 hover:shadow-[0_4px_15px_rgba(15,76,117,0.4)] hover:-translate-y-0.5 w-full"
              title="Sign Up"
            >
              <span className="flex-shrink-0">{getIcon('signup')}</span>
              <span className="text-sm font-medium">Sign Up</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

