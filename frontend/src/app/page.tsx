'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RootPage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
    } else if (!userData) {
      router.replace('/connect-wallet');
    } else {
      router.replace('/home');
    }
  }, [user, userData, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
      <div className="w-10 h-10 border-4 border-[#FFC940] border-t-transparent rounded-full animate-spin" />
    </div>
  );

}
