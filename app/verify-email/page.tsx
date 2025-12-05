'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../src/services/api';

function VerifyEmailContent() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const response = await api.verifyEmail(token);
        
        if (response.status === 'success') {
          setStatus('success');
          setMessage(response.message || 'Email verified successfully! You can now log in.');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.message || 'Email verification failed. The link may have expired.');
        }
      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(error.response?.data?.message || error.message || 'Email verification failed. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

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
        <div className="flex items-center gap-4 mb-8 sm:mb-12 md:mb-[60px]">
          <img src="/logo.jpg" alt="Logo" className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3c72] to-[#2a5298]" />
          <h3 className="text-2xl text-[#1e3c72] font-semibold">LOCAFY</h3>
        </div>
        <div className="max-w-[450px] w-full mx-auto relative box-border flex flex-col py-5">
          {status === 'loading' && (
            <div className="text-center py-10 px-5">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#1e3c72] to-[#2a5298] rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(30,60,114,0.3)] animate-spin">
                <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full"></div>
              </div>
              <h2 className="text-[#1e3c72] mb-4 text-3xl font-bold">Verifying Email</h2>
              <p className="text-gray-600 text-base">Please wait while we verify your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-10 px-5 animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-600 to-green-500 rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(39,174,96,0.3)] animate-scale-in">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h2 className="text-green-600 mb-4 text-3xl font-bold">Email Verified!</h2>
              <p className="text-gray-600 mb-8 text-base leading-relaxed max-w-[400px] mx-auto">
                {message}
              </p>
              <p className="text-gray-500 text-sm mb-6">Redirecting to login page...</p>
              <Link href="/login" className="inline-block py-3 px-8 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white no-underline rounded-xl font-semibold transition-all duration-200 w-full max-w-[300px] text-center hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(15,76,117,0.3)] mx-auto">
                Go to Login
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-10 px-5 animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(239,68,68,0.3)] animate-scale-in">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h2 className="text-red-600 mb-4 text-3xl font-bold">Verification Failed</h2>
              <p className="text-gray-600 mb-8 text-base leading-relaxed max-w-[400px] mx-auto">
                {message}
              </p>
              <div className="flex flex-col gap-3 items-center">
                <Link href="/register" className="inline-block py-3 px-8 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white no-underline rounded-xl font-semibold transition-all duration-200 w-full max-w-[300px] text-center hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(15,76,117,0.3)]">
                  Register Again
                </Link>
                <Link href="/login" className="inline-block py-3 px-8 bg-transparent text-[#1e3c72] border-2 border-[#1e3c72] rounded-xl font-semibold no-underline transition-all duration-300 w-full max-w-[300px] text-center text-[0.95rem] hover:bg-[#1e3c72] hover:text-white hover:-translate-y-0.5">
                  Go to Login
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-[#1e3c72] rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

