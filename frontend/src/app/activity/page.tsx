'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { IoRefreshOutline, IoChevronDownOutline } from 'react-icons/io5';
import { FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import BackgroundPattern from '@/components/BackgroundPattern';

const TX_API_BASE = 'https://stellix-backend.vercel.app/api/transaction/history';

type HistoryItem = {
  id: string;
  transactionHash: string;
  type: string;
  direction: 'sent' | 'received';
  from?: string;
  to?: string;
  amount?: string;
  assetCode?: string;
  assetIssuer?: string | null;
  createdAt: string;
  memo?: string | null;
  memoType?: string;
  pagingToken?: string;
};

type HistoryResponseGlobal = {
  success: boolean;
  publicKey: string;
  count: number;
  nextCursor: string | null;
  data: HistoryItem[];
};

function shortKey(pk?: string) {
  if (!pk) return '';
  if (pk.length <= 12) return pk;
  return `${pk.slice(0, 6)}...${pk.slice(-6)}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : iso;
}

function fmtAmount(a?: string) {
  if (!a) return '-';
  const n = Number(a);
  if (!Number.isFinite(n)) return a;
  return n.toFixed(7).replace(/\.?0+$/, '');
}

async function fetchGlobalHistory(publicKey: string, cursor?: string | null) {
  const url = cursor
    ? `${TX_API_BASE}/global/${publicKey}?cursor=${encodeURIComponent(cursor)}`
    : `${TX_API_BASE}/global/${publicKey}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Global history failed (${res.status})`);
  return (await res.json()) as HistoryResponseGlobal;
}

export default function ActivityPage() {
  const { user, userData } = useAuth();
  const router = useRouter();

  const [txs, setTxs] = useState<HistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) router.push('/login');
    else if (!userData) router.push('/connect-wallet');
  }, [user, userData, router]);

  const refresh = async () => {
    if (!userData?.primaryWallet) return;
    setLoading(true);
    setError('');

    try {
      const g = await fetchGlobalHistory(userData.primaryWallet, null);
      setTxs(g.data || []);
      setNextCursor(g.nextCursor || null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!userData?.primaryWallet || !nextCursor) return;
    setLoading(true);
    setError('');

    try {
      const g = await fetchGlobalHistory(userData.primaryWallet, nextCursor);
      setTxs((prev) => [...prev, ...(g.data || [])]);
      setNextCursor(g.nextCursor || null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load more');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.primaryWallet) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.primaryWallet]);

  if (!user || !userData) return null;

  const renderTxRow = (tx: HistoryItem, idx: number) => {
    const isSent = tx.direction === 'sent';
    const sign = isSent ? '-' : '+';

    return (
      <div
        key={tx.transactionHash || tx.id || `${idx}`}
        className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isSent ? (
              <FaChevronRight className="text-red-600" />
            ) : (
              <FaChevronLeft className="text-green-600" />
            )}
            <p className="font-semibold text-gray-900">{isSent ? 'Sent' : 'Received'}</p>
          </div>
          <p className="text-xs text-gray-600">{fmtDate(tx.createdAt)}</p>

          <p className="text-[11px] text-gray-500 mt-1 break-all">
            {shortKey(tx.from)} → {shortKey(tx.to)}
          </p>

          <p className="text-[11px] text-gray-500 mt-1 break-all">
            {tx.transactionHash}
          </p>

          {tx.memoType === 'text' && tx.memo && (
            <p className="text-[11px] text-gray-600 mt-1 break-all">
              Memo: {tx.memo}
            </p>
          )}
        </div>

        <div className="text-right pl-3">
          <p className={`font-bold ${isSent ? 'text-red-600' : 'text-green-600'}`}>
            {sign}{fmtAmount(tx.amount)} {tx.assetCode || 'XLM'}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">{tx.type}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4 relative">
      <BackgroundPattern />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Activity</h1>

        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold"
        >
          <IoRefreshOutline />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm mb-3">
          {error}
        </div>
      )}

      {loading && txs.length === 0 ? (
        <div className="text-center py-10 text-gray-500">Loading...</div>
      ) : txs.length > 0 ? (
        <div className="space-y-2">
          {txs.map(renderTxRow)}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">No transactions found</div>
      )}

      {nextCursor && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full mt-4 py-3 bg-white border border-gray-200 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <IoChevronDownOutline />
          Load more
        </button>
      )}
      </div>
    </div>
  );
}
