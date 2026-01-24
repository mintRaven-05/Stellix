'use client';

import { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  paymentData: {
    payment_id: string;
    sender: string;
    amount: string;
    asset: string;
    fromUserEmail?: string;
  } | null;
  onVerificationSuccess?: () => void;
}

export default function ProtectedPayVerificationModal({ 
  isOpen, 
  onClose, 
  paymentData,
  onVerificationSuccess 
}: Props) {
  const { getPrimarySecret } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !paymentData) return null;

  const resetAndClose = () => {
    setOtp('');
    setError('');
    setLoading(false);
    onClose();
  };

  const handleVerify = async () => {
    if (otp.trim().length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get receiver secret
      const receiverSecret = await getPrimarySecret();
      if (!receiverSecret) {
        throw new Error('Failed to retrieve wallet secret');
      }

      // Call backend API to verify OTP and release funds
      const response = await fetch('https://stellix-backend.vercel.app/api/payment/protectedPay/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_id: paymentData.payment_id,
          otp: otp.trim(),
          receiver_secret: receiverSecret,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'OTP verification failed');
      }

      // Show success message
      const swapMessage = result.swap_performed 
        ? `\n\nAuto-swapped from ${result.original_amount} ${result.original_asset} to ${result.final_amount} ${result.final_asset}!`
        : '';
      
      alert(`✅ Payment received successfully!${swapMessage}\n\nRelease Tx: ${result.release_transaction_hash}${result.swap_transaction_hash ? '\nSwap Tx: ' + result.swap_transaction_hash : ''}`);
      
      resetAndClose();
      
      // Notify parent to refresh
      if (onVerificationSuccess) {
        onVerificationSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[95]" onClick={resetAndClose}>
    <div className="w-full max-w-md sm:max-w-sm px-3 sm:px-0" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full p-5 shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-gray-900">Claim Protected Payment</h3>
          <button onClick={resetAndClose} className="text-gray-600 hover:text-gray-900">
            <IoClose size={22} />
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-4">
          <p className="text-sm text-gray-800">
            Amount: <span className="font-semibold">{paymentData.amount} {paymentData.asset}</span>
          </p>
          <p className="text-xs text-gray-600 mt-1 break-all">From: {paymentData.fromUserEmail || paymentData.sender}</p>
          <p className="text-[11px] text-gray-500 mt-2 break-all font-mono">
            Payment ID: {paymentData.payment_id}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 mb-4">
          <p className="text-xs text-blue-900">
            Enter the OTP shared by the sender to claim funds. You can do this anytime before expiry.
          </p>
        </div>

        <label className="block text-sm font-semibold text-gray-800 mb-2">OTP</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 tracking-widest text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-black/20"
        />

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <button
          onClick={handleVerify}
          disabled={loading || otp.length !== 6}
          className="w-full mt-4 bg-black text-[#FFC940] py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Verify OTP & Claim'}
        </button>

        <button
          onClick={resetAndClose}
          className="w-full mt-2 py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
        >
          Not now
        </button>
      </div>
    </div>
  </div>
);

}
