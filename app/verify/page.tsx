'use client';

import { useState } from 'react';
import {
  FiCamera,
  FiUpload,
  FiCheck,
  FiLoader,
  FiArrowLeft,
  FiShield,
  FiUser,
  FiFileText
} from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Camera from '../components/inputs/Camera';

interface VerificationStepsProps {
  role: string;
  onComplete: () => void;
}

const VerificationSteps = ({ role, onComplete }: VerificationStepsProps) => {
  const { update } = useSession();
  const [currentStep, setCurrentStep] = useState<'selfie' | 'id'>('selfie');
  const [selfieImage, setSelfieImage] = useState<Blob | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    confidence?: number;
    error?: string;
  } | null>(null);

  const handleSelfieCapture = (blob: Blob) => setSelfieImage(blob);
  const handleIdUpload = (file: File) => setIdFile(file);

  const submitVerification = async () => {
    if (!selfieImage || !idFile) {
      toast.error('Please complete all verification steps');
      return;
    }

    setIsLoading(true);
    setVerificationStatus(null);

    try {
      const formData = new FormData();
      formData.append('selfieImage', new File([selfieImage], 'selfie.jpg', { type: 'image/jpeg' }));
      formData.append('idImage', idFile);

      const response = await axios.post('/api/verify', formData);

      if (response.data.success) {
        await update({
          isFaceVerified: true,
          selfieImage: response.data.document.selfieUrl,
          idImage: response.data.document.imageUrl,
          faceConfidence: response.data.verification.confidence,
          idName: response.data.document.idName,
          idNumber: response.data.document.idNumber,
          idDOB: response.data.document.idDOB,
          idExpiryDate: response.data.document.idExpiryDate,
          idIssuer: response.data.document.idIssuer,
        });

        setVerificationStatus({
          success: true,
          confidence: response.data.verification.confidence,
        });

        toast.success('Verification completed successfully!');
        onComplete();
      } else {
        throw new Error(response.data.error || 'Verification failed');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Verification failed';
      setVerificationStatus({ success: false, error: message });
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
            <FiShield className="text-2xl text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Identity Verification</h1>
          <p className="text-gray-600">Secure your account with biometric verification</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{currentStep === 'selfie' ? '1' : '2'} of 2</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: currentStep === 'selfie' ? '50%' : '100%' }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          {currentStep === 'selfie' && (
            <div className="space-y-6">
              {/* Step Header */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <FiUser className="text-xl text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Face Verification</h2>
                <p className="text-gray-600 text-sm">Take a clear selfie for identity confirmation</p>
              </div>

              {/* Camera Component */}
              <div className="relative">
                <Camera onCapture={handleSelfieCapture} />
                {selfieImage && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <FiCheck className="text-white text-sm" />
                  </div>
                )}
              </div>

              {/* Success Indicator */}
              {selfieImage && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <FiCheck className="text-white text-sm" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Selfie captured successfully!</p>
                    <p className="text-sm text-green-600">Ready to proceed to next step</p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => setCurrentStep('id')}
                disabled={!selfieImage}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:transform-none disabled:shadow-md"
              >
                Continue to ID Verification
              </button>
            </div>
          )}

          {currentStep === 'id' && (
            <div className="space-y-6">
              {/* Step Header */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentStep('selfie')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiArrowLeft className="text-gray-600" />
                </button>
                <div className="text-center flex-1">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
                    <FiFileText className="text-xl text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">ID Verification</h2>
                  <p className="text-gray-600 text-sm">Upload a government-issued ID document</p>
                </div>
                <div className="w-10"></div>
              </div>

              {/* Error State */}
              {verificationStatus?.success === false && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <div>
                      <p className="font-medium text-red-800">Verification Failed</p>
                      <p className="text-sm text-red-600 mt-1">{verificationStatus.error}</p>
                      {verificationStatus.confidence && (
                        <p className="text-xs text-red-500 mt-2">
                          Confidence score: {verificationStatus.confidence.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Area */}
              <div className="relative">
                <input
                  type="file"
                  id="id-upload"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleIdUpload(e.target.files[0])}
                  disabled={isLoading}
                  className="hidden"
                  capture="environment"
                />
                <label 
                  htmlFor="id-upload" 
                  className="cursor-pointer block border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-8 text-center transition-all duration-200 hover:bg-blue-50"
                >
                  <div className="space-y-4">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full">
                      <FiUpload className="text-2xl text-gray-400" />
                    </div>
                    <div>
                      <p className="text-blue-600 font-semibold text-lg">Upload ID Document</p>
                      <p className="text-gray-500 text-sm mt-1">Ghana Card, Passport, or Driver's License</p>
                      <p className="text-xs text-gray-400 mt-2">Tap to select from camera or gallery</p>
                    </div>
                  </div>
                </label>
                {idFile && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <FiCheck className="text-white text-sm" />
                  </div>
                )}
              </div>

              {/* File Selected Indicator */}
              {idFile && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <FiCheck className="text-white text-sm" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-green-800">Document uploaded</p>
                    <p className="text-sm text-green-600 truncate">{idFile.name}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={submitVerification}
                disabled={!idFile || isLoading}
                className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:transform-none disabled:shadow-md flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <>
                    <FiLoader className="animate-spin text-lg" />
                    <span>Verifying Identity...</span>
                  </>
                ) : (
                  <>
                    <FiShield className="text-lg" />
                    <span>Complete Verification</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <FiShield className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Secure & Private</p>
              <p className="text-xs text-blue-600 mt-1">
                Your data is encrypted and processed securely. We never store sensitive information permanently.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationSteps;