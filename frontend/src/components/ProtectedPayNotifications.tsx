'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { databases, Query } from '@/lib/appwrite';
import ProtectedPayVerificationModal from './ProtectedPayVerificationModal';
import { IoNotificationsOutline, IoClose } from 'react-icons/io5';

type EscrowMetadata = {
  $id: string;
  payment_id: string;
  sender: string;
  receiver: string;
  asset_code: string;
  asset_issuer: string | null;
  amount: string;
  status: string;
  created_at?: string;
  expires_at?: string;
};

type PendingPayment = {
  payment_id: string;
  sender: string;
  receiver: string;
  amount: string;
  asset: string;
  status: string;
  created_at?: string;
  expires_at?: string;
};

function fmt(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : iso;
}

export default function ProtectedPayNotifications() {
  const { userData } = useAuth();

  const [pending, setPending] = useState<PendingPayment[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<PendingPayment | null>(null);
  const [claiming, setClaiming] = useState<PendingPayment | null>(null);

  const seenRef = useRef(new Set<string>());

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const escrowColId = process.env.NEXT_PUBLIC_APPWRITE_ESCROW_METADATA_ID!;

  useEffect(() => {
    if (!userData?.primaryWallet) return;

    const poll = async () => {
      try {
        const res = await databases.listDocuments(dbId, escrowColId, [
          Query.equal('receiver', userData.primaryWallet),
          Query.equal('status', 'pending'),
          Query.orderDesc('created_at'),
          Query.limit(50),
        ]);

        const rows = (res.documents as any[]).map((d) => d as EscrowMetadata);

        const mapped: PendingPayment[] = rows.map((x) => ({
          payment_id: x.payment_id,
          sender: x.sender,
          receiver: x.receiver,
          amount: x.amount,
          asset: x.asset_code,
          status: x.status,
          created_at: x.created_at,
          expires_at: x.expires_at,
        }));

        // Toast only for new payments
        for (const p of mapped) {
          if (!seenRef.current.has(p.payment_id)) {
            seenRef.current.add(p.payment_id);
            setToast(p);
            window.setTimeout(() => setToast(null), 3200);
          }
        }

        setPending(mapped);
      } catch (e) {
        console.error('ProtectedPay poll error:', e);
      }
    };

    poll();
    const id = window.setInterval(poll, 5000);
    return () => window.clearInterval(id);
  }, [userData?.primaryWallet, dbId, escrowColId]);

  const items = useMemo(() => {
    return [...pending].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  }, [pending]);

  const count = items.length;

  if (!userData?.primaryWallet) return null;

  return (
    <>
      {/* Toast (top, non-blocking) */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-24px)] max-w-md">
          <div className="rounded-3xl bg-black border border-white/10 shadow-lg px-4 py-3 flex items-start gap-3 text-[#FFC940]">
            <IoNotificationsOutline size={20} className="mt-[2px]" />
            <div className="min-w-0">
              <p className="font-extrabold text-sm">Protected Pay received</p>
              <p className="text-xs opacity-90 truncate">
                {toast.amount} {toast.asset} from {toast.sender}
              </p>
              <button
                className="text-xs underline mt-1 opacity-90"
                onClick={() => {
                  setDrawerOpen(true);
                  setToast(null);
                }}
              >
                View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating pill button – ABOVE your bottom nav */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="
          fixed right-3 z-[80]
          bottom-[calc(env(safe-area-inset-bottom)+102px)]
          rounded-full bg-black text-[#FFC940]
          shadow-lg border border-white/10
          px-4 py-3 flex items-center gap-2
          active:scale-[0.98]
        "
        aria-label="Open Protected Pay inbox"
      >
        <IoNotificationsOutline size={18} />
        <span className="text-sm font-extrabold">Protected</span>
        {count > 0 && (
          <span className="ml-1 bg-[#FFC940] text-black text-xs font-extrabold rounded-full px-2 py-[2px]">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Drawer (mobile-only) */}
      <div
        className={[
          'fixed inset-0 z-[85] transition-opacity',
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30"
          onClick={() => setDrawerOpen(false)}
        />

        {/* Panel */}
        <div
          className={[
            'absolute top-0 right-0 h-full w-[86%] max-w-[420px]',
            'bg-[#f5f5f5] border-l border-gray-200 shadow-2xl',
            'transition-transform duration-200 ease-out',
            drawerOpen ? 'translate-x-0' : 'translate-x-full',
          ].join(' ')}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hero header to match your app */}
          <div className="p-4">
            <div className="rounded-3xl bg-black border border-gray-900 shadow-lg overflow-hidden relative">
              <div className="absolute -top-24 -right-20 w-60 h-60 rounded-full bg-[#FFC940] opacity-25 blur-2xl" />
              <div className="absolute -bottom-24 -left-20 w-60 h-60 rounded-full bg-white opacity-10 blur-2xl" />

              <div className="p-4 relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-white/70">Inbox</p>
                    <p className="text-xl font-extrabold text-[#FFC940]">Protected Pay</p>

                    <div className="mt-2 inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-2xl px-3 py-2">
                      <span className="text-xs text-white/70">Pending</span>
                      <span className="text-sm font-extrabold text-white">{count}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center active:scale-[0.98]"
                    aria-label="Close"
                  >
                    <IoClose size={20} />
                  </button>
                </div>

                <p className="mt-3 text-xs text-white/70 leading-snug">
                  You can claim anytime before expiry. OTP is required only when you’re ready.
                </p>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="px-4 pb-4 overflow-auto h-[calc(100vh-132px)]">
            {items.length === 0 ? (
              <div className="rounded-3xl bg-white border border-gray-200 shadow-md p-5 text-center text-gray-500">
                No pending protected payments
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((p) => (
                  <div
                    key={p.payment_id}
                    className="rounded-3xl bg-white border border-gray-200 shadow-md overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-lg font-extrabold text-gray-900">
                            {p.amount} {p.asset}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 break-all">
                            From: {p.sender}
                          </p>
                          {p.created_at && (
                            <p className="text-[11px] text-gray-500 mt-2">
                              Received: {fmt(p.created_at)}
                            </p>
                          )}
                          {p.expires_at && (
                            <p className="text-[11px] text-gray-500 mt-1">
                              Expires: {fmt(p.expires_at)}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => setClaiming(p)}
                          className="shrink-0 rounded-2xl bg-black text-[#FFC940] px-4 py-3 text-sm font-extrabold active:scale-[0.98]"
                        >
                          Claim
                        </button>
                      </div>

                      <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-200 p-4">
                        <p className="text-[11px] text-gray-500">Payment ID</p>
                        <p className="text-[11px] font-mono text-gray-800 break-all mt-1">
                          {p.payment_id}
                        </p>

                        <button
                          onClick={() => navigator.clipboard?.writeText(p.payment_id)}
                          className="mt-3 text-xs font-bold text-gray-700"
                        >
                          Copy Payment ID
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Safe space for bottom nav */}
            <div className="h-28" />
          </div>
        </div>
      </div>

      {/* Claim modal only when user taps claim */}
      {claiming && (
        <ProtectedPayVerificationModal
          isOpen={true}
          onClose={() => setClaiming(null)}
          paymentData={{
            payment_id: claiming.payment_id,
            sender: claiming.sender,
            amount: claiming.amount,
            asset: claiming.asset,
          }}
          onVerificationSuccess={() => {
            setPending((prev) => prev.filter((x) => x.payment_id !== claiming.payment_id));
            setClaiming(null);
          }}
        />
      )}
    </>
  );
}
