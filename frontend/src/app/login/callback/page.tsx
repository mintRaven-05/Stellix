'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { account } from '@/lib/appwrite';

type CallbackState = 'pending' | 'success' | 'error';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>('pending');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userId = searchParams.get('userId');
  const secret = searchParams.get('secret');

  useEffect(() => {
    if (!userId || !secret) {
      setState('error');
      setErrorMessage('Missing OAuth credentials');
      return;
    }

    let cancelled = false;

    const finalize = async () => {
      try {
        // Create session from OAuth callback
        await account.createSession({ userId, secret });
        
        if (cancelled) return;

        setState('success');
        
        // Get the user and check if they have wallet data
        try {
          const currentUser = await account.get();
          
          // Check if user has userData in database
          const { databases, Query } = await import('@/lib/appwrite');
          const response = await databases.listDocuments(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
            [Query.equal('email', currentUser.email)]
          );
          
          // Dispatch auth change event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('appwrite-auth-change'));
          }
          
          // Navigate based on user data
          setTimeout(() => {
            if (response.documents.length > 0) {
              router.replace('/home');
            } else {
              router.replace('/connect-wallet');
            }
          }, 500);
        } catch (err) {
          console.error('Error checking user data:', err);
          // Fallback to connect-wallet if there's an error
          setTimeout(() => {
            router.replace('/connect-wallet');
          }, 500);
        }
      } catch (error) {
        if (cancelled) return;
        
        setState('error');
        const message = error instanceof Error ? error.message : 'Failed to complete Google authentication';
        setErrorMessage(message);
      }
    };

    finalize();

    return () => {
      cancelled = true;
    };
  }, [userId, secret, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] relative overflow-hidden">
      {/* Polkadot pattern background */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 relative z-10 border border-gray-200 text-center">
        {state === 'pending' && (
          <>
            <div className="w-16 h-16 border-4 border-[#FFC940] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Completing Sign-In</h1>
            <p className="text-gray-600">Finalizing your Google authentication...</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-16 h-16 bg-[#FFC940] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Success!</h1>
            <p className="text-gray-600">Redirecting you now...</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Authentication Failed</h1>
            <p className="text-gray-600 mb-4">{errorMessage || 'Unable to complete Google sign-in'}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 bg-black text-[#FFC940] rounded-lg font-semibold hover:bg-gray-900 transition-colors"
            >
              Return to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="w-16 h-16 border-4 border-[#FFC940] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
