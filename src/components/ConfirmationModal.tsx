'use client';

import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonStyle?: 'danger' | 'primary';
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  confirmButtonStyle = 'primary'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const confirmButtonClass = confirmButtonStyle === 'danger'
    ? 'bg-red-500 hover:bg-red-600'
    : 'bg-[#6ab8d8] hover:bg-[#5aa8c8]';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#2a2a2a] rounded-[20px] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] max-w-md w-full p-6 sm:p-8 relative animate-scale-in">
        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-3">{title}</h2>

        {/* Message */}
        <p className="text-white/70 text-center mb-6 leading-relaxed">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 bg-[#1a1a1a] border border-white/10 text-white rounded-lg font-medium hover:bg-[#2a2a2a] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 ${confirmButtonClass} text-white rounded-lg font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
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

