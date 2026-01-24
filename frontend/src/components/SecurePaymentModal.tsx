'use client';

import { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { useAuth } from '@/contexts/AuthContext';
import { databases } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { buildAndSignXlmPaymentWithSecretKey } from '@/lib/stellarPayments';
import { encryptSignedXdr } from '@/lib/cryptoXdr';
import PinVerificationModal from './PinVerificationModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recipient: any;
  expiryHours?: number;
}

function computeExpiryIso(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

export default function SecurePaymentModal({ isOpen, onClose, recipient, expiryHours = 48 }: Props) {
  const { userData, verifyPin } = useAuth();
  const [amount, setAmount] = useState('');
  const [otpShown, setOtpShown] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  if (!isOpen || !userData) return null;

  const resetClose = () => {
    setAmount('');
    setOtpShown(null);
    setLoading(false);
    setError('');
    onClose();
  };

  const handleCreateProtectedPayClick = () => {
    const amt = amount.trim();
    if (!amt || Number.isNaN(Number(amt)) || Number(amt) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!recipient?.primaryWallet) {
      setError('Recipient has no primary wallet linked.');
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
    await processProtectedPay();
  };

  const processProtectedPay = async () => {
    const amt = amount.trim();
    setLoading(true);
    setError('');

    try {
      // 1) Buyer generates OTP locally
      const otp = (Math.floor(100000 + Math.random() * 900000)).toString();

      // 2) Build + sign payment now (no user interaction needed)
      const signedXdr = await buildAndSignXlmPaymentWithSecretKey({
        fromPublicKey: userData.primaryWallet,
        fromSecretKey: userData.primarySecret,
        toPublicKey: recipient.primaryWallet,
        amount: amt,
        memo: `sUPI:${recipient.supid}`,
        timeoutSeconds: expiryHours * 3600, // aligns tx validity with OTP expiry
      });


      // 3) Encrypt signed XDR with OTP-derived key
      const { otpHashHex, encryptedXdrB64, ivB64 } = await encryptSignedXdr({
        signedXdr,
        otp,
      });

      // 4) Store the commitment + encrypted tx (recipient can unlock only with OTP)
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID!,
        ID.unique(),
        {
          fromUserEmail: userData.email,
          toUserEmail: recipient.email,
          fromWallet: userData.primaryWallet,
          toWallet: recipient.primaryWallet,
          amount: Number(amt),
          assetType: 'native',
          assetCode: null,
          assetIssuer: null,
          paymentType: 'secure',
          status: 'otp_committed',
          otpHash: otpHashHex,
          otpExpiresAt: computeExpiryIso(expiryHours),
          stellarTxHash: null,
          memo: `sUPI:${recipient.supid}`,
          encryptedXdr: encryptedXdrB64,
          xdrIv: ivB64,
        }
      );

      // 5) Show OTP to buyer (share only after fulfillment)
      setOtpShown(otp);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to create protected payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={resetClose}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-t-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold">Protected Pay (OTP)</h3>
          <button onClick={resetClose}><IoClose size={24} /></button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Paying <strong>{recipient?.name}</strong> ({recipient?.supid})
        </p>

        {!otpShown ? (
          <>
            <div className="bg-[#FFFBF0] border border-[#FFC940] rounded-lg p-4 mb-4">
              <p className="font-semibold text-gray-900">Commit–Reveal OTP</p>
              <p className="text-sm text-gray-700 mt-1">
                Payment will be signed automatically. Later, recipient enters OTP and funds release automatically.
              </p>
              <p className="text-xs text-gray-600 mt-2">Expiry: {expiryHours} hours</p>
            </div>

            <input
              type="number"
              step="0.0000001"
              placeholder="Amount in XLM"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg p-3 mb-3 text-gray-900"
            />

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <button
              onClick={handleCreateProtectedPayClick}
              disabled={loading}
              className="w-full bg-black text-[#FFC940] py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Protected Pay'}
            </button>
          </>
        ) : (
          <>
            <div className="bg-black text-[#FFC940] rounded-lg p-4 mb-4">
              <p className="text-sm opacity-90">Your OTP (share only after fulfillment)</p>
              <p className="text-3xl font-bold tracking-widest mt-1">{otpShown}</p>
            </div>

            <button
              onClick={resetClose}
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
        description={`Enter your PIN to create a protected payment of ${amount} XLM to ${recipient?.name}`}
      />
    </div>
  );
}
