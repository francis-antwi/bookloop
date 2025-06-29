'use client';

import { useState, useEffect } from 'react';
import { auth, RecaptchaVerifier } from '@/app/libs/firebaseAuth';
import { signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import toast from 'react-hot-toast';
import { formatGhanaPhone } from '../api/utils/formatGhanaPhone';

interface PhoneAuthProps {
  phoneNumber: string;
  onVerified: (phoneNumber: string, otp: string) => void; // Updated interface
}

const PhoneAuth: React.FC<PhoneAuthProps> = ({ phoneNumber, onVerified }) => {
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          console.log('reCAPTCHA solved:', response);
        },
      });
      window.recaptchaVerifier.render().catch(console.error);
    }
  }, []);

  const sendOtp = async () => {
    const formatted = formatGhanaPhone(phoneNumber);
    if (!formatted) {
      toast.error("Invalid Ghanaian phone number");
      return;
    }

    setSending(true);
    try {
      const result = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmationResult(result);
      toast.success('OTP sent!');
    } catch (error: any) {
      toast.error(`Failed to send OTP: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!confirmationResult) return;
    setVerifying(true);
    try {
      await confirmationResult.confirm(otp);
      onVerified(phoneNumber, otp); // Now passing both phone and OTP
      toast.success('Phone verified!');
    } catch (error: any) {
      toast.error('Invalid OTP');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={sendOtp}
        disabled={sending}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
      >
        {sending ? 'Sending...' : 'Send OTP'}
      </button>

      {confirmationResult && (
        <div className="flex gap-2">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="border rounded px-2 py-1 flex-1"
          />
          <button
            onClick={verifyOtp}
            disabled={verifying || otp.length < 6}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      )}

      <div id="recaptcha-container" />
    </div>
  );
};

export default PhoneAuth;