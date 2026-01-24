'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import WalletManagementModal from '@/components/WalletManagementModal';
import BackgroundPattern from '@/components/BackgroundPattern';
import {
  IoArrowBackOutline,
  IoCopyOutline,
  IoCheckmarkCircle,
  IoLogOutOutline,
  IoWalletOutline,
} from 'react-icons/io5';
import { FaUserCircle } from 'react-icons/fa';

function shortKey(pk?: string) {
  if (!pk) return '';
  if (pk.length <= 12) return pk;
  return `${pk.slice(0, 6)}...${pk.slice(-6)}`;
}

export default function ProfilePage() {
  const { user, userData, logout } = useAuth();
  const router = useRouter();

  const [showWalletManagement, setShowWalletManagement] = useState(false);
  const [copied, setCopied] = useState(false);

  const primary = userData?.primaryWallet;

  const joined = useMemo(() => {
    const iso = userData?.dateCreated;
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d.toLocaleString() : iso;
  }, [userData?.dateCreated]);

  useEffect(() => {
    if (!user) router.push('/login');
    else if (!userData) router.push('/connect-wallet');
  }, [user, userData, router]);

  const copyPrimary = async () => {
    if (!primary) return;
    try {
      await navigator.clipboard.writeText(primary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user || !userData) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-4 relative">
      <BackgroundPattern />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.back()}
          className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center active:scale-[0.98]"
          title="Back"
        >
          <IoArrowBackOutline className="text-2xl text-gray-800" />
        </button>

        <h1 className="text-lg font-extrabold text-gray-900">Profile</h1>

        <button
          onClick={handleLogout}
          className="w-11 h-11 rounded-2xl bg-white border border-gray-200 flex items-center justify-center active:scale-[0.98]"
          title="Logout"
        >
          <IoLogOutOutline className="text-2xl text-gray-800" />
        </button>
      </div>

      {/* Profile Card */}
      <div className="rounded-3xl bg-white border border-gray-200 shadow-md overflow-hidden">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <FaUserCircle className="text-5xl text-gray-400" />
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-gray-900 truncate">
                {userData.name?.trim() ? userData.name : 'sUPI User'}
              </p>
              <p className="text-sm text-gray-600 truncate">{userData.email}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* sUPI ID (fixed overflow) */}
            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 min-w-0 overflow-hidden">
              <p className="text-xs text-gray-500">sUPI ID</p>
              <p className="text-sm font-mono font-bold text-gray-900 mt-1 break-all leading-snug">
                {userData.supid}
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 min-w-0 overflow-hidden">
              <p className="text-xs text-gray-500">Joined</p>
              <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{joined}</p>
            </div>
          </div>

          {/* Primary Wallet */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <IoWalletOutline className="text-xl text-gray-800 shrink-0" />
                <p className="text-sm font-extrabold text-gray-900 truncate">Primary wallet</p>
              </div>

              <button
                onClick={copyPrimary}
                className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-100 border border-gray-200 text-sm font-semibold text-gray-900"
              >
                {copied ? <IoCheckmarkCircle className="text-green-600" /> : <IoCopyOutline />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <p className="text-xs font-mono text-gray-700 mt-2 break-all">
              {primary || '—'}
            </p>

            <p className="text-[11px] text-gray-500 mt-2">
              Short: {primary ? shortKey(primary) : '—'}
            </p>
          </div>

          {/* Wallets list + manage */}
          <div className="mt-4 rounded-2xl bg-[#FFFBF0] border border-[#FFC940] p-4">
            <p className="text-sm font-extrabold text-gray-900">Wallets</p>
            <p className="text-xs text-gray-700 mt-1">
              Manage linked wallets and switch your primary wallet.
            </p>

            <div className="mt-3 space-y-2">
              {(userData.walletAddresses || []).map((w, i) => (
                <div
                  key={`${w}-${i}`}
                  className="rounded-2xl bg-white border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600">Wallet {i + 1}</p>
                    {w === primary && (
                      <span className="text-xs font-bold bg-[#FFC940] text-black px-2 py-1 rounded-full">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-gray-800 mt-2 break-all">{w}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowWalletManagement(true)}
              className="w-full mt-4 py-3 rounded-2xl bg-black text-[#FFC940] font-extrabold active:scale-[0.99]"
            >
              Manage wallets
            </button>
          </div>
        </div>
      </div>

      <WalletManagementModal
        isOpen={showWalletManagement}
        onClose={() => setShowWalletManagement(false)}
      />

      <div className="h-24" />
      </div>
    </div>
  );
}
