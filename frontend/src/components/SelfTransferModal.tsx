'use client';

import { useState } from 'react';
import { IoClose, IoSwapVerticalOutline } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';
import PinVerificationModal from './PinVerificationModal';

interface SelfTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Array<{ address: string; getSecret: () => Promise<string | null> }>;
  availableAssets: Array<{ code: string; issuer: string | null; balance: string }>;
  onTransferSuccess: () => void;
}

export default function SelfTransferModal({ 
  isOpen, 
  onClose, 
  wallets, 
  availableAssets,
  onTransferSuccess 
}: SelfTransferModalProps) {
  const { verifyPin } = useAuth();
  const [sourceWallet, setSourceWallet] = useState('');
  const [destinationWallet, setDestinationWallet] = useState('');
  const [asset, setAsset] = useState('XLM');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  if (!isOpen) return null;

  const handleTransferClick = () => {
    const amt = amount.trim();
    if (!amt || Number.isNaN(Number(amt)) || Number(amt) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (!sourceWallet) {
      setError('Select source wallet');
      return;
    }

    if (!destinationWallet) {
      setError('Select destination wallet');
      return;
    }

    if (sourceWallet === destinationWallet) {
      setError('Source and destination wallets must be different');
      return;
    }

    setError('');
    setShowPinModal(true);
  };

  const handlePinSuccess = async (pin: string) => {
    if (!verifyPin(pin)) {
      setError('Invalid PIN');
      setShowPinModal(false);
      return;
    }

    setShowPinModal(false);
    await processTransfer();
  };

  const processTransfer = async () => {
    const amt = amount.trim();
    
    // Find the source wallet and decrypt its secret
    const sourceWalletData = wallets.find(w => w.address === sourceWallet);
    if (!sourceWalletData) {
      setError('Source wallet not found');
      return;
    }

    const sourceSecret = await sourceWalletData.getSecret();
    if (!sourceSecret) {
      setError('Failed to retrieve source wallet secret');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://stellix-backend.vercel.app/api/payment/directPay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderSecret: sourceSecret,
          AssetCode: asset,
          AssetAmount: amt,
          recieverWallet: destinationWallet,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to transfer funds');
      }

      setSuccess(true);

      setTimeout(() => {
        onTransferSuccess();
        resetAndClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error transferring funds:', err);
      setError(err.message || 'Failed to transfer funds');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setSourceWallet('');
    setDestinationWallet('');
    setAsset('XLM');
    setAmount('');
    setError('');
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={resetAndClose}>
      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-t-2xl w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Self Transfer</h3>
            <button onClick={resetAndClose}>
              <IoClose size={24} />
            </button>
          </div>

          {success ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <IoSwapVerticalOutline className="text-3xl text-white" />
              </div>
              <p className="text-xl font-bold text-green-600">Transfer Successful!</p>
              <p className="text-sm text-gray-600 mt-2">Refreshing balances...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Source Wallet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From Wallet
                  </label>
                  <select
                    value={sourceWallet}
                    onChange={(e) => setSourceWallet(e.target.value)}
                    className="w-full border rounded-lg p-3 text-gray-900 font-mono text-sm"
                  >
                    <option value="">Select source wallet</option>
                    {wallets.map((wallet, idx) => (
                      <option key={wallet.address} value={wallet.address}>
                        Wallet {idx + 1}: {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Swap Icon */}
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                    <IoSwapVerticalOutline className="text-xl text-[#FFC940]" />
                  </div>
                </div>

                {/* Destination Wallet */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Wallet
                  </label>
                  <select
                    value={destinationWallet}
                    onChange={(e) => setDestinationWallet(e.target.value)}
                    className="w-full border rounded-lg p-3 text-gray-900 font-mono text-sm"
                  >
                    <option value="">Select destination wallet</option>
                    {wallets.map((wallet, idx) => (
                      <option key={wallet.address} value={wallet.address}>
                        Wallet {idx + 1}: {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Asset Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Asset
                  </label>
                  <select
                    value={asset}
                    onChange={(e) => setAsset(e.target.value)}
                    className="w-full border rounded-lg p-3 text-gray-900"
                  >
                    {availableAssets.map((a, idx) => (
                      <option key={`${a.code}-${idx}`} value={a.code}>
                        {a.code} {a.balance ? `(${parseFloat(a.balance).toFixed(2)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.0000001"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border rounded-lg p-3 text-gray-900"
                  />
                </div>
              </div>

              {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

              <button
                onClick={handleTransferClick}
                disabled={loading}
                className="w-full bg-black text-[#FFC940] py-3 rounded-lg font-semibold mt-4 disabled:opacity-50"
              >
                {loading ? 'Transferring...' : 'Transfer Funds'}
              </button>
            </>
          )}
        </div>
        <div className="h-[100px] bg-white w-full max-w-md"></div>
      </div>

      {/* PIN Verification Modal */}
      <PinVerificationModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
        title="Authorize Transfer"
        description={`Enter your PIN to transfer ${amount} ${asset}`}
      />
    </div>
  );
}