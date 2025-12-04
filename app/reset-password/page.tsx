'use client';

// 1. Force this page to be dynamic (skips static generation)
export const dynamic = 'force-dynamic';

import React, { useState, FormEvent, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../src/services/api';

// 2. The component containing the logic (using useSearchParams)
function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.resetPassword(token, password);
      if (response.status === 'success') {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(response.message || 'Failed to reset password');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/login');
  };

  if (success) {
    return (
      <div className="flex h-screen overflow-hidden md:flex-col">
        <div className="flex-1 flex items-center justify-center text-white relative bg-gradient-to-br from-black/40 to-black/40 bg-cover bg-center bg-[url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80')] md:min-h-[300px]">
          <div className="text-left p-10 z-10">
            <h2 className="text-3xl font-light mb-2.5 tracking-[2px]">Discover</h2>
            <h1 className="text-5xl md:text-[3.5rem] font-bold leading-tight tracking-[3px]">CORDOVA'S<br />LOCAL TREASURE</h1>
          </div>
        </div>
        <div className="flex-1 bg-gray-50 flex flex-col p-10 overflow-y-auto md:p-[30px_20px]">
          <div className="flex items-center gap-4 mb-15">
            <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3c72] to-[#2a5298]" />
            <h3 className="text-2xl text-[#1e3c72] font-semibold">LOCAFY</h3>
          </div>
          <div className="max-w-[450px] w-full mx-auto flex flex-col justify-center flex-1 relative">
            <div className="text-center py-10 px-5 animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-600 to-green-500 rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(39,174,96,0.3)] animate-scale-in">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h2 className="text-green-600 mb-4 text-3xl font-bold">Password Reset Successful!</h2>
              <p className="text-gray-600 mb-6 text-base leading-relaxed">
                Your password has been reset successfully. You can now log in with your new password.
              </p>
              <p className="text-gray-600 mb-8 text-sm leading-relaxed">
                Redirecting to login page...
              </p>
              <Link href="/login" className="inline-block py-3.5 px-10 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white no-underline rounded-xl font-semibold transition-all duration-200 w-full max-w-[300px] text-center hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(15,76,117,0.3)]">
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden md:flex-col">
      <div className="flex-1 flex items-center justify-center text-white relative bg-gradient-to-br from-black/40 to-black/40 bg-cover bg-center bg-[url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80')] md:min-h-[300px]">
        <div className="text-left p-10 z-10">
          <h2 className="text-3xl font-light mb-2.5 tracking-[2px]">Discover</h2>
          <h1 className="text-5xl md:text-[3.5rem] font-bold leading-tight tracking-[3px]">CORDOVA'S<br />LOCAL TREASURE</h1>
        </div>
      </div>
      <div className="flex-1 bg-gray-50 flex flex-col p-10 overflow-y-auto md:p-[30px_20px]">
        <div className="flex items-center gap-4 mb-15">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3c72] to-[#2a5298]" />
          <h3 className="text-2xl text-[#1e3c72] font-semibold">LOCAFY</h3>
        </div>
        <div className="max-w-[450px] w-full mx-auto flex flex-col justify-center flex-1 relative">
          <button className="absolute top-0 left-0 bg-transparent border-none text-[#1e3c72] cursor-pointer p-2.5 flex items-center justify-center rounded-full transition-all duration-300 ease-in-out z-10 hover:bg-[#1e3c72]/10 hover:-translate-x-1" onClick={handleBack}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <h2 className="text-[2.2rem] mb-2.5 text-[#1a1a1a] text-center">RESET PASSWORD</h2>
          <p className="text-center text-gray-600 mb-10 text-[0.95rem]">Enter your new password</p>
          
          {error && (
            <div className="py-3 px-4 mb-4 bg-red-100 text-red-800 border border-red-200 rounded-lg text-sm text-center animate-slide-in">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-5 relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || !token}
                minLength={8}
                className="w-full py-4 px-5 pr-12 border-2 border-gray-300 rounded-xl text-base transition-colors bg-white focus:outline-none focus:border-[#1e3c72] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-600 p-1.5 flex items-center justify-center transition-colors hover:text-[#1e3c72] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isLoading || !token}
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
            
            <div className="mb-5 relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading || !token}
                minLength={8}
                className="w-full py-4 px-5 pr-12 border-2 border-gray-300 rounded-xl text-base transition-colors bg-white focus:outline-none focus:border-[#1e3c72] disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-600 p-1.5 flex items-center justify-center transition-colors hover:text-[#1e3c72] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                disabled={isLoading || !token}
              >
                {showConfirmPassword ? (
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
            
            <button type="submit" className="w-full py-4 border-none rounded-xl bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white text-lg font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(15,76,117,0.3)] disabled:opacity-60 disabled:cursor-not-allowed" disabled={isLoading || !token}>
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
          
          <p className="text-center mt-6 text-gray-600 text-[0.95rem]">
            Remember your password? <Link href="/login" className="text-[#1e3c72] no-underline font-semibold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// 3. Main export wrapped in Suspense
export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-xl text-[#1e3c72]">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}