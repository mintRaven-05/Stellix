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
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[70]" onClick={resetAndClose}>
      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-t-2xl w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xl font-bold">Protected Payment Received</h3>
            <button onClick={resetAndClose}>
              <IoClose size={24} />
            </button>
          </div>

          <div className="bg-[#FFFBF0] border border-[#FFC940] rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700">
              Amount: <span className="font-semibold">{paymentData.amount} {paymentData.asset}</span>
            </p>
            <p className="text-xs text-gray-600 mt-1 break-all">
              From: {paymentData.fromUserEmail || paymentData.sender}
            </p>
            <p className="text-xs text-gray-600 mt-1 font-mono">
              Payment ID: {paymentData.payment_id}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-900">
              💡 Enter the OTP shared by the sender to release funds. 
              The amount will be auto-swapped to your preferred asset if needed.
            </p>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter OTP
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full border rounded-lg p-3 text-gray-900 tracking-widest text-center text-xl font-bold"
            />
          </div>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={loading || otp.length !== 6}
            className="w-full bg-black text-[#FFC940] py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify OTP & Claim Funds'}
          </button>
        </div>
        <div className="h-[100px] bg-white w-full max-w-md"></div>
      </div>
    </div>
  );
}
