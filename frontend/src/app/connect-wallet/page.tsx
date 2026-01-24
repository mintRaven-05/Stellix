'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { IoWalletOutline } from 'react-icons/io5';
import { AiOutlineCheck } from 'react-icons/ai';
import PinSetupModal from '@/components/PinSetupModal';

export default function ConnectWalletPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  
  const { user, userData, connectWallet } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else if (userData) {
      router.push('/home');
    }
  }, [user, userData, router]);

  const handleCreateWallet = async () => {
    // Show PIN setup modal
    setShowPinSetup(true);
  };

  const handlePinSetupSuccess = async (pin: string) => {
    setLoading(true);
    setError('');
    setShowPinSetup(false);

    try {
      setWalletConnected(true);
      // Create new wallet via API and save to Appwrite with PIN
      await connectWallet(pin);
      
      // Navigate to home after successful creation
      setTimeout(() => {
        router.push('/home');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet');
      setWalletConnected(false);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5] p-4 relative overflow-hidden">
      {/* Polkadot pattern background */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 relative z-10 border border-gray-200">
        <div className="text-center mb-8">
          {walletConnected ? (
            <div className="w-20 h-20 bg-[#FFC940] rounded-full flex items-center justify-center mx-auto mb-4">
              <AiOutlineCheck className="text-black text-4xl" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
              <IoWalletOutline className="text-[#FFC940] text-4xl" />
            </div>
          )}
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {walletConnected ? 'Wallet Created!' : 'Create Your Wallet'}
          </h1>
          <p className="text-gray-600">
            {walletConnected 
              ? 'Redirecting to home...' 
              : 'Create a new Stellar wallet to get started'}
          </p>
        </div>

        {!walletConnected && (
          <>
            <div className="bg-[#FFFBF0] border border-[#FFC940] rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">What you'll get</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• A new Stellar blockchain wallet</li>
                <li>• Secure key management in your account</li>
                <li>• Ability to send and receive payments</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleCreateWallet}
              disabled={loading}
              className="w-full bg-black text-[#FFC940] py-4 rounded-lg font-semibold hover:bg-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                'Creating Wallet...'
              ) : (
                <>
                  <IoWalletOutline className="text-2xl" />
                  Create Wallet
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Your wallet keys will be securely stored and managed by sUPI
            </p>
          </>
        )}
      </div>

      {/* PIN Setup Modal */}
      <PinSetupModal 
        isOpen={showPinSetup}
        onClose={() => setShowPinSetup(false)}
        onSuccess={handlePinSetupSuccess}
      />
    </div>
  );
}
