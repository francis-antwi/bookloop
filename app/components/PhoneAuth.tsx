'use client';

import { useState, useEffect } from 'react';
import { auth, RecaptchaVerifier } from '@/app/libs/firebaseAuth';
import { signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import toast from 'react-hot-toast';
import { formatGhanaPhone } from '../api/utils/formatGhanaPhone';

interface PhoneAuthProps {
  phoneNumber: string;
  onVerified: () => void;
}

const PhoneAuth: React.FC<PhoneAuthProps> = ({ phoneNumber, onVerified }) => {
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);

  // 🔐 Setup reCAPTCHA once on mount
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: any) => {
          console.log('✅ reCAPTCHA solved:', response);
        },
        'expired-callback': () => {
          console.warn('⚠️ reCAPTCHA expired. Re-initializing.');
        },
      });

      // 🧼 Render the reCAPTCHA widget (required)
      window.recaptchaVerifier.render().catch((err: any) => {
        console.error("Failed to render reCAPTCHA:", err);
      });
    }
  }, []);

  const sendOtp = async () => {
    const formatted = formatGhanaPhone(phoneNumber);

    if (!formatted) {
      toast.error("Invalid Ghanaian phone number.");
      return;
    }

    setSending(true);
    try {
      const appVerifier = window.recaptchaVerifier;

      if (!appVerifier) {
        throw new Error('reCAPTCHA not initialized');
      }

      const result = await signInWithPhoneNumber(auth, formatted, appVerifier);
      setConfirmationResult(result);
      toast.success('OTP sent!');
    } catch (error: any) {
      console.error('OTP Error:', error);
      if (error.code === 'auth/invalid-app-credential') {
        toast.error("Invalid app credential. Check Firebase setup.");
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error("Phone auth not enabled for your Firebase project.");
      } else if (error.code === 'auth/billing-not-enabled') {
        toast.error("Enable billing in Firebase to send OTP.");
      } else {
        toast.error('Failed to send OTP.');
      }
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!confirmationResult) return;
    setVerifying(true);
    try {
      await confirmationResult.confirm(otp);
      toast.success('Phone verified!');
      onVerified(); // Notify parent
    } catch (error: any) {
      console.error(error);
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

      {/* 🔐 Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />
    </div>
  );
};

export default PhoneAuth;
