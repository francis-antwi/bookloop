'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiUpload,
  FiCheck,
  FiLoader,
  FiArrowLeft,
  FiArrowRight,
  FiShield,
  FiUser,
  FiFileText,
  FiAlertCircle,
  FiBriefcase,
  FiMapPin,
  FiPhone,
  FiMail
} from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Camera from '../components/inputs/Camera';
import Categories, { categories } from '../components/navbar/Categories';

interface VerificationStepsProps {
  onComplete: () => void;
}

const VerificationSteps = ({ onComplete }: VerificationStepsProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState<'selfie' | 'id' | 'business'>('selfie');
  const [selfieImage, setSelfieImage] = useState<Blob | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    confidence?: number;
    error?: string;
  } | null>(null);

  // Business verification state
  const [businessData, setBusinessData] = useState({
    tinNumber: '',
    registrationNumber: '',
    businessName: '',
    businessType: '',
    businessAddress: '',
    contactPhone: ''
  });

  const [businessFiles, setBusinessFiles] = useState({
    tinCertificate: null as File | null,
    incorporationCert: null as File | null,
    vatCertificate: null as File | null,
    ssnitCert: null as File | null
  });

  const handleSelfieCapture = (blob: Blob) => {
    setSelfieImage(blob);
    setVerificationStatus(null);
  };

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
    setVerificationStatus(null);
  };

  const handleBusinessDataChange = (field: string, value: string) => {
    setBusinessData(prev => ({ ...prev, [field]: value }));
  };

  const handleBusinessFileUpload = (field: string, file: File) => {
    if (!file.type.match(/image\/(jpeg|png|jpg)|application\/pdf/)) {
      toast.error('Only JPEG/PNG/PDF files are allowed');
      return;
    }
    if (file.size > 10000000) {
      toast.error('File too large. Max 10MB.');
      return;
    }
    setBusinessFiles(prev => ({ ...prev, [field]: file }));
  };

  const submitIdentityVerification = async () => {
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
      verificationFormData.append('name', session?.user?.name || '');

      const response = await axios.post('/api/verify', verificationFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Identity verification failed');
      }

      setVerificationStatus({ 
        success: true, 
        confidence: response.data.matchConfidence 
      });
      setIdentityVerified(true);
      toast.success('Identity verification complete!');

      setTimeout(() => {
        setCurrentStep('business');
      }, 1500);

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Verification failed';
      setVerificationStatus({ success: false, error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const submitBusinessVerification = async () => {
    if (!businessData.tinNumber || !businessData.businessName || !businessData.businessType) {
      toast.error('Please fill in all required business information');
      return;
    }
    if (!businessFiles.tinCertificate) {
      toast.error('TIN Certificate is required');
      return;
    }

    setIsLoading(true);

    try {
      const businessFormData = new FormData();
      businessFormData.append('email', session?.user?.email || '');
      businessFormData.append('verificationStep', 'business');
      
      Object.entries(businessData).forEach(([key, value]) => {
        if (value) businessFormData.append(key, value);
      });
      
      Object.entries(businessFiles).forEach(([key, file]) => {
        if (file) businessFormData.append(key, file);
      });

      const response = await axios.post('/api/verify', businessFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Business verification failed');
      }
        toast.success('Business verification submitted for review!');
        router.push('/pending-approval');

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Business verification failed';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 'selfie' && selfieImage) {
      setCurrentStep('id');
    } else if (currentStep === 'id' && idFile) {
      submitIdentityVerification();
    }
  };

  const prevStep = () => {
    if (currentStep === 'id') {
      setCurrentStep('selfie');
    } else if (currentStep === 'business') {
      setCurrentStep('id');
    }
  };

  const getStepNumber = () => {
    if (currentStep === 'selfie') return 1;
    if (currentStep === 'id') return 2;
    return 3;
  };

  const getTotalSteps = () => 3;

  const getProgressWidth = () => {
    const progress = (getStepNumber() / getTotalSteps()) * 100;
    return `${progress}%`;
  };

  const canProceedFromSelfie = () => selfieImage !== null;
  const canProceedFromId = () => idFile !== null;
  const canSubmitBusiness = () => {
    return businessData.tinNumber && 
           businessData.businessName && 
           businessData.businessType && 
           businessFiles.tinCertificate;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
            <FiShield className="text-2xl text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Identity Verification</h1>
          <p className="text-gray-600">
            Complete all steps to verify your identity and business information
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{getStepNumber()} of {getTotalSteps()}</span>
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                getStepNumber() >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {getStepNumber() > 1 ? <FiCheck className="text-sm" /> : '1'}
              </div>
              <span className="ml-2 text-sm text-gray-600">Selfie</span>
            </div>
            
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                getStepNumber() >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {getStepNumber() > 2 ? <FiCheck className="text-sm" /> : '2'}
              </div>
              <span className="ml-2 text-sm text-gray-600">ID Document</span>
            </div>
            
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                getStepNumber() >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
              <span className="ml-2 text-sm text-gray-600">Business</span>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: getProgressWidth() }}
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

        {verificationStatus?.success === true && currentStep === 'id' && (
          <div className="p-4 bg-green-50 border-green-200 border rounded-xl mb-6">
            <div className="flex items-start gap-3">
              <FiCheck className="text-green-500 text-xl mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">Identity Verified!</p>
                <p className="text-sm text-green-600 mt-1">
                  Match confidence: {verificationStatus.confidence}% - Moving to business verification...
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          {currentStep === 'selfie' && (
            <SelfieStep
              selfieImage={selfieImage}
              onSelfieCapture={handleSelfieCapture}
              onNext={nextStep}
              canProceed={canProceedFromSelfie()}
            />
          )}
          
          {currentStep === 'id' && (
            <IDStep
              idFile={idFile}
              onIdUpload={handleIdUpload}
              onBack={prevStep}
              onNext={nextStep}
              isLoading={isLoading}
              canProceed={canProceedFromId()}
            />
          )}
          
          {currentStep === 'business' && (
            <BusinessStep
              businessData={businessData}
              businessFiles={businessFiles}
              onDataChange={handleBusinessDataChange}
              onFileUpload={handleBusinessFileUpload}
              onBack={prevStep}
              onSubmit={submitBusinessVerification}
              isLoading={isLoading}
              canSubmit={canSubmitBusiness()}
              identityVerified={identityVerified}
            />
          )}
        </div>

        <SecurityNotice />
      </div>
    </div>
  );
};

// Component types
type SelfieStepProps = {
  selfieImage: Blob | null;
  onSelfieCapture: (blob: Blob) => void;
  onNext: () => void;
  canProceed: boolean;
};

type IDStepProps = {
  idFile: File | null;
  onIdUpload: (file: File) => void;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
  canProceed: boolean;
};

type BusinessStepProps = {
  businessData: any;
  businessFiles: any;
  onDataChange: (field: string, value: string) => void;
  onFileUpload: (field: string, file: File) => void;
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  canSubmit: boolean;
  identityVerified: boolean;
};

type FileUploadProps = {
  label: string;
  file: File | null;
  onFileUpload: (file: File) => void;
  required?: boolean;
};

type SuccessMessageProps = {
  title: string;
  description: string;
  truncate?: boolean;
};

// Step Components
const SelfieStep = ({ selfieImage, onSelfieCapture, onNext, canProceed }: SelfieStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
        <FiUser className="text-xl text-blue-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 1: Face Verification</h2>
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
    
    <button
      onClick={onNext}
      disabled={!canProceed}
      className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:transform-none disabled:shadow-md flex items-center justify-center gap-2"
    >
      <span>Continue to ID Verification</span>
      <FiArrowRight className="text-sm" />
    </button>
  </div>
);

const IDStep = ({ idFile, onIdUpload, onBack, onNext, isLoading, canProceed }: IDStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full mb-3">
        <FiFileText className="text-xl text-indigo-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 2: ID Verification</h2>
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
        className={`cursor-pointer block border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
          isLoading 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
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
        disabled={isLoading}
        className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
      >
        <FiArrowLeft className="text-sm" />
        <span>Back</span>
      </button>
      <button
        onClick={onNext}
        disabled={!canProceed || isLoading}
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
            <span>Verify & Continue to Business</span>
          </>
        )}
      </button>
    </div>
  </div>
);

const BusinessStep = ({ 
  businessData, 
  businessFiles, 
  onDataChange, 
  onFileUpload, 
  onBack, 
  onSubmit, 
  isLoading, 
  canSubmit,
  identityVerified 
}: BusinessStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
        <FiBriefcase className="text-xl text-purple-600" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 3: Business Verification</h2>
      <p className="text-gray-600 text-sm">Provide your business information and documents</p>
    </div>

    {identityVerified && (
      <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
        <div className="flex items-start gap-3">
          <FiCheck className="text-green-500 text-xl mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">Identity Verified ✓</p>
            <p className="text-sm text-green-600 mt-1">
              Your identity has been verified. Please complete business verification below.
            </p>
          </div>
        </div>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          TIN Number *
        </label>
        <input
          type="text"
          value={businessData.tinNumber}
          onChange={(e) => onDataChange('tinNumber', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter TIN number"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Registration Number
        </label>
        <input
          type="text"
          value={businessData.registrationNumber}
          onChange={(e) => onDataChange('registrationNumber', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter registration number"
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Business Name *
      </label>
      <input
        type="text"
        value={businessData.businessName}
        onChange={(e) => onDataChange('businessName', e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter business name"
      />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Type *
        </label>
        <select
          value={businessData.businessType}
          onChange={(e) => onDataChange('businessType', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select business type</option>
          {categories.map((cat) => (
            <option key={cat.label} value={cat.label}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contact Phone
        </label>
        <input
          type="tel"
          value={businessData.contactPhone}
          onChange={(e) => onDataChange('contactPhone', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter contact phone"
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Business Address
      </label>
      <textarea
        value={businessData.businessAddress}
        onChange={(e) => onDataChange('businessAddress', e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        rows={3}
        placeholder="Enter business address"
      />
    </div>

    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Required Documents</h3>
      
      <FileUpload
        label="TIN Certificate *"
        file={businessFiles.tinCertificate}
        onFileUpload={(file) => onFileUpload('tinCertificate', file)}
        required
      />
      
      <FileUpload
        label="Certificate of Incorporation"
        file={businessFiles.incorporationCert}
        onFileUpload={(file) => onFileUpload('incorporationCert', file)}
      />
      
      <FileUpload
        label="VAT Certificate"
        file={businessFiles.vatCertificate}
        onFileUpload={(file) => onFileUpload('vatCertificate', file)}
      />
      
      <FileUpload
        label="SSNIT Certificate"
        file={businessFiles.ssnitCert}
        onFileUpload={(file) => onFileUpload('ssnitCert', file)}
      />
    </div>

    <div className="flex gap-3">
      <button
        onClick={onBack}
        disabled={isLoading}
        className="px-6 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
      >
        <FiArrowLeft className="text-sm" />
        <span>Back</span>
      </button>
      <button
        onClick={onSubmit}
        disabled={!canSubmit || isLoading}
        className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:transform-none disabled:shadow-md flex items-center justify-center gap-3"
      >
        {isLoading ? (
          <>
            <FiLoader className="animate-spin text-lg" />
            <span>Submitting for Review...</span>
          </>
        ) : (
          <>
            <FiShield className="text-lg" />
            <span>Submit for Review</span>
          </>
        )}
      </button>
    </div>
  </div>
);

const FileUpload = ({ label, file, onFileUpload, required = false }: FileUploadProps) => {
  const inputId = `file-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          type="file"
          id={inputId}
          accept="image/*,.pdf"
          onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
          className="hidden"
        />
        <label
          htmlFor={inputId}
          className="cursor-pointer block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
              <FiUpload className="text-lg text-gray-400" />
            </div>
            <div>
              <p className="text-blue-600 font-medium">Upload {label}</p>
              <p className="text-gray-500 text-xs">PDF, JPEG, or PNG (max 10MB)</p>
            </div>
          </div>
        </label>
        {file && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
            <FiCheck className="text-white text-xs" />
          </div>
        )}
      </div>
      {file && (
        <SuccessMessage
          title="Document uploaded"
          description={file.name}
          truncate
        />
      )}
    </div>
  );
};

const SuccessMessage = ({ title, description, truncate = false }: SuccessMessageProps) => (
  <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
    <div className="flex items-start gap-3">
      <FiCheck className="text-green-500 text-xl mt-0.5 flex-shrink-0" />
      <div>
       <p className="font-medium text-green-800">{title}</p>
        <p className={`text-sm text-green-600 mt-1 ${truncate ? 'truncate' : ''}`}>
          {description}
        </p>
      </div>
    </div>
  </div>
);

const SecurityNotice = () => (
  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
    <div className="flex items-start gap-3">
      <FiShield className="text-blue-500 text-xl mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium text-blue-800">Security Notice</p>
        <p className="text-sm text-blue-600 mt-1">
          Your personal information is encrypted and securely stored. We comply with all data protection regulations.
        </p>
      </div>
    </div>
  </div>
);

export default VerificationSteps;