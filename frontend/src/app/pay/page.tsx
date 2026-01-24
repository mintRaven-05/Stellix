'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { IoSearchOutline } from 'react-icons/io5';
import { FaUserCircle } from 'react-icons/fa';
import BackgroundPattern from '@/components/BackgroundPattern';

export default function PayPage() {
  const { user, userData, searchUsers } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) router.push('/login');
    else if (!userData) router.push('/connect-wallet');
  }, [user, userData, router]);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();

    if (!q) {
      setResults([]);
      return;
    }

    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchUsers(q);
        const filtered = r.filter((u: any) => u.email !== userData?.email);
        if (!cancelled) setResults(filtered as any[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchUsers, userData?.email]);

  if (!user || !userData) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4 relative">
      <BackgroundPattern />

      <div className="relative z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Pay</h1>

      <div className="relative mb-4">
        <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, or sUPI ID..."
          className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-[#FFC940] focus:outline-none text-gray-900"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Searching...</div>
        ) : results.length > 0 ? (
          results.map((u) => (
            <button
              key={u.$id || u.supid}
              onClick={() => router.push(`/pay/${encodeURIComponent(u.supid)}`)}
              className="w-full p-4 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left"
            >
              <div className="flex items-center gap-3">
                <FaUserCircle className="text-3xl text-gray-400" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{u.name || 'User'}</p>
                  <p className="text-sm text-gray-600 truncate">{u.supid}</p>
                </div>
              </div>
            </button>
          ))
        ) : query.trim() ? (
          <div className="p-4 text-center text-gray-500">No users found</div>
        ) : (
          <div className="p-4 text-center text-gray-500">Search to find someone</div>
        )}
      </div>
      </div>
    </div>
  );
}
