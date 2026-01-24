'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoCloseOutline, IoQrCodeOutline } from 'react-icons/io5';
import { QrReader } from 'react-qr-reader';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [scanning, setScanning] = useState(true);

  const handleScan = (result: any) => {
    if (result?.text) {
      const scannedValue = result.text.trim();
      
      // Assume the QR code contains a sUPI ID
      if (scannedValue) {
        setScanning(false);
        onClose();
        // Navigate to the pay page with the scanned sUPI ID
        router.push(`/pay/${scannedValue}`);
      }
    }
  };

  const handleError = (error: any) => {
    console.error('QR Scanner error:', error);
    setError('Failed to access camera. Please check permissions.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-full max-w-[430px] shadow-xl overflow-hidden h-[calc(100vh-2rem)] max-h-[800px] flex flex-col">
        {/* Header */}
        <div className="bg-black p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <IoQrCodeOutline className="text-2xl text-[#FFC940]" />
            <h2 className="text-xl font-bold text-[#FFC940]">Scan QR Code</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <IoCloseOutline className="text-2xl text-white" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
          {error ? (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-4">
                <p className="text-red-800 font-semibold mb-2">Camera Error</p>
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <button
                onClick={() => {
                  setError('');
                  setScanning(true);
                }}
                className="px-6 py-3 bg-black text-[#FFC940] rounded-xl font-semibold hover:bg-gray-900 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border-4 border-[#FFC940]">
                <QrReader
                  constraints={{ facingMode: 'environment' }}
                  onResult={handleScan}
                  containerStyle={{ width: '100%' }}
                  videoContainerStyle={{ paddingTop: '100%' }}
                  videoStyle={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>

              <div className="mt-6 text-center">
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Point camera at QR code
                </p>
                <p className="text-sm text-gray-600">
                  The sUPI ID will be scanned automatically
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <p className="text-sm text-gray-600">Camera active</p>
              </div>
            </>
          )}
        </div>

        {/* Bottom spacing */}
        <div className="h-[100px] shrink-0" />
      </div>
    </div>
  );
}