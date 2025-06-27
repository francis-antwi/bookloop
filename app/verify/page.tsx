'use client';

import { useState } from 'react';
import {
  FiCamera,
  FiUpload,
  FiCheck,
  FiLoader
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
    <div className="space-y-4">
      {currentStep === 'selfie' && (
        <>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FiCamera className="text-blue-500" />
            Face Verification
          </h2>
          <Camera onCapture={handleSelfieCapture} />
          {selfieImage && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-600 rounded-lg">
              <FiCheck />
              <span>Selfie captured</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentStep('id')}
              disabled={!selfieImage}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300"
            >
              Next
            </button>
          </div>
        </>
      )}

      {currentStep === 'id' && (
        <>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FiUpload className="text-blue-500" />
            ID Verification
          </h2>

          {verificationStatus?.success === false && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <p className="font-medium">Verification Failed</p>
              <p className="text-sm">{verificationStatus.error}</p>
              {verificationStatus.confidence && (
                <p className="text-sm mt-1">
                  Confidence score: {verificationStatus.confidence.toFixed(1)}%
                </p>
              )}
            </div>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              id="id-upload"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleIdUpload(e.target.files[0])}
              disabled={isLoading}
              className="hidden"
              capture="environment"
            />
            <label htmlFor="id-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <FiUpload className="text-2xl text-gray-400" />
              <span className="text-blue-500 font-medium">Upload ID Document</span>
              <p className="text-sm text-gray-500">Ghana Card, Passport or Driver's License</p>
            </label>
          </div>

          {idFile && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-600 rounded-lg">
              <FiCheck />
              <span>{idFile.name}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={submitVerification}
              disabled={!idFile || isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300"
            >
              {isLoading ? (
                <>
                  <FiLoader className="animate-spin" />
                  Verifying...
                </>
              ) : (
                'Complete Verification'
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default VerificationSteps;
