'use client';

import { useState } from 'react';
import { IoClose, IoSwapHorizontalOutline } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';
import PinVerificationModal from './PinVerificationModal';

interface Asset {
  code: string;
  issuer?: string;
}

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAssets: Array<{ code: string; issuer: string | null; balance: string }>;
  onSwapSuccess: () => void;
}

export default function SwapModal({ isOpen, onClose, availableAssets, onSwapSuccess }: SwapModalProps) {
  const { verifyPin, getPrimarySecret } = useAuth();
  const [sourceAsset, setSourceAsset] = useState<Asset>({ code: 'XLM' });
  const [sourceAmount, setSourceAmount] = useState('');
  const [destinationAsset, setDestinationAsset] = useState<Asset>(() => {
    // Find USDC if available, otherwise use first asset
    const usdc = availableAssets.find(a => a.code === 'USDC');
    if (usdc) {
      return { code: usdc.code, issuer: usdc.issuer || undefined };
    }
    const firstAsset = availableAssets[0];
    return firstAsset ? { code: firstAsset.code, issuer: firstAsset.issuer || undefined } : { code: 'XLM' };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  if (!isOpen) return null;

  const handleSwapClick = () => {
    const amount = sourceAmount.trim();
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (!sourceAsset.code) {
      setError('Select source asset');
      return;
    }

    if (!destinationAsset.code) {
      setError('Select destination asset');
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
    await processSwap();
  };

  const processSwap = async () => {
    const amount = sourceAmount.trim();
    setLoading(true);
    setError('');

    try {
      // Decrypt the secret
      const secretKey = await getPrimarySecret();
      if (!secretKey) {
        throw new Error('Failed to retrieve wallet secret');
      }

      const payload: any = {
        secretKey,
        sourceAsset: sourceAsset.issuer 
          ? { code: sourceAsset.code, issuer: sourceAsset.issuer }
          : { code: sourceAsset.code },
        sourceAmount: amount,
        destinationAsset: destinationAsset.issuer
          ? { code: destinationAsset.code, issuer: destinationAsset.issuer }
          : { code: destinationAsset.code },
        destinationAmount: "1",
      };

      const response = await fetch('https://stellix-backend.vercel.app/api/wallet/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to swap assets');
      }

      setSuccess(true);
      
      setTimeout(() => {
        onSwapSuccess();
        resetAndClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error swapping assets:', err);
      setError(err.message || 'Failed to swap assets');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setSourceAsset({ code: 'XLM' });
    setSourceAmount('');
    const usdc = availableAssets.find(a => a.code === 'USDC');
    if (usdc) {
      setDestinationAsset({ code: usdc.code, issuer: usdc.issuer || undefined });
    } else {
      const firstAsset = availableAssets[0];
      setDestinationAsset(firstAsset ? { code: firstAsset.code, issuer: firstAsset.issuer || undefined } : { code: 'XLM' });
    }
    setError('');
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  const handleSourceAssetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = availableAssets.find(a => 
      a.code === e.target.value || `${a.code}:${a.issuer}` === e.target.value
    );
    
    if (selected) {
      setSourceAsset({
        code: selected.code,
        issuer: selected.issuer || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={resetAndClose}>
      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-t-2xl w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Swap Assets</h3>
          <button onClick={resetAndClose}>
            <IoClose size={24} />
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <IoSwapHorizontalOutline className="text-3xl text-white" />
            </div>
            <p className="text-xl font-bold text-green-600">Swap Successful!</p>
            <p className="text-sm text-gray-600 mt-2">Refreshing balances...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Source Asset */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From
                </label>
                <select
                  value={sourceAsset.issuer ? `${sourceAsset.code}:${sourceAsset.issuer}` : sourceAsset.code}
                  onChange={handleSourceAssetChange}
                  className="w-full border rounded-lg p-3 mb-2 text-gray-900"
                >
                  {availableAssets.map((asset, idx) => (
                    <option 
                      key={`${asset.code}-${asset.issuer}-${idx}`}
                      value={asset.issuer ? `${asset.code}:${asset.issuer}` : asset.code}
                    >
                      {asset.code} {asset.balance ? `(${parseFloat(asset.balance).toFixed(2)})` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.0000001"
                  placeholder="Amount"
                  value={sourceAmount}
                  onChange={(e) => setSourceAmount(e.target.value)}
                  className="w-full border rounded-lg p-3 text-gray-900"
                />
              </div>

              {/* Swap Icon */}
              <div className="flex justify-center">
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                  <IoSwapHorizontalOutline className="text-xl text-[#FFC940]" />
                </div>
              </div>

              {/* Destination Asset */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <select
                  value={destinationAsset.issuer ? `${destinationAsset.code}:${destinationAsset.issuer}` : destinationAsset.code}
                  onChange={(e) => {
                    const selected = availableAssets.find(a => 
                      a.issuer ? `${a.code}:${a.issuer}` === e.target.value : a.code === e.target.value
                    );
                    if (selected) {
                      setDestinationAsset({
                        code: selected.code,
                        issuer: selected.issuer || undefined,
                      });
                    }
                  }}
                  className="w-full border rounded-lg p-3 text-gray-900"
                >
                  {availableAssets.map((asset, idx) => (
                    <option 
                      key={`dest-${asset.code}-${asset.issuer}-${idx}`}
                      value={asset.issuer ? `${asset.code}:${asset.issuer}` : asset.code}
                    >
                      {asset.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

            <button
              onClick={handleSwapClick}
              disabled={loading}
              className="w-full bg-black text-[#FFC940] py-3 rounded-lg font-semibold mt-4 disabled:opacity-50"
            >
              {loading ? 'Swapping...' : 'Swap Assets'}
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
        title="Authorize Swap"
        description={`Enter your PIN to swap ${sourceAmount} ${sourceAsset.code} for ${destinationAsset.code}`}
      />
    </div>
  );
}