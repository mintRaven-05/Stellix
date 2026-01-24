'use client';

import { useState } from 'react';
import { IoClose, IoWalletOutline, IoAddCircleOutline, IoCheckmarkCircle } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';

interface WalletManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WalletManagementModal({ isOpen, onClose }: WalletManagementModalProps) {
  const { userData, addWallet, setPrimaryWallet } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !userData) return null;

  const handleAddWallet = async () => {
    setLoading(true);
    setError('');

    try {
      await addWallet();
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (walletAddress: string) => {
    try {
      await setPrimaryWallet(walletAddress);
    } catch (err: any) {
      setError(err.message || 'Failed to set primary wallet');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto relative">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900">Manage Wallets</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <IoClose size={28} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Your Wallets</h4>
            {userData.walletAddresses.map((wallet, index) => (
              <div
                key={index}
                className={`border rounded-xl p-4 ${
                  wallet === userData.primaryWallet
                    ? 'border-[#FFC940] bg-yellow-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <IoWalletOutline className="text-gray-600" size={18} />
                      <span className="text-xs font-semibold text-gray-500">
                        Wallet {index + 1}
                      </span>
                      {wallet === userData.primaryWallet && (
                        <span className="bg-[#FFC940] text-black text-xs px-2 py-0.5 rounded-full font-semibold">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-gray-700 break-all">
                      {wallet}
                    </p>
                  </div>
                  {wallet !== userData.primaryWallet && (
                    <button
                      onClick={() => handleSetPrimary(wallet)}
                      className="ml-2 text-gray-400 hover:text-[#FFC940]"
                      title="Set as primary"
                    >
                      <IoCheckmarkCircle size={24} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddWallet}
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Wallet...
              </>
            ) : (
              <>
                <IoAddCircleOutline size={24} />
                Create New Wallet
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Click "Create New Wallet" to generate and link a new Stellar wallet to your sUPI account.
          </p>
        </div>
      </div>
    </div>
  );
}