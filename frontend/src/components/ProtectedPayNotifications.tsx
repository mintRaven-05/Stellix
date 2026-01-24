'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { databases, Query } from '@/lib/appwrite';
import ProtectedPayVerificationModal from './ProtectedPayVerificationModal';
import { IoNotificationsOutline } from 'react-icons/io5';

type EscrowMetadata = {
  $id: string;
  payment_id: string;
  sender: string;
  receiver: string;
  asset_code: string;
  asset_issuer: string | null;
  amount: string;
  token_contract: string;
  transaction_hash: string;
  status: string;
};

type PendingPayment = {
  payment_id: string;
  sender: string;
  receiver: string;
  amount: string;
  asset: string;
  status: string;
};

export default function ProtectedPayNotifications() {
  const { userData } = useAuth();
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const processedPaymentsRef = useRef(new Set<string>());

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!userData?.primaryWallet) return;

    // Poll escrow_metadata table for pending payments
    const checkForPendingPayments = async () => {
      try {
        const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
        const escrowColId = process.env.NEXT_PUBLIC_APPWRITE_ESCROW_METADATA_ID!;

        // Query for pending payments where receiver matches current user's wallet
        const response = await databases.listDocuments(dbId, escrowColId, [
          Query.equal('receiver', userData.primaryWallet),
          Query.equal('status', 'pending'),
          Query.orderDesc('created_at'),
          Query.limit(1),
        ]);

        if (response.documents.length > 0) {
          const escrow = response.documents[0] as unknown as EscrowMetadata;

          // Only show notification if this is a NEW payment
          if (!processedPaymentsRef.current.has(escrow.payment_id)) {
            processedPaymentsRef.current.add(escrow.payment_id);

            const payment: PendingPayment = {
              payment_id: escrow.payment_id,
              sender: escrow.sender,
              receiver: escrow.receiver,
              amount: escrow.amount,
              asset: escrow.asset_code,
              status: escrow.status,
            };

            setPendingPayment(payment);
            setShowModal(true);
            setShowToast(true);

            // Send browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('💸 Protected Payment Received!', {
                body: `${escrow.amount} ${escrow.asset_code} from ${escrow.sender}`,
                icon: '/logo.png',
                badge: '/logo.png',
                tag: escrow.payment_id,
                requireInteraction: true,
              });
            }

            // Play notification sound
            playNotificationSound();

            // Vibrate if available
            if ('vibrate' in navigator) {
              navigator.vibrate([200, 100, 200]);
            }

            // Auto-hide toast after 5 seconds
            setTimeout(() => setShowToast(false), 5000);
          }
        }
      } catch (error) {
        console.error('Failed to check for pending payments:', error);
      }
    };

    // Check immediately on mount
    checkForPendingPayments();

    // Then poll every 5 seconds
    const interval = setInterval(checkForPendingPayments, 5000);

    return () => clearInterval(interval);
  }, [userData?.primaryWallet]);

  const handleClose = () => {
    setShowModal(false);
    setShowToast(false);
  };

  const handleVerificationSuccess = () => {
    setPendingPayment(null);
    setShowToast(false);
  };

  return (
    <>
      {/* Toast Notification */}
      {showToast && pendingPayment && (
        <div className="fixed top-4 right-4 z-[100] animate-slide-in">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 max-w-sm">
            <IoNotificationsOutline size={24} />
            <div>
              <p className="font-bold">Payment Received!</p>
              <p className="text-sm opacity-90">
                {pendingPayment.amount} {pendingPayment.asset} from {pendingPayment.sender}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal for verification */}
      {pendingPayment && (
        <ProtectedPayVerificationModal
          isOpen={showModal}
          onClose={handleClose}
          paymentData={pendingPayment}
          onVerificationSuccess={handleVerificationSuccess}
        />
      )}

      {/* Add animation styles */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

// Play notification sound
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
}
