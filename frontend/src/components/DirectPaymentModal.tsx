'use client';

import { useState } from 'react';
import { IoClose, IoCheckmarkCircle } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';
import PinVerificationModal from './PinVerificationModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recipient: any;
  availableAssets?: Array<{ code: string; issuer: string | null; balance: string }>;
}

export default function DirectPaymentModal({ isOpen, onClose, recipient, availableAssets = [] }: Props) {
  const { userData, verifyPin } = useAuth();
  const [asset, setAsset] = useState('XLM');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  if (!isOpen || !userData) return null;

  const resetAndClose = () => {
    setAsset('XLM');
    setAmount('');
    setError('');
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  const handlePayClick = () => {
    const amt = amount.trim();

    if (!amt || Number.isNaN(Number(amt)) || Number(amt) <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (!recipient?.primaryWallet) {
      setError('Recipient has no primary wallet linked.');
      return;
    }

    // Show PIN verification modal
    setError('');
    setShowPinModal(true);
  };

  const handlePinSuccess = async (pin: string) => {
    // Verify PIN
    if (!verifyPin(pin)) {
      setError('Invalid PIN');
      setShowPinModal(false);
      return;
    }

    setShowPinModal(false);
    await processPay();
  };

  const processPay = async () => {
    const amt = amount.trim();

    setLoading(true);
    setError('');

    try {
      const response = await fetch('https://stellix-backend.vercel.app/api/payment/directPay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_secret: userData.primarySecret,
          receiver_wallet: recipient.primaryWallet,
          asset: asset,
          amount: amt,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Payment failed');
      }

      setSuccess(true);

      setTimeout(() => {
        resetAndClose();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
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
            <h3 className="text-xl font-bold">Direct Payment</h3>
            <button onClick={resetAndClose}>
              <IoClose size={24} />
            </button>
          </div>

          {success ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <IoCheckmarkCircle className="text-3xl text-white" />
              </div>
              <p className="text-xl font-bold text-green-600">Payment Successful!</p>
              <p className="text-sm text-gray-600 mt-2">Closing...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Paying <strong>{recipient.name}</strong> ({recipient.supid})
              </p>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asset
                </label>
                <select
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="w-full border rounded-lg p-3 text-gray-900"
                >
                  <option value="XLM">XLM (Lumens)</option>
                  {availableAssets.map((a, idx) => {
                    if (a.code === 'XLM') return null;
                    return (
                      <option key={`${a.code}-${a.issuer}-${idx}`} value={a.code}>
                        {a.code} {a.balance ? `(${parseFloat(a.balance).toFixed(2)})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <input
                type="number"
                step="0.0000001"
                placeholder={`Amount in ${asset}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border rounded-lg p-3 mb-3 text-gray-900"
              />

              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

              <button
                onClick={handlePayClick}
                disabled={loading}
                className="w-full bg-black text-[#FFC940] py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Processing...' : `Send ${asset}`}
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
        title="Authorize Payment"
        description={`Enter your PIN to send ${amount} ${asset} to ${recipient?.name}`}
      />
    </div>
  );
}