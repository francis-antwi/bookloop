'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
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
import { useSession, signIn } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Camera from '../components/inputs/Camera';

interface VerificationStepsProps {
  role: string;
  onComplete: () => void;
}

const VerificationSteps = ({ role, onComplete }: VerificationStepsProps) => {
  const router = useRouter();
  const { data: session, update } = useSession();
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

  const submitVerification = async () => {
    if (!selfieImage || !idFile) {
      toast.error('Please complete all verification steps');
      return;
    }

    setIsLoading(true);
    setVerificationStatus(null);

    try {
      const verificationFormData = new FormData();
      verificationFormData.append('selfie', new File([selfieImage], 'selfie.jpg', { type: 'image/jpeg' }));
      verificationFormData.append('idImage', idFile);
      verificationFormData.append('email', session?.user?.email || '');

      const response = await axios.post('/api/verify', verificationFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Verification failed');
      }

      const extractedData = response.data.extractedData || {};
      const confidence = response.data.matchConfidence || extractedData.faceConfidence || 95;

      const registrationData = {
        email: session?.user?.email,
        name: extractedData.idName || 'Verified User',
        role: role || 'PROVIDER',
        verified: true,
        faceConfidence: confidence,
        selfieImage: response.data.selfieUrl,
        idImage: response.data.imageUrl,
        idName: extractedData.idName || null,
        idNumber: extractedData.idNumber || extractedData.personalIdNumber || null,
        personalIdNumber: extractedData.personalIdNumber || null,
        idType: extractedData.idType || null,
        idDOB: extractedData.idDOB || null,
        idExpiryDate: extractedData.idExpiryDate || null,
        idIssueDate: extractedData.idIssueDate || null,
        idIssuer: extractedData.idIssuer || null,
        nationality: extractedData.nationality || null,
        gender: extractedData.gender || null,
        placeOfIssue: extractedData.placeOfIssue || null,
        rawText: extractedData.rawText || null,
        extractionComplete: true
      };

      const registerRes = await axios.post('/api/register', registrationData);
      const registerData = registerRes.data;

     const registerData = registerRes.data;
console.log("✅ Registration response:", registerData);

if (!registerData.success) {
  toast.error(registerData.message || "Registration failed");
  return;
}

if (registerData.shouldAutoLogin) {
  toast.success('Verification complete! Logging you in...');
  await update();
  router.push('/');
  onComplete?.();
  return;
}

toast.error("Verification complete, but auto-login failed. Please log in manually.");

      await signIn('email', { email: registrationData.email, redirect: false });
      onComplete?.();

    } catch (error: any) {
      const errorData = error.response?.data;
      const errorMsg = errorData?.error || error.message || 'Verification failed';

      console.error('❌ Verification error:', errorMsg);
      if (errorData?.missing) {
        console.warn('🔍 Missing verification fields:', errorData.missing);
      }
      if (errorData?.payload) {
        console.debug('📦 Payload that caused the error:', errorData.payload);
      }

      setVerificationStatus({ success: false, error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
            <FiShield className="text-2xl text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Identity Verification</h1>
          <p className="text-gray-600">You need to pass verification before you can access provider functions</p>
        </div>

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

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          {currentStep === 'selfie' ? (
            <SelfieStep
              selfieImage={selfieImage}
              onSelfieCapture={handleSelfieCapture}
              onNext={() => setCurrentStep('id')}
            />
          ) : (
            <IDStep
              idFile={idFile}
              onIdUpload={handleIdUpload}
              onBack={() => setCurrentStep('selfie')}
              onSubmit={submitVerification}
              isLoading={isLoading}
            />
          )}
        </div>

        <SecurityNotice />
      </div>
    </div>
  );
};

type SelfieStepProps = {
  selfieImage: Blob | null;
  onSelfieCapture: (blob: Blob) => void;
  onNext: () => void;
};

const SelfieStep = ({ selfieImage, onSelfieCapture, onNext }: SelfieStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
        <FiUser className="text-xl text-blue-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Face Verification</h2>
      <p className="text-gray-600 text-sm">Take a clear selfie for identity confirmation</p>
    </div>
    <div className="relative">
      <Camera onCapture={onSelfieCapture} />
      {selfieImage && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
          <FiCheck className="text-white text-sm" />
        </div>
      )}
    </div>
    {selfieImage && (
      <SuccessMessage
        title="Selfie captured successfully!"
        description="Ready to proceed to next step"
      />
    )}
    <div className="flex gap-3">
      <button
        onClick={onNext}
        disabled={!selfieImage}
        className="flex-1 py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:transform-none disabled:shadow-md flex items-center justify-center gap-2"
      >
        <span>Continue to ID Verification</span>
        <FiArrowRight className="text-sm" />
      </button>
    </div>
  </div>
);

type IDStepProps = {
  idFile: File | null;
  onIdUpload: (file: File) => void;
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
};

const IDStep = ({ idFile, onIdUpload, onBack, onSubmit, isLoading }: IDStepProps) => (
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
        onChange={(e) => e.target.files?.[0] && onIdUpload(e.target.files[0])}
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
      <SuccessMessage
        title="Document uploaded"
        description={idFile.name}
        truncate
      />
    )}
    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all duration-200 flex items-center gap-2"
      >
        <FiArrowLeft className="text-sm" />
        <span>Back</span>
      </button>
      <button
        onClick={onSubmit}
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
);

type SuccessMessageProps = {
  title: string;
  description: string;
  truncate?: boolean;
};

const SuccessMessage = ({ title, description, truncate = false }: SuccessMessageProps) => (
  <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
      <FiCheck className="text-white text-sm" />
    </div>
    <div className={truncate ? 'flex-1' : ''}>
      <p className="font-medium text-green-800">{title}</p>
      <p className={`text-sm text-green-600 ${truncate ? 'truncate' : ''}`}>{description}</p>
    </div>
  </div>
);

const SecurityNotice = () => (
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
);

export default VerificationSteps;
