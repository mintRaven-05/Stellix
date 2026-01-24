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

export default function ProtectedPayModal({ isOpen, onClose, recipient, availableAssets = [] }: Props) {
  const { userData, verifyPin, getPrimarySecret } = useAuth();
  const [asset, setAsset] = useState('XLM');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpShown, setOtpShown] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);

  if (!isOpen || !userData) return null;

  const resetAndClose = () => {
    setAsset('XLM');
    setAmount('');
    setError('');
    setOtpShown(null);
    setPaymentId(null);
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
    await processProtectedPay();
  };

  const processProtectedPay = async () => {
    const amt = amount.trim();

    setLoading(true);
    setError('');

    try {
      // Decrypt the secret
      const senderSecret = await getPrimarySecret();
      if (!senderSecret) {
        throw new Error('Failed to retrieve wallet secret');
      }

      // Call backend API to initiate protected payment
      const response = await fetch('https://stellix-backend.vercel.app/api/payment/protectedPay/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderSecret: senderSecret,
          receiverWallet: recipient.primaryWallet,
          AssetCode: asset,
          AssetAmount: amt,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to initiate protected payment');
      }

      // Show OTP to sender
      setOtpShown(result.otp);
      setPaymentId(result.payment_id);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create protected payment');
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
            <h3 className="text-xl font-bold">Protected Payment</h3>
            <button onClick={resetAndClose}>
              <IoClose size={24} />
            </button>
          </div>

          {!otpShown ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Paying <strong>{recipient.name}</strong> ({recipient.supid})
              </p>

              <div className="bg-[#FFFBF0] border border-[#FFC940] rounded-lg p-4 mb-4">
                <p className="font-semibold text-gray-900">Protected Pay with Auto-Swap</p>
                <p className="text-sm text-gray-700 mt-1">
                  Funds will be locked in escrow. Share the OTP with the recipient only after fulfillment. 
                  Funds will be auto-swapped to their preferred asset!
                </p>
              </div>

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
                      <option key={idx} value={a.code}>
                        {a.code} (Balance: {parseFloat(a.balance).toFixed(2)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.0000001"
                  placeholder={`Amount in ${asset}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border rounded-lg p-3 text-gray-900"
                />
              </div>

              {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

              <button
                onClick={handlePayClick}
                disabled={loading}
                className="w-full bg-black text-[#FFC940] py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Protected Pay'}
              </button>
            </>
          ) : (
            <>
              <div className="py-4 text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IoCheckmarkCircle className="text-3xl text-white" />
                </div>
                <p className="text-xl font-bold text-green-600 mb-2">Protected Payment Created!</p>
                <p className="text-sm text-gray-600 mb-4">
                  Payment ID: <span className="font-mono text-xs">{paymentId}</span>
                </p>
              </div>

              <div className="bg-black text-[#FFC940] rounded-lg p-4 mb-4">
                <p className="text-sm opacity-90">Your OTP (share only after fulfillment)</p>
                <p className="text-3xl font-bold tracking-widest mt-1 text-center">{otpShown}</p>
              </div>

              <div className="bg-[#FFFBF0] border border-[#FFC940] rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-700">
                  ⚠️ Share this OTP with <strong>{recipient.name}</strong> only after they fulfill their part.
                  The recipient will receive a notification and can claim funds using this OTP.
                </p>
              </div>

              <button
                onClick={resetAndClose}
                className="w-full bg-black text-[#FFC940] py-3 rounded-lg font-semibold"
              >
                Done
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
        title="Authorize Protected Payment"
        description={`Enter your PIN to create a protected payment of ${amount} ${asset} to ${recipient?.name}`}
      />
    </div>
  );
}
