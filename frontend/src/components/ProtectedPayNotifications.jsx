'use client';

import { useEffect, useRef, useState } from 'react';
import { client } from '@/lib/appwrite';
import { useAuth } from '@/contexts/AuthContext';
import { databases, Query } from '@/lib/appwrite';
import { IoClose } from 'react-icons/io5';
import { decryptSignedXdr } from '@/lib/cryptoXdr';
import { submitSignedXdr } from '@/lib/stellarPayments';

type TxDoc = any;

export default function ProtectedPayNotifications() {
  const { userData } = useAuth();

  const [active, setActive] = useState<TxDoc | null>(null);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subscribedRef = useRef(false);

  const meEmail = userData?.email;

  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const colId = process.env.NEXT_PUBLIC_APPWRITE_TRANSACTIONS_COLLECTION_ID!;

  useEffect(() => {
    if (!meEmail) return;

    // Avoid double-subscribe in React Strict Mode dev
    if (subscribedRef.current) return;
    subscribedRef.current = true;

    // Subscribe to ALL document events in the collection
    const channel = `databases.${dbId}.collections.${colId}.documents`;

    const unsubscribe = client.subscribe(channel, async (response: any) => {
      const payload = response?.payload as TxDoc | undefined;
      if (!payload) return;

      // Only for me
      if (payload.toUserEmail !== meEmail) return;

      // Only protected pay
      if (payload.paymentType !== 'secure') return;

      // Only pending OTP committed
      if (payload.status !== 'otp_committed') return;

      // If expired, ignore (optional)
      const exp = payload.otpExpiresAt ? new Date(payload.otpExpiresAt).getTime() : 0;
      if (exp && Date.now() > exp) return;

      // Pop open immediately
      setActive(payload);
      setOtp('');
      setError('');
    });

    // Also fetch any already-pending ones once on mount
    (async () => {
      try {
        const res = await databases.listDocuments(dbId, colId, [
          Query.equal('toUserEmail', meEmail),
          Query.equal('paymentType', 'secure'),
          Query.equal('status', 'otp_committed'),
          Query.orderDesc('$createdAt'),
          Query.limit(1),
        ]);
        if (res.documents.length > 0) setActive(res.documents[0] as any);
      } catch {
        // ignore
      }
    })();

    return () => {
      unsubscribe();
      subscribedRef.current = false;
    };
  }, [meEmail, dbId, colId]);

  const closePopup = () => {
    setActive(null);
    setOtp('');
    setError('');
    setLoading(false);
  };

  const verifyAndRelease = async () => {
    if (!active) return;

    const entered = otp.trim();
    if (entered.length !== 6) {
      setError('Enter 6-digit OTP');
      return;
    }

    const exp = active.otpExpiresAt ? new Date(active.otpExpiresAt).getTime() : 0;
    if (exp && Date.now() > exp) {
      setError('OTP expired.');
      try {
        await databases.updateDocument(dbId, colId, active.$id, { status: 'failed' });
      } catch {}
      return;
    }

    setLoading(true);
    setError('');

    try {
      const signedXdr = await decryptSignedXdr({
        encryptedXdrB64: active.encryptedXdr,
        ivB64: active.xdrIv,
        otp: entered,
        otpHashHexExpected: active.otpHash,
      });

      const txHash = await submitSignedXdr(signedXdr);

      await databases.updateDocument(dbId, colId, active.$id, {
        status: 'completed',
        stellarTxHash: txHash,
      });

      closePopup();
      alert(`Protected Pay released!\nTx: ${txHash}`);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to release payment');
    } finally {
      setLoading(false);
    }
  };

  if (!userData || !active) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[70]" onClick={closePopup}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-t-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold">Protected Pay Received</h3>
          <button onClick={closePopup}><IoClose size={24} /></button>
        </div>

        <div className="bg-[#FFFBF0] border border-[#FFC940] rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700">
            Amount: <span className="font-semibold">{active.amount} XLM</span>
          </p>
          <p className="text-xs text-gray-600 mt-1 break-all">
            From: {active.fromUserEmail}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Expires: {active.otpExpiresAt ? new Date(active.otpExpiresAt).toLocaleString() : '—'}
          </p>
        </div>

        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Enter OTP to release funds"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full border rounded-lg p-3 mb-3 text-gray-900 tracking-widest text-center"
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <button
          onClick={verifyAndRelease}
          disabled={loading}
          className="w-full bg-black text-[#FFC940] py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Releasing...' : 'Verify OTP & Release'}
        </button>
      </div>
      <div className="h-[100px] bg-white w-full max-w-md"></div>
    </div>
    </div>
  );
}