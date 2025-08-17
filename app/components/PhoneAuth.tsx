'use client';

import { useState, useEffect, useRef } from 'react';
import { auth, RecaptchaVerifier } from '@/app/libs/firebaseAuth';
import { signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import toast from 'react-hot-toast';
import { formatGhanaPhone } from '../api/utils/formatGhanaPhone';

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
    recaptchaWidgetId: any; // Add this for potential future use if you need to reset reCAPTCHA manually
  }
}

interface PhoneAuthProps {
  phoneNumber: string;
  onVerified: (phoneNumber: string, otp: string) => void;
}

const PhoneAuth: React.FC<PhoneAuthProps> = ({ phoneNumber, onVerified }) => {
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0); // Cooldown timer state
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store the interval ID

  useEffect(() => {
    if (!window.recaptchaVerifier) {
      // Ensure reCAPTCHA is initialized only once
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: (response: string) => {
          // reCAPTCHA solved, you can log this or use the response if needed

          // If you were using explicit reCAPTCHA execution, you might trigger OTP send here
        },
        'expired-callback': () => {
          // reCAPTCHA expired, you might want to re-render or notify the user
         
          // Optionally, re-render reCAPTCHA or refresh the page if this happens frequently
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.render().catch(console.error);
          }
        },
      });
      window.recaptchaVerifier.render().catch(console.error);
    }

    // Cleanup function for the component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // You might want to reset reCAPTCHA here if it causes issues on unmount/remount
      // For invisible reCAPTCHA, it usually persists, but consider if needed.
    };
  }, []);

  // Effect for managing the cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      intervalRef.current = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cooldown]);


  const sendOtp = async () => {
    const formatted = formatGhanaPhone(phoneNumber);
    if (!formatted) {
      toast.error("Invalid Ghanaian phone number");
      return;
    }

    if (cooldown > 0) {
      toast.error(`Please wait ${cooldown} seconds before sending another OTP.`);
      return;
    }

    setSending(true);
    try {
      // Execute reCAPTCHA explicitly before sending OTP for better control
      // This is often done if you use 'invisible' size and need to ensure it runs before the action
      // For automatic execution on button click, it might be handled by Firebase's signInWithPhoneNumber
      // However, explicitly executing it here can provide better control and error handling for reCAPTCHA itself.
      // await window.recaptchaVerifier.verify(); // This line might be needed if you want explicit reCAPTCHA check first

      const result = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmationResult(result);
      toast.success('OTP sent! Please check your phone.');
      setCooldown(60); // Set a 60-second cooldown after successful send
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      if (error.code === 'auth/too-many-requests') {
        toast.error('Too many OTP requests. Please try again later.');
        // Optionally, set a longer cooldown here if it's a persistent issue
        setCooldown(120); // Longer cooldown for "too many requests"
      } else if (error.code === 'auth/captcha-check-failed' || error.code === 'auth/web-storage-unsupported') {
        toast.error('Security check failed. Please refresh and try again.');
      } else {
        toast.error(`Failed to send OTP:You failed captcha`);
      }
    } finally {
      setSending(false);
      // It's generally a good idea to reset reCAPTCHA after an attempt, especially on failure
      // if (window.recaptchaVerifier && window.recaptchaWidgetId !== undefined) {
      //   grecaptcha.reset(window.recaptchaWidgetId);
      // }
    }
  };

  const verifyOtp = async () => {
    if (!confirmationResult) return;
    if (otp.length < 6) {
      toast.error('OTP must be at least 6 digits.');
      return;
    }

    setVerifying(true);
    try {
      await confirmationResult.confirm(otp);
      onVerified(phoneNumber, otp);
      toast.success('Phone verified successfully!');
      // Optionally reset state here if user should not send more OTPs
      setOtp('');
      setConfirmationResult(null);
      setCooldown(0); // Clear cooldown on successful verification
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      if (error.code === 'auth/invalid-verification-code') {
        toast.error('Invalid OTP. Please try again.');
      } else if (error.code === 'auth/code-expired') {
        toast.error('OTP expired. Please request a new one.');
      } else {
        toast.error('Failed to verify OTP. Please try again.');
      }
    } finally {
      setVerifying(false);
    }
  };

  const sendButtonText = cooldown > 0 ? `Resend in ${cooldown}s` : (sending ? 'Sending...' : 'Send OTP');

  return (
    <div className="space-y-4">
      <button
        onClick={sendOtp}
        disabled={sending || cooldown > 0} // Disable if sending or on cooldown
        className={`px-4 py-2 rounded-lg text-white ${
          sending || cooldown > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {sendButtonText}
      </button>

      {confirmationResult && (
        <div className="flex gap-2">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            className="border rounded px-2 py-1 flex-1 focus:ring-blue-500 focus:border-blue-500"
            maxLength={6} // Enforce max length for OTP
          />
          <button
            onClick={verifyOtp}
            disabled={verifying || otp.length < 6}
            className={`px-4 py-2 rounded-lg text-white ${
              verifying || otp.length < 6 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>
        </div>
      )}

      {/* reCAPTCHA container - must be present */}
      <div id="recaptcha-container" />
    </div>
  );
};

export default PhoneAuth;