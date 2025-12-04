'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import type { ServiceResponse } from '../../src/types';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuthData } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');
  const hasProcessedRef = useRef(false);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const processCallback = async () => {
      // Prevent duplicate processing
      if (hasProcessedRef.current || isProcessingRef.current) {
        return;
      }

      isProcessingRef.current = true;

      try {
        const code = searchParams?.get('code');
        const error = searchParams?.get('error');

        if (error) {
          setStatus('error');
          setMessage('Authentication failed. Please try again.');
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authentication code received. Please try logging in again.');
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        setStatus('processing');
        setMessage('Exchanging authentication code...');

        const response = await api.exchangeOAuthCode(code) as ServiceResponse;

        // Handle various response formats
        let success = false;
        let tokens = null;
        let userData = null;

        if (response.status === 'success' && response.data) {
          success = true;
          tokens = (response.data as any).tokens;
          userData = (response.data as any).user;
        } else if ((response as any).data?.status === 'success' && (response as any).data.data) {
          success = true;
          tokens = (response as any).data.data.tokens;
          userData = (response as any).data.data.user;
        } else if ((response as any).data?.data?.status === 'success' && (response as any).data.data.data) {
          success = true;
          tokens = (response as any).data.data.data.tokens;
          userData = (response as any).data.data.data.user;
        }

        if (success && tokens && userData) {
          // Set auth data before redirecting
          setAuthData(tokens, userData);
          hasProcessedRef.current = true;

          // Redirect to login page with success state, which will then redirect to the appropriate page
          router.push(`/login?oauth_success=true&name=${encodeURIComponent(userData.name || 'User')}&role=${userData.role}`);
        } else {
          throw new Error('Invalid response format from server');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        const errorMessage = err.response?.data?.message || err.message || 'Authentication failed';
        
        // Check for expired/invalid token error
        if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
          setStatus('error');
          setMessage('Authentication code expired or invalid. The server may have restarted. Please try logging in again.');
          // Auto-retry after showing error
          setTimeout(() => {
            window.location.href = '/login';
          }, 3000);
        } else {
          setStatus('error');
          setMessage(errorMessage);
          setTimeout(() => router.push('/login'), 3000);
        }
      } finally {
        isProcessingRef.current = false;
      }
    };

    processCallback();
  }, [searchParams, router, setAuthData]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{
        padding: '2rem',
        borderRadius: '8px',
        backgroundColor: status === 'error' ? '#fee' : '#eef',
        border: `1px solid ${status === 'error' ? '#fcc' : '#ccf'}`,
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '1rem' }}>
          {status === 'processing' && 'Processing...'}
          {status === 'error' && 'Error'}
        </h2>
        <p>{message}</p>
        {status === 'processing' && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #3498db',
              borderRadius: '50%',
              width: '30px',
              height: '30px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        Loading...
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}