'use client';

import { useState } from 'react';
import { FiUserCheck, FiCamera, FiUpload, FiCheck, FiLoader } from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Camera from '../components/inputs/Camera';

interface RoleVerificationProps {
  onComplete: () => void;
}

const RoleVerification = ({ onComplete }: RoleVerificationProps) => {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'role' | 'selfie' | 'id'>('role');
  const [selfieImage, setSelfieImage] = useState<Blob | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(session?.user?.role || null);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    confidence?: number;
    error?: string;
  } | null>(null);

  const handleRoleSelect = async (role: string) => {
    setIsLoading(true);
    try {
      await axios.post('/api/role', { role });
      await update({ role });
      setSelectedRole(role);
      setCurrentStep('selfie');
      toast.success('Role selected successfully');
    } catch (error) {
      toast.error('Failed to select role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelfieCapture = (blob: Blob) => {
    setSelfieImage(blob);
  };

  const handleIdUpload = (file: File) => {
    setIdFile(file);
  };

  const submitVerification = async () => {
    if (!selfieImage || !idFile || !selectedRole) {
      toast.error('Please complete all verification steps');
      return;
    }

    setIsLoading(true);
    setVerificationStatus(null);

    try {
      const formData = new FormData();
      formData.append('selfieImage', new File([selfieImage], 'selfie.jpg', { type: 'image/jpeg' }));
      formData.append('idImage', idFile);

      const response = await axios.post('/api/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

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
          idIssuer: response.data.document.idIssuer
        });

        setVerificationStatus({
          success: true,
          confidence: response.data.verification.confidence
        });

        toast.success('Verification completed successfully!');
        onComplete();
      } else {
        throw new Error(response.data.error || 'Verification failed');
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Verification failed';
      setVerificationStatus({
        success: false,
        error: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      {currentStep === 'role' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FiUserCheck className="text-blue-500" />
            Select Your Role
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { value: 'CUSTOMER', label: 'Customer', desc: 'Looking for services' },
              { value: 'PROVIDER', label: 'Service Provider', desc: 'Offering services' }
            ].map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleSelect(role.value)}
                disabled={isLoading}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedRole === role.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${isLoading ? 'opacity-70' : ''}`}
              >
                <div className="font-medium">{role.label}</div>
                <div className="text-sm text-gray-500">{role.desc}</div>
                {selectedRole === role.value && (
                  <FiCheck className="ml-auto text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentStep === 'selfie' && (
        <div className="space-y-4">
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
              onClick={() => setCurrentStep('role')}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep('id')}
              disabled={!selfieImage}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {currentStep === 'id' && (
        <div className="space-y-4">
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
            <label
              htmlFor="id-upload"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
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
              onClick={() => setCurrentStep('selfie')}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Back
            </button>
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
        </div>
      )}
    </div>
  );
};

export default RoleVerification;