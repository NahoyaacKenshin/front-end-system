'use client';

import React from 'react';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  children?: React.ReactNode;
}

export default function SuccessModal({
  isOpen,
  title,
  message,
  onClose,
  showCloseButton = true,
  children
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#2a2a2a] rounded-[20px] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-w-md w-full p-6 sm:p-8 relative animate-scale-in">
        {/* Close Button */}
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors p-1"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        )}

        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(34,197,94,0.3)]">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="white" strokeWidth="3">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-3">{title}</h2>

        {/* Message */}
        <p className="text-white/70 text-center mb-6 leading-relaxed">{message}</p>

        {/* Additional Content */}
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

