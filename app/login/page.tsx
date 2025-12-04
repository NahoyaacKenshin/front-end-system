'use client';

// Force dynamic rendering to prevent static generation build errors
export const dynamic = 'force-dynamic';

import React, { useState, FormEvent, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth(); // Get the whole context first
  const login = auth?.login; // Safely access login

  // Handle OAuth success redirect
  useEffect(() => {
    // Safety check for searchParams
    if (!searchParams) return;

    const oauthSuccess = searchParams.get('oauth_success');
    if (oauthSuccess === 'true') {
      const userName = searchParams.get('name') || 'User';
      const userRole = searchParams.get('role') || 'CUSTOMER';
      
      setSuccess(true);
      setSuccessMessage(`Welcome back, ${userName}! Login successful. Redirecting...`);
      setError('');
      
      // Redirect based on role
      setTimeout(() => {
        if (userRole === 'ADMIN') {
          router.push('/admin');
        } else if (userRole === 'VENDOR') {
          router.push('/business-owner-dashboard');
        } else {
          router.push('/home');
        }
      }, 2000);
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!login) {
      setError('Auth service not available. Please try again later.');
      setIsLoading(false);
      return;
    }

    try {
      await login(email, password);
      // Get user from localStorage to check role
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Show success message
      setSuccess(true);
      setSuccessMessage(`Welcome back, ${user.name || 'User'}! Redirecting...`);
      setError('');
      setIsLoading(false);
      
      // Navigate based on role after showing success message
      setTimeout(() => {
        if (user.role === 'ADMIN') {
          router.push('/admin');
        } else if (user.role === 'VENDOR') {
          router.push('/business-owner-dashboard');
        } else {
          router.push('/home');
        }
      }, 2000);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
      setSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Get API URL and normalize it
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7000';
    apiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
    
    // Ensure /api is included (NEXT_PUBLIC_API_URL might already have it)
    const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl}/api`;
    
    // Construct the full OAuth URL
    window.location.href = `${baseUrl}/auth/v1/google`;
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="flex min-h-screen h-auto overflow-visible md:flex-row flex-col">
      <div className="flex-1 flex items-center justify-center text-white relative md:min-h-[300px] overflow-hidden">
        <img 
          src="/Parola.jpg" 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover brightness-[0.6] z-0"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/40 z-[1]"></div>
        <div className="text-left p-10 z-10 relative">
          <h2 className="text-3xl font-light mb-2.5 tracking-[2px]">Discover</h2>
          <h1 className="text-5xl md:text-[3.5rem] font-bold leading-tight tracking-[3px]">CORDOVA'S<br />LOCAL TREASURE</h1>
        </div>
      </div>
      <div className="flex-1 bg-gray-50 flex flex-col p-10 overflow-y-visible overflow-x-hidden justify-start min-h-screen md:p-[30px_20px]">
        <div className="flex items-center gap-4 mb-15">
          <img src="logo.jpg" alt="Logo" className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3c72] to-[#2a5298]" />
          <h3 className="text-2xl text-[#1e3c72] font-semibold">LOCAFY</h3>
        </div>
        <div className="max-w-[450px] w-full mx-auto relative box-border flex flex-col py-5">
          <button className="absolute top-0 left-0 bg-transparent border-none text-[#1e3c72] cursor-pointer p-2.5 flex items-center justify-center rounded-full transition-all duration-300 ease-in-out z-10 hover:bg-[#1e3c72]/10 hover:-translate-x-1" onClick={handleBack}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2 className="text-4xl mb-2.5 text-[#1a1a1a] text-center">WELCOME!</h2>
          <p className="text-center text-gray-600 mb-10 text-[0.95rem]">sign in to LOCAFY</p>
          
          {success && (
            <div className="flex items-center justify-center py-3 px-4 mb-4 bg-green-100 text-green-800 border border-green-200 rounded-lg text-[0.95rem] font-medium animate-slide-in">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="mr-2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              {successMessage}
            </div>
          )}
          
          {error && (
            <div className="py-3 px-4 mb-4 bg-red-100 text-red-800 border border-red-200 rounded-lg text-[0.95rem] text-center animate-slide-in">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="w-full box-border flex flex-col pb-10 mb-5">
            <div className="mb-5">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={success || isLoading}
                className="w-full py-4 px-5 border-2 border-gray-300 rounded-xl text-base transition-colors bg-white focus:outline-none focus:border-[#1e3c72] disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <div className="mb-5 relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={success || isLoading}
                className="w-full py-4 px-5 pr-12 border-2 border-gray-300 rounded-xl text-base transition-colors bg-white focus:outline-none focus:border-[#1e3c72] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-600 p-1.5 flex items-center justify-center transition-colors hover:text-[#1e3c72] focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            
            <Link href="/forgot-password" className="block text-right text-red-600 no-underline text-sm mb-7.5 -mt-2.5 hover:underline">
              Forgot password?
            </Link>
            
            <div className="text-center my-7.5 relative">
              <span className="bg-gray-50 px-4 text-gray-600 text-sm relative z-10">or</span>
              <div className="absolute top-1/2 left-0 w-[40%] h-px bg-gray-300"></div>
              <div className="absolute top-1/2 right-0 w-[40%] h-px bg-gray-300"></div>
            </div>
            
            <button type="button" className="w-full py-4 border-2 border-gray-300 rounded-xl bg-white text-base cursor-pointer flex items-center justify-center gap-2.5 mb-5 transition-all duration-300 box-border hover:bg-gray-50 hover:border-[#1e3c72] disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleGoogleLogin} disabled={success || isLoading}>
              <span className="font-bold text-[#4285f4] text-xl">G</span>
              Login with Google
            </button>
            
            <button type="submit" className="w-full py-4 border-none rounded-xl bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white text-lg font-semibold cursor-pointer transition-all duration-200 box-border block m-0 min-h-[54px] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(15,76,117,0.3)] disabled:opacity-50 disabled:cursor-not-allowed" disabled={success || isLoading}>
              {isLoading ? 'Logging in...' : success ? 'Redirecting...' : 'Login'}
            </button>
          </form>
          
          <p className="text-center mt-5 mb-5 text-gray-600 text-[0.95rem] pb-5">
            Don't have an account? <Link href="/register" className="text-red-600 no-underline font-semibold hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-[#1e3c72] rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}