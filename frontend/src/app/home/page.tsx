'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedPayNotifications from '@/components/ProtectedPayNotifications';
import QRDisplayModal from '@/components/QRDisplayModal';
import { databases, Query } from '@/lib/appwrite';
import BackgroundPattern from '@/components/BackgroundPattern';
import {
  IoShieldCheckmarkOutline,
  IoWalletOutline,
  IoChevronForwardOutline,
  IoCheckmarkCircle,
  IoWarningOutline,
  IoPulseOutline,
  IoQrCodeOutline,
} from 'react-icons/io5';
import { FaUserCircle } from 'react-icons/fa';

function greetingFromHour() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function shortKey(pk?: string) {
  if (!pk) return '';
  if (pk.length <= 12) return pk;
  return `${pk.slice(0, 6)}...${pk.slice(-6)}`;
}

export default function HomePage() {
  const { user, userData } = useAuth();
  const router = useRouter();

  const greeting = useMemo(() => greetingFromHour(), []);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [showQRDisplay, setShowQRDisplay] = useState(false);

  useEffect(() => {
    if (!user) router.push('/login');
    else if (!userData) router.push('/connect-wallet');
  }, [user, userData, router]);

  // Meaningful “Inbox”: pending Protected Pay requests for me
  useEffect(() => {
    const meEmail = userData?.email;
    if (!meEmail) return;

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const colId = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID!;

    let alive = true;

    (async () => {
      setPendingLoading(true);
      try {
        const res = await databases.listDocuments(dbId, colId, [
          Query.equal('toUserEmail', meEmail),
          Query.equal('paymentType', 'secure'),
          Query.equal('status', 'otp_committed'),
          Query.limit(25),
        ]);

        if (!alive) return;
        setPendingCount(res.total ?? res.documents.length ?? 0);
      } catch {
        if (!alive) return;
        setPendingCount(0);
      } finally {
        if (!alive) return;
        setPendingLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [userData?.email]);

  if (!user || !userData) return null;

  const wallets = userData.walletAddresses?.length || 0;
  const hasWallet = !!userData.primaryWallet;

  return (
    <div className="min-h-screen bg-[#f5f5f5] relative">
      <ProtectedPayNotifications />

      <BackgroundPattern />

      <div className="relative z-10 p-4 space-y-4">
        {/* Hero */}
        <div className="rounded-3xl bg-black border border-gray-900 shadow-lg overflow-hidden relative">
          <div className="absolute -top-28 -right-24 w-72 h-72 rounded-full bg-[#FFC940] opacity-25 blur-2xl" />
          <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-white opacity-10 blur-2xl" />

          <div className="p-5 relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white/70">{greeting}</p>
                <h1 className="text-2xl font-extrabold text-[#FFC940] truncate">
                  {userData.name?.trim() ? userData.name : 'sUPI User'}
                </h1>

                <div className="mt-3 inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-2xl px-3 py-2 max-w-full">
                  <span className="text-xs text-white/70 shrink-0">sUPI ID</span>
                  <span className="text-sm font-mono font-bold text-white break-all">
                    {userData.supid}
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push('/profile')}
                className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 text-white flex items-center justify-center active:scale-[0.98]"
                title="Profile"
              >
                <FaUserCircle className="text-3xl" />
              </button>
            </div>

            {/* Status row */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white p-4 border border-gray-200 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">Wallet</p>
                  <IoWalletOutline className="text-xl text-gray-700 shrink-0" />
                </div>

                <div className="mt-2 flex items-center gap-2 min-w-0">
                  {hasWallet ? (
                    <IoCheckmarkCircle className="text-green-600 shrink-0" />
                  ) : (
                    <IoWarningOutline className="text-orange-500 shrink-0" />
                  )}
                  <p className="text-sm font-extrabold text-gray-900 truncate">
                    {hasWallet ? 'Linked' : 'Not linked'}
                  </p>
                </div>

                <p className="text-[11px] text-gray-500 mt-1 font-mono break-all leading-snug">
                  {hasWallet ? shortKey(userData.primaryWallet) : '—'}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Security</p>
                  <IoShieldCheckmarkOutline className="text-xl text-gray-700" />
                </div>
                <p className="mt-2 text-sm font-extrabold text-gray-900">Protected Pay</p>
                <p className="text-[11px] text-gray-500 mt-1">OTP release enabled</p>
              </div>
            </div>

            {/* Show QR Button */}
            <div className="mt-4">
              <button
                onClick={() => setShowQRDisplay(true)}
                className="w-full rounded-2xl bg-[#FFC940] p-4 border border-[#FFD966] active:scale-[0.98] transition-transform flex items-center justify-center gap-3"
              >
                <IoQrCodeOutline className="text-2xl text-black" />
                <span className="text-sm font-extrabold text-black">Show My QR Code</span>
              </button>
            </div>
          </div>
        </div>

        {/* Inbox / Pending */}
        <button
          onClick={() => router.push('/activity')}
          className="w-full text-left rounded-3xl bg-white border border-gray-200 shadow-md overflow-hidden active:scale-[0.995]"
        >
          <div className="p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-gray-900">Inbox</p>
              <p className="text-xs text-gray-500 mt-1">
                Protected Pay requests waiting for OTP verification
              </p>

              <div className="mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 bg-gray-50 border border-gray-200">
                {pendingLoading ? (
                  <span className="text-xs font-semibold text-gray-700">Checking…</span>
                ) : (
                  <>
                    <span className="text-xs text-gray-500">Pending</span>
                    <span className="text-sm font-extrabold text-gray-900">{pendingCount}</span>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Open</span>
              <IoChevronForwardOutline className="text-xl text-gray-700" />
            </div>
          </div>
        </button>

        {/* Guidance (actually useful, not fluff) */}
        <div className="rounded-3xl bg-white border border-gray-200 shadow-md overflow-hidden">
          <div className="p-5">
            <p className="text-lg font-extrabold text-gray-900">Quick tips</p>

            <div className="mt-3 space-y-3">
              <div className="rounded-2xl p-4 bg-gray-50 border border-gray-200">
                <p className="text-sm font-extrabold text-gray-900">Use sUPI ID to receive</p>
                <p className="text-xs text-gray-600 mt-1">
                  Share your sUPI ID with others so they can find you instantly in the Stellar Pay tab.
                </p>
              </div>

              <div className="rounded-2xl p-4 bg-[#FFFBF0] border border-[#FFC940]">
                <p className="text-sm font-extrabold text-gray-900">Protected Pay = safer handover</p>
                <p className="text-xs text-gray-700 mt-1">
                  Sender commits an encrypted signed payment. Receiver releases only after OTP is shared.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* bottom-nav safe spacing */}
        <div className="h-24" />
      </div>

      {/* QR Display Modal */}
      <QRDisplayModal
        isOpen={showQRDisplay}
        onClose={() => setShowQRDisplay(false)}
        supid={userData.supid}
        userName={userData.name}
      />
    </div>
  );
}
