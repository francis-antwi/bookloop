'use client';

import { useState } from 'react';
import {
  FiCamera,
  FiUpload,
  FiCheck,
  FiLoader,
  FiArrowLeft,
  FiArrowRight,
  FiShield,
  FiUser,
  FiFileText,
  FiAlertCircle
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
  const { data: session, update } = useSession();
  const [currentStep, setCurrentStep] = useState<'selfie' | 'id'>('selfie');
  const [selfieImage, setSelfieImage] = useState<Blob | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    confidence?: number;
    error?: string;
    registrationError?: boolean;
  } | null>(null);

  const handleSelfieCapture = (blob: Blob) => setSelfieImage(blob);
  
  const handleIdUpload = (file: File) => {
    if (!file.type.match(/image\/(jpeg|png|jpg)/)) {
      toast.error('Only JPEG/PNG images are allowed');
      return;
    }
    if (file.size < 20000) {
      toast.error('Image too small. Try a higher-quality photo.');
      return;
    }
    if (file.size > 5000000) {
      toast.error('Image too large. Max 5MB.');
      return;
    }
    setIdFile(file);
  };

  const handleRegistration = async (verificationData: any) => {
    try {
      const registerResponse = await axios.post('/api/register', {
        email: session?.user?.email,
        name: verificationData.idName,
        idNumber: verificationData.idNumber,
        dob: verificationData.idDOB,
        idType: verificationData.idType,
        idIssuer: verificationData.idIssuer,
        idIssueDate: verificationData.idIssueDate,
        idExpiryDate: verificationData.idExpiryDate,
        placeOfIssue: verificationData.placeOfIssue,
        gender: verificationData.idGender,
        nationality: verificationData.idNationality,
        imageUrl: verificationData.imageUrl,
        selfieUrl: verificationData.selfieUrl,
        role: role,
        verified: true,
        rawText: verificationData.rawText
      });

      if (!registerResponse.data.success) {
        throw new Error(registerResponse.data.error || 'Registration failed');
      }

      return true;
    } catch (error: any) {
      console.error('Registration error:', {
        error: error.response?.data || error.message,
        payload: {
          email: session?.user?.email,
          name: verificationData.idName,
          idNumber: verificationData.idNumber
        }
      });
      throw error;
    }
  };

const handleRegistration = async (verificationData: any) => {
  try {
    const payload = {
      email: session?.user?.email,
      name: verificationData.idName,
      idNumber: verificationData.idNumber,
      dob: verificationData.idDOB,
      idType: verificationData.idType,
      idIssuer: verificationData.idIssuer,
      idIssueDate: verificationData.idIssueDate,
      idExpiryDate: verificationData.idExpiryDate,
      placeOfIssue: verificationData.placeOfIssue,
      gender: verificationData.idGender,
      nationality: verificationData.idNationality,
      imageUrl: verificationData.imageUrl,
      selfieUrl: verificationData.selfieUrl,
      role: role,
      verified: true,
      rawText: verificationData.rawText
    };

    console.log('Attempting registration with payload:', payload);

    const registerResponse = await axios.post('/api/register', payload);

    if (!registerResponse.data.success) {
      console.error('Registration failed with response:', {
        status: registerResponse.status,
        data: registerResponse.data,
        validationErrors: registerResponse.data.errors // Assuming your API returns validation errors
      });
      throw new Error(registerResponse.data.message || 'Registration failed');
    }

    return true;
  } catch (error: any) {
    console.error('Registration failed due to:', {
      errorType: error.name,
      errorMessage: error.message,
      requestPayload: error.config?.data, // What was actually sent
      responseData: error.response?.data, // Full error response from server
      validationErrors: error.response?.data?.errors, // Field-level validation errors
      stack: error.stack // For unexpected errors
    });

    // Special handling for common error types
    if (error.response) {
      if (error.response.status === 400) {
        console.error('Validation errors:', error.response.data.errors);
      } else if (error.response.status === 409) {
        console.error('Conflict error - likely duplicate entry:', error.response.data);
      }
    }

    throw error;
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
          <p className="text-gray-600">You need to pass verification before you can access provider functions</p>
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

        {/* Status Messages */}
        {verificationStatus?.success === false && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-red-500 text-xl mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">Verification Failed</p>
                <p className="text-sm text-red-600 mt-1">{verificationStatus.error}</p>
              </div>
            </div>
          </div>
        )}

        {verificationStatus?.registrationError && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-yellow-500 text-xl mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800">Verification Successful</p>
                <p className="text-sm text-yellow-600 mt-1">{verificationStatus.error}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={submitVerification}
                    disabled={isLoading}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600 transition flex items-center gap-2"
                  >
                    {isLoading ? (
                      <FiLoader className="animate-spin" />
                    ) : (
                      <FiCheck className="text-sm" />
                    )}
                    <span>Retry Registration</span>
                  </button>
                  <button
                    onClick={onComplete}
                    className="px-4 py-2 border border-yellow-500 text-yellow-600 rounded-lg text-sm hover:bg-yellow-50 transition"
                  >
                    Continue Anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          {currentStep === 'selfie' ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                  <FiUser className="text-xl text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Face Verification</h2>
                <p className="text-gray-600 text-sm">Take a clear selfie for identity confirmation</p>
              </div>

              <div className="relative">
                <Camera onCapture={handleSelfieCapture} />
                {selfieImage && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <FiCheck className="text-white text-sm" />
                  </div>
                )}
              </div>

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

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('id')}
                  disabled={!selfieImage}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:transform-none disabled:shadow-md flex items-center justify-center gap-2"
                >
                  <span>Continue to ID Verification</span>
                  <FiArrowRight className="text-sm" />
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
                  <FiFileText className="text-xl text-indigo-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">ID Verification</h2>
                <p className="text-gray-600 text-sm">Upload a government-issued ID document</p>
              </div>

              <div className="relative">
                <input
                  type="file"
                  id="id-upload"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleIdUpload(e.target.files[0])}
                  disabled={isLoading}
                  className="hidden"
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
                    </div>
                  </div>
                </label>
                {idFile && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <FiCheck className="text-white text-sm" />
                  </div>
                )}
              </div>

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

              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentStep('selfie')}
                  className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all duration-200 flex items-center gap-2"
                >
                  <FiArrowLeft className="text-sm" />
                  <span>Back</span>
                </button>
                
                <button
                  onClick={submitVerification}
                  disabled={!idFile || isLoading}
                  className="flex-1 py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:transform-none disabled:shadow-md flex items-center justify-center gap-3"
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
            </div>
          )}
        </div>

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