'use client';

import { useState, useRef, useEffect } from 'react';
import { IoClose, IoLockClosedOutline, IoCheckmarkCircle } from 'react-icons/io5';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
}

export default function PinSetupModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: PinSetupModalProps) {
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '', '', '']);
  const [enteredPin, setEnteredPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep('enter');
      setPin(['', '', '', '', '', '']);
      setConfirmPin(['', '', '', '', '', '']);
      setEnteredPin('');
      setError('');
      setLoading(false);
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPin = step === 'enter' ? pin : confirmPin;
  const setCurrentPin = step === 'enter' ? setPin : setConfirmPin;

  const handlePinChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...currentPin];
    newPin[index] = value;
    setCurrentPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-proceed when all 6 digits are entered
    if (index === 5 && value) {
      const fullPin = newPin.join('');
      if (fullPin.length === 6) {
        if (step === 'enter') {
          // Move to confirm step
          setEnteredPin(fullPin);
          setTimeout(() => {
            setStep('confirm');
            setConfirmPin(['', '', '', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
          }, 300);
        } else {
          // Verify both PINs match
          handleSubmit(fullPin);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (fullPin: string) => {
    if (fullPin !== enteredPin) {
      setError('PINs do not match. Please try again.');
      setStep('enter');
      setPin(['', '', '', '', '', '']);
      setConfirmPin(['', '', '', '', '', '']);
      setEnteredPin('');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      return;
    }

    setLoading(true);
    setError('');

    try {
      onSuccess(fullPin);
    } catch (err: any) {
      setError(err.message || 'Failed to set PIN');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
      <div
        className="bg-white w-full max-w-[430px] min-h-screen flex flex-col justify-center p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">Set Your sUPI PIN</h3>
          <button onClick={handleClose} disabled={loading}>
            <IoClose size={24} className={loading ? 'opacity-50' : ''} />
          </button>
        </div>

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
            {step === 'confirm' && enteredPin ? (
              <IoCheckmarkCircle className="text-[#FFC940] text-3xl" />
            ) : (
              <IoLockClosedOutline className="text-[#FFC940] text-3xl" />
            )}
          </div>
        </div>

        <p className="text-center text-black mb-2 font-medium">
          {step === 'enter' ? 'Create a 6-digit PIN' : 'Confirm your PIN'}
        </p>
        <p className="text-center text-black text-sm mb-6">
          {step === 'enter' 
            ? 'This PIN will secure all your transactions' 
            : 'Re-enter your PIN to confirm'
          }
        </p>

        <div className="flex justify-center gap-3 mb-6">
          {currentPin.map((digit, index) => (
            <input
              key={`${step}-${index}`}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handlePinChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={loading}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-[#FFC940] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-black text-sm">
            Setting up your PIN...
          </div>
        )}

        <div className="text-center text-xs text-black mt-4">
          {step === 'enter' ? 'Step 1 of 2' : 'Step 2 of 2'}
        </div>
      </div>
    </div>
  );
}