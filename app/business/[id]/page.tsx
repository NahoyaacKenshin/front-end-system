'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import BusinessProfile from '../../../src/components/BusinessProfile';

function BusinessDetailsContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const readOnly = mode === 'view';
  
  return <BusinessProfile businessId={params.id as string} readOnly={readOnly} />;
}

export default function BusinessDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="inline-block w-12 h-12 border-4 border-white/20 border-t-[#6ab8d8] rounded-full animate-spin"></div>
          <p className="mt-4 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <BusinessDetailsContent />
    </Suspense>
  );
}
