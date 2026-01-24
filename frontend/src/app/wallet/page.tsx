'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { IoAddCircleOutline, IoSwapHorizontalOutline, IoWalletOutline, IoRefreshOutline, IoSwapVerticalOutline } from 'react-icons/io5';
import SwapModal from '@/components/SwapModal';
import AddAssetModal from '@/components/AddAssetModal';
import SelfTransferModal from '@/components/SelfTransferModal';
import BackgroundPattern from '@/components/BackgroundPattern';

interface AssetBalance {
  assetType: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  assetCode: string;
  assetIssuer: string | null;
  balance: string;
  limit: string | null;
}

interface WalletDetails {
  accountId: string;
  sequence: string;
  balances: AssetBalance[];
  signers: any[];
  flags: any;
}

export default function WalletPage() {
  const { user, userData } = useAuth();
  const router = useRouter();

  const [walletDetails, setWalletDetails] = useState<WalletDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fundLoading, setFundLoading] = useState(false);
  const [fundSuccess, setFundSuccess] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showSelfTransferModal, setShowSelfTransferModal] = useState(false);

  useEffect(() => {
    if (!user) router.push('/login');
    else if (!userData) router.push('/connect-wallet');
  }, [user, userData, router]);

  const fetchWalletDetails = async () => {
    if (!userData?.primaryWallet) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`https://stellix-backend.vercel.app/api/wallet/details/${userData.primaryWallet}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallet details');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setWalletDetails(result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error fetching wallet details:', err);
      setError(err.message || 'Failed to load wallet details');
    } finally {
      setLoading(false);
    }
  };

  const handleFund = async () => {
    if (!userData?.primaryWallet) return;

    setFundLoading(true);
    setError('');
    setFundSuccess(false);

    try {
      const response = await fetch('https://stellix-backend.vercel.app/api/wallet/fund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: userData.primaryWallet,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to find path for swap');
      }

      setFundSuccess(true);
      
      // Refresh wallet details after funding
      setTimeout(() => {
        fetchWalletDetails();
        setFundSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error funding wallet:', err);
      setError(err.message || 'Failed to fund wallet');
    } finally {
      setFundLoading(false);
    }
  };

  const handleSwapSuccess = () => {
    setShowSwapModal(false);
    fetchWalletDetails();
  };

  const handleAddAssetSuccess = () => {
    setShowAddAssetModal(false);
    fetchWalletDetails();
  };

  const handleSelfTransferSuccess = () => {
    setShowSelfTransferModal(false);
    fetchWalletDetails();
  };

  useEffect(() => {
    if (userData?.primaryWallet) {
      fetchWalletDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.primaryWallet]);

  if (!user || !userData) return null;

  const xlmBalance = walletDetails?.balances.find(b => b.assetType === 'native');
  const otherBalances = walletDetails?.balances.filter(b => b.assetType !== 'native') || [];

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (!isFinite(num)) return balance;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 7 });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] relative">
      <BackgroundPattern />

      <div className="relative z-10 p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Wallet</h1>
          <button
            onClick={fetchWalletDetails}
            disabled={loading}
            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            title="Refresh"
          >
            <IoRefreshOutline className={`text-xl text-gray-700 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* XLM Balance - Hero Card */}
        <div className="rounded-3xl bg-black border border-gray-900 shadow-lg overflow-hidden relative">
          <div className="absolute -top-28 -right-24 w-72 h-72 rounded-full bg-[#FFC940] opacity-25 blur-2xl" />
          <div className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-white opacity-10 blur-2xl" />

          <div className="p-6 relative">
            <div className="flex items-center gap-2 mb-3">
              <IoWalletOutline className="text-2xl text-white/70" />
              <p className="text-sm text-white/70">Total Balance</p>
            </div>

            {loading && !walletDetails ? (
              <div className="flex items-center gap-3 py-4">
                <div className="w-8 h-8 border-4 border-[#FFC940] border-t-transparent rounded-full animate-spin" />
                <p className="text-white/70">Loading balance...</p>
              </div>
            ) : xlmBalance ? (
              <>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-5xl font-extrabold text-[#FFC940]">
                    {formatBalance(xlmBalance.balance)}
                  </h2>
                  <span className="text-2xl font-bold text-white/90">XLM</span>
                </div>
                <p className="text-xs text-white/50 mt-2 font-mono break-all">
                  {walletDetails?.accountId}
                </p>
              </>
            ) : (
              <p className="text-white/70 py-4">No balance data available</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => setShowAddAssetModal(true)}
            className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-[#FFC940] flex items-center justify-center">
                <IoAddCircleOutline className="text-2xl text-black" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Add</span>
            </div>
          </button>

          <button
            onClick={() => setShowSwapModal(true)}
            className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                <IoSwapHorizontalOutline className="text-2xl text-[#FFC940]" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Swap</span>
            </div>
          </button>

          <button
            onClick={() => setShowSelfTransferModal(true)}
            disabled={!userData?.walletAddresses || userData.walletAddresses.length < 2}
            className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center">
                <IoSwapVerticalOutline className="text-2xl text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Self</span>
            </div>
          </button>

          <button
            onClick={handleFund}
            disabled={fundLoading}
            className="bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex flex-col items-center gap-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                fundSuccess ? 'bg-green-600' : 'bg-gray-900'
              }`}>
                {fundLoading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IoWalletOutline className="text-2xl text-white" />
                )}
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {fundSuccess ? 'Funded!' : 'Fund'}
              </span>
            </div>
          </button>
        </div>

        {/* Other Assets */}
        {otherBalances.length > 0 && (
          <div className="rounded-3xl bg-white border border-gray-200 shadow-md overflow-hidden">
            <div className="p-5">
              <h3 className="text-lg font-extrabold text-gray-900 mb-4">Other Assets</h3>
              
              <div className="space-y-3">
                {otherBalances.map((asset, index) => (
                  <div
                    key={`${asset.assetCode}-${asset.assetIssuer}-${index}`}
                    className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-2xl"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900">{asset.assetCode}</p>
                    </div>
                    <div className="text-right pl-3">
                      <p className="text-xl font-extrabold text-gray-900">
                        {formatBalance(asset.balance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom nav safe spacing */}
        <div className="h-24" />
      </div>

      <SwapModal
        isOpen={showSwapModal}
        onClose={() => setShowSwapModal(false)}
        availableAssets={walletDetails?.balances.map(b => ({
          code: b.assetCode,
          issuer: b.assetIssuer,
          balance: b.balance,
        })) || []}
        secretKey={userData?.primarySecret || ''}
        onSwapSuccess={handleSwapSuccess}
      />

      <AddAssetModal
        isOpen={showAddAssetModal}
        onClose={() => setShowAddAssetModal(false)}
        secretKey={userData?.primarySecret || ''}
        onAddSuccess={handleAddAssetSuccess}
      />

      <SelfTransferModal
        isOpen={showSelfTransferModal}
        onClose={() => setShowSelfTransferModal(false)}
        wallets={userData?.walletAddresses.map((address, idx) => ({
          address,
          secret: userData.walletSecrets[idx],
        })) || []}
        availableAssets={walletDetails?.balances.map(b => ({
          code: b.assetCode,
          issuer: b.assetIssuer,
          balance: b.balance,
        })) || []}
        onTransferSuccess={handleSelfTransferSuccess}
      />
    </div>
  );
}
