'use client';

import { useEffect, useRef } from 'react';
import { IoCloseOutline } from 'react-icons/io5';
import QRCode from 'qrcode';

interface QRDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  supid: string;
  userName?: string;
}

export default function QRDisplayModal({ isOpen, onClose, supid, userName }: QRDisplayModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && canvasRef.current && supid) {
      QRCode.toCanvas(
        canvasRef.current,
        supid,
        {
          width: 280,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        },
        (error: Error | null | undefined) => {
          if (error) console.error('QR Code generation error:', error);
        }
      );
    }
  }, [isOpen, supid]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-[430px] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-black p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#FFC940]">Your sUPI QR Code</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          >
            <IoCloseOutline className="text-2xl text-white" />
          </button>
        </div>

        {/* QR Code Display */}
        <div className="p-8 flex flex-col items-center">
          {userName && (
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600">Share with</p>
              <p className="text-lg font-bold text-gray-900">{userName}</p>
            </div>
          )}

          <div className="bg-white border-4 border-gray-200 rounded-2xl p-6 shadow-lg">
            <canvas ref={canvasRef} />
          </div>

          <div className="mt-6 bg-[#FFFBF0] border border-[#FFC940] rounded-2xl p-4 w-full">
            <p className="text-xs text-gray-600 text-center mb-2">sUPI ID</p>
            <p className="text-lg font-mono font-bold text-gray-900 text-center break-all">
              {supid}
            </p>
          </div>

          <p className="text-sm text-gray-600 text-center mt-6">
            Others can scan this QR code to pay you instantly
          </p>
        </div>

        {/* Bottom spacing */}
        <div className="h-[100px]" />
      </div>
    </div>
  );
}