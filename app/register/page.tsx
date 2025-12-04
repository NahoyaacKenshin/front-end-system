'use client';

import React, { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signup } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setVerificationSent(false);
    setIsLoading(true);

    try {
      await signup(name, email, password);
      setVerificationSent(true);
      setResendSuccess(false);
    } catch (err: any) {
      console.error('Signup error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      
      // Handle "email already exists" case
      if (errorMessage.includes('already') || errorMessage.includes('Email')) {
        setError('This email is already registered. Please login instead.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    setError('');

    try {
      const response = await api.resendEmailVerification(email);
      if (response.status === 'success') {
        setResendSuccess(true);
      } else {
        setError(response.message || 'Failed to resend verification email');
      }
    } catch (err: any) {
      console.error('Resend verification error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setResendLoading(false);
    }
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
        <div className="flex items-center gap-4 mb-8 sm:mb-12 md:mb-[60px]">
          <img src="logo.jpg" alt="Logo" className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1e3c72] to-[#2a5298]" />
          <h3 className="text-2xl text-[#1e3c72] font-semibold">LOCAFY</h3>
        </div>
        <div className="max-w-[450px] w-full mx-auto relative box-border flex flex-col py-5">
          <button className="absolute top-0 left-0 bg-transparent border-none text-[#1e3c72] cursor-pointer p-2.5 flex items-center justify-center rounded-full transition-all duration-300 ease-in-out z-10 hover:bg-[#1e3c72]/10 hover:-translate-x-1" onClick={handleBack}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          
          {!verificationSent ? (
            <>
              <h2 className="text-4xl mb-2.5 text-[#1a1a1a] text-center">WELCOME!</h2>
              <p className="text-center text-gray-600 mb-10 text-[0.95rem]">register to LOCAFY</p>
              
              {error && (
                <div className="py-3 px-4 mb-4 bg-red-100 text-red-800 border border-red-200 rounded-lg text-[0.95rem] text-center animate-slide-in">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="w-full box-border flex flex-col pb-10 mb-5">
                <div className="mb-5">
                  <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full py-4 px-5 border-2 border-gray-300 rounded-xl text-base transition-colors bg-white focus:outline-none focus:border-[#1e3c72]"
                  />
                </div>

                <div className="mb-5">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full py-4 px-5 border-2 border-gray-300 rounded-xl text-base transition-colors bg-white focus:outline-none focus:border-[#1e3c72]"
                  />
                </div>
                
                <div className="mb-5 relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full py-4 px-5 pr-12 border-2 border-gray-300 rounded-xl text-base transition-colors bg-white focus:outline-none focus:border-[#1e3c72]"
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
                
                <button type="submit" className="w-full py-4 border-none rounded-xl bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white text-lg font-semibold cursor-pointer transition-all duration-200 box-border block m-0 min-h-[54px] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(15,76,117,0.3)] disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
                  {isLoading ? 'Registering...' : 'Register'}
                </button>
              </form>
              
              <p className="text-center mt-5 mb-5 text-gray-600 text-[0.95rem] pb-5">
                Already have an account? <Link href="/login" className="text-red-600 no-underline font-semibold hover:underline">Log in</Link>
              </p>
            </>
          ) : (
            <div className="text-center py-10 px-5 animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#1e3c72] to-[#2a5298] rounded-full flex items-center justify-center text-white shadow-[0_4px_20px_rgba(30,60,114,0.3)] animate-scale-in">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </div>
              <h2 className="text-[#1e3c72] mb-4 text-3xl font-bold">Check Your Email</h2>
              <p className="text-gray-600 mb-2 text-base leading-relaxed">
                We've sent a verification link to
              </p>
              <p className="text-[#1e3c72] font-semibold text-lg mb-6 break-all">{email}</p>
              <p className="text-gray-600 mb-8 text-[0.95rem] leading-relaxed max-w-[400px] mx-auto">
                Please check your inbox and click on the link to verify your account. 
                The link will expire in 24 hours.
              </p>
              
              {error && (
                <div className="py-3 px-4 mb-4 bg-red-100 text-red-800 border border-red-200 rounded-lg text-[0.95rem] text-center animate-slide-in">
                  {error}
                </div>
              )}
              
              {resendSuccess && (
                <div className="py-3 px-4 mb-4 bg-green-100 text-[#27ae60] border border-green-200 rounded-lg text-[0.95rem] text-center animate-slide-in">
                  Verification email resent successfully!
                </div>
              )}
              
              <div className="flex flex-col gap-3 items-center">
                <button 
                  className="w-full max-w-[300px] py-3.5 px-8 bg-gradient-to-br from-[#0f4c75] to-[#1b627d] text-white border-none rounded-xl font-semibold cursor-pointer transition-all duration-200 text-base hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_6px_20px_rgba(15,76,117,0.3)] disabled:opacity-60 disabled:cursor-not-allowed" 
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                </button>
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
