'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { databases, Query } from '@/lib/appwrite';
import { FaUserCircle } from 'react-icons/fa';
import { IoChevronDownOutline, IoRefreshOutline } from 'react-icons/io5';
import DirectPaymentModal from '@/components/DirectPaymentModal';

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

type HistoryResponseP2P = {
  success: boolean;
  wallet1: string;
  wallet2: string;
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

async function fetchP2PHistory(pk1: string, pk2: string, cursor?: string | null) {
  const url = cursor
    ? `${TX_API_BASE}/p2p/${pk1}/${pk2}?cursor=${encodeURIComponent(cursor)}`
    : `${TX_API_BASE}/p2p/${pk1}/${pk2}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`P2P history failed (${res.status})`);
  return (await res.json()) as HistoryResponseP2P;
}

export default function PersonPage() {
  const { supid } = useParams<{ supid: string }>();
  const router = useRouter();
  const { user, userData } = useAuth();

  const decodedSupid = useMemo(() => decodeURIComponent(supid || ''), [supid]);

  const [person, setPerson] = useState<any>(null);
  const [personLoading, setPersonLoading] = useState(false);
  const [personError, setPersonError] = useState('');

  const [txs, setTxs] = useState<HistoryItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const [availableAssets, setAvailableAssets] = useState<Array<{ code: string; issuer: string | null; balance: string }>>([]);

  const [showDirect, setShowDirect] = useState(false);
  const [showSecure, setShowSecure] = useState(false);
  useEffect(() => {
    if (!user) router.push('/login');
    else if (!userData) router.push('/connect-wallet');
  }, [user, userData, router]);

  const loadPerson = async () => {
    setPersonLoading(true);
    setPersonError('');
    try {
      const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
      const usersCol = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;
      const res = await databases.listDocuments(dbId, usersCol, [
        Query.equal('supid', decodedSupid),
        Query.limit(1),
      ]);
      if (res.documents.length === 0) throw new Error('User not found');
      setPerson(res.documents[0] as any);
    } catch (e: any) {
      setPersonError(e?.message || 'Failed to load user');
      setPerson(null);
    } finally {
      setPersonLoading(false);
    }
  };

  const refreshP2P = async () => {
    if (!userData?.primaryWallet || !person?.primaryWallet) return;
    setTxLoading(true);
    setTxError('');
    try {
      const p = await fetchP2PHistory(userData.primaryWallet, person.primaryWallet, null);
      setTxs(p.data || []);
      setNextCursor(p.nextCursor || null);
    } catch (e: any) {
      setTxError(e?.message || 'Failed to load history');
    } finally {
      setTxLoading(false);
    }
  };

  const loadMore = async () => {
    if (!userData?.primaryWallet || !person?.primaryWallet || !nextCursor) return;
    setTxLoading(true);
    setTxError('');
    try {
      const p = await fetchP2PHistory(userData.primaryWallet, person.primaryWallet, nextCursor);
      setTxs((prev) => [...prev, ...(p.data || [])]);
      setNextCursor(p.nextCursor || null);
    } catch (e: any) {
      setTxError(e?.message || 'Failed to load more');
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (decodedSupid) loadPerson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedSupid]);

  useEffect(() => {
    if (person?.primaryWallet && userData?.primaryWallet) refreshP2P();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person?.primaryWallet, userData?.primaryWallet]);

  useEffect(() => {
    const fetchWalletAssets = async () => {
      if (!userData?.primaryWallet) return;
      try {
        const response = await fetch(`https://stellix-backend.vercel.app/api/wallet/details/${userData.primaryWallet}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data?.balances) {
            const assets = result.data.balances.map((b: any) => ({
              code: b.assetType === 'native' ? 'XLM' : b.assetCode,
              issuer: b.assetType === 'native' ? null : b.assetIssuer,
              balance: b.balance,
            }));
            setAvailableAssets(assets);
          }
        }
      } catch (err) {
        console.error('Failed to fetch assets:', err);
      }
    };
    fetchWalletAssets();
  }, [userData?.primaryWallet]);

  if (!user || !userData) return null;

  const renderTxRow = (tx: HistoryItem, idx: number) => {
    const isSent = tx.direction === 'sent';
    const label = isSent ? '→ Sent' : '← Received';
    const sign = isSent ? '-' : '+';

    return (
      <div
        key={tx.transactionHash || tx.id || `${idx}`}
        className="flex justify-between items-center p-3 bg-gray-50 border border-gray-200 rounded-lg"
      >
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{label}</p>
          <p className="text-xs text-gray-600">{fmtDate(tx.createdAt)}</p>
          <p className="text-[11px] text-gray-500 mt-1 break-all">
            {shortKey(tx.from)} → {shortKey(tx.to)}
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
    <div className="min-h-screen bg-[#f5f5f5] p-4">
      <button
        onClick={() => router.push('/pay')}
        className="text-sm font-semibold text-gray-700 mb-3"
      >
        ← Back
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        {personLoading ? (
          <div className="text-center text-gray-500 py-6">Loading...</div>
        ) : personError ? (
          <div className="text-center text-red-700 py-6">{personError}</div>
        ) : person ? (
          <>
            <div className="flex items-center gap-3">
              <FaUserCircle className="text-4xl text-gray-400" />
              <div className="min-w-0">
                <p className="text-lg font-bold text-gray-900 truncate">{person.name || 'User'}</p>
                <p className="text-sm text-gray-600 truncate">{person.supid}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setShowDirect(true)}
                className="py-3 rounded-xl bg-black text-[#FFC940] font-bold"
              >
                Pay Now
              </button>
              <button
                disabled
                className="py-3 rounded-xl bg-gray-200 text-gray-500 font-bold cursor-not-allowed opacity-50"
              >
                Protected Pay
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">History with this person</h2>
          <button
            onClick={refreshP2P}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold"
          >
            <IoRefreshOutline />
            Refresh
          </button>
        </div>

        {txError && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm mb-3">
            {txError}
          </div>
        )}

        {txLoading && txs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : txs.length > 0 ? (
          <div className="space-y-2">
            {txs.map(renderTxRow)}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No p2p transactions found</div>
        )}

        {nextCursor && (
          <button
            onClick={loadMore}
            disabled={txLoading}
            className="w-full mt-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <IoChevronDownOutline />
            Load more
          </button>
        )}
      </div>

      {person && (
        <DirectPaymentModal
          isOpen={showDirect}
          onClose={() => setShowDirect(false)}
          recipient={person}
          availableAssets={availableAssets}
        />
      )}
    </div>
  );
}
