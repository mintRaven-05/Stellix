'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { IoCloseOutline, IoQrCodeOutline } from 'react-icons/io5';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string>('');
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let animationId: number;
    let stream: MediaStream | null = null;
    let active = true;
    
    const startScanner = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        setVideoStream(stream);
        setScanning(true);
        setError('');
        
        const video = document.getElementById('qr-video') as HTMLVideoElement;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        
        // Use HTML5 qr code scanner library
        const BarcodeDetector = (window as any).BarcodeDetector;
        
        if (BarcodeDetector) {
          const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
          
          const detectQR = async () => {
            if (!active || !video) return;
            
            try {
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes.length > 0 && active) {
                const scannedValue = barcodes[0].rawValue.trim();
                if (scannedValue) {
                  active = false;
                  if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                  }
                  onClose();
                  router.push(`/pay/${scannedValue}`);
                  return;
                }
              }
            } catch (err) {
              // Continue scanning
            }
            
            if (active) {
              animationId = requestAnimationFrame(detectQR);
            }
          };
          
          detectQR();
        } else {
          // Fallback: use jsQR library
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const detectQR = () => {
            if (!active || !video || !ctx) return;
            
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              // Try to use jsQR dynamically
              import('jsqr' as any).then((module: any) => {
                const jsQR = module.default || module;
                const code = jsQR(imageData.data, imageData.width, imageData.height);
                
                if (code && code.data && active) {
                  const scannedValue = code.data.trim();
                  if (scannedValue) {
                    active = false;
                    if (stream) {
                      stream.getTracks().forEach(track => track.stop());
                    }
                    onClose();
                    router.push(`/pay/${scannedValue}`);
                    return;
                  }
                }
              }).catch(() => {
                // jsQR not available
              });
            }
            
            if (active) {
              animationId = requestAnimationFrame(detectQR);
            }
          };
          
          detectQR();
        }
      } catch (err: any) {
        console.error('Camera error:', err);
        if (active) {
          setError('Unable to access camera. Please check your permissions.');
          setScanning(false);
        }
      }
    };
    
    startScanner();
    
    return () => {
      active = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setScanning(false);
      setVideoStream(null);
    };
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl w-full max-w-md mx-4 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-black p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IoQrCodeOutline className="text-2xl text-[#FFC940]" />
            <h2 className="text-xl font-bold text-[#FFC940]">Scan QR Code</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <IoCloseOutline className="text-2xl text-white" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-6">
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
            <div>
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-[#FFC940] bg-black">
                <video
                  id="qr-video"
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                {/* Scanning overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border-2 border-[#FFC940]/50">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#FFC940]" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#FFC940]" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#FFC940]" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#FFC940]" />
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center space-y-3">
                <p className="text-lg font-semibold text-gray-900">
                  Point camera at QR code
                </p>
                <p className="text-sm text-gray-600">
                  The sUPI ID will be scanned automatically
                </p>
                {scanning && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <p className="text-sm text-green-600 font-medium">Camera active</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}