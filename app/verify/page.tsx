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
  FiAlertCircle,
  FiBriefcase,
  FiCamera
} from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface VerificationStepsProps {
  onComplete: () => void;
}

enum ServiceCategory {
  APARTMENTS = "Apartments",
  CARS = "Cars",
  EVENT_CENTERS = "Event Centers",
  HOTEL_ROOMS = "Hotel Rooms",
  TOUR_SERVICES = "Tour Services",
  EVENT_TICKETS = "Event Tickets",
  RESTAURANTS = "Restaurants",
  APPOINTMENTS = "Appointments"
}

interface BusinessFormData {
  tinNumber: string;
  registrationNumber: string;
  businessName: string;
  businessType: ServiceCategory[];
  businessAddress: string;
  contactPhone: string;
}

interface BusinessFiles {
  tinCertificate: File | null;
  incorporationCert: File | null;
  vatCertificate: File | null;
  ssnitCert: File | null;
}

interface IdentityVerificationStatus {
  success: boolean;
  confidence?: number;
  error?: string;
}

const VerificationSteps = ({ onComplete }: VerificationStepsProps) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState<'selfie' | 'id' | 'business'>('selfie');
  const [selfieImageFile, setSelfieImageFile] = useState<Blob | null>(null);
  const [idImageFile, setIdImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [identityVerificationStatus, setIdentityVerificationStatus] = useState<IdentityVerificationStatus | null>(null);

  const [collectedData, setCollectedData] = useState({
    email: session?.user?.email || '',
    name: session?.user?.name || '',
    role: "PROVIDER" as const,
  });

  const [businessFormData, setBusinessFormData] = useState<BusinessFormData>({
    tinNumber: '',
    registrationNumber: '',
    businessName: '',
    businessType: [],
    businessAddress: '',
    contactPhone: '',
  });

  const [businessFiles, setBusinessFiles] = useState<BusinessFiles>({
    tinCertificate: null,
    incorporationCert: null,
    vatCertificate: null,
    ssnitCert: null
  });

  const handleSelfieCapture = (blob: Blob) => {
    setSelfieImageFile(blob);
    setIdentityVerificationStatus(null);
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
    setIdImageFile(file);
    setIdentityVerificationStatus(null);
  };

  const handleBusinessDataChange = <K extends keyof BusinessFormData>(
    field: K, 
    value: BusinessFormData[K]
  ) => {
    setBusinessFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleBusinessFileUpload = <K extends keyof BusinessFiles>(
    field: K,
    file: File
  ) => {
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

  const handleBusinessTypeChange = (category: ServiceCategory, isChecked: boolean) => {
    setBusinessFormData(prev => {
      const currentTypes = [...prev.businessType];
      if (isChecked) {
        return {
          ...prev,
          businessType: [...currentTypes, category]
        };
      } else {
        return {
          ...prev,
          businessType: currentTypes.filter(type => type !== category)
        };
      }
    });
  };

  const submitIdentityVerification = async () => {
    if (!selfieImageFile || !idImageFile) {
      toast.error('Please complete all identity verification steps');
      return;
    }

    setIsLoading(true);
    setIdentityVerificationStatus(null);

    try {
      const verificationFormData = new FormData();
      verificationFormData.append('selfie', new File([selfieImageFile], 'selfie.jpg', { type: 'image/jpeg' }));
      verificationFormData.append('idImage', idImageFile);
      verificationFormData.append('verificationStep', 'identity');

      const response = await axios.post('/api/verify', verificationFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Identity verification failed');
      }

      setIdentityVerificationStatus({ 
        success: true, 
        confidence: response.data.matchConfidence 
      });
      toast.success('Identity verification complete!');

      setCollectedData(prev => ({
        ...prev,
        selfieImage: response.data.selfieUrl,
        idImage: response.data.idUrl,
        faceConfidence: response.data.matchConfidence,
        ...response.data.extractedData,
        verified: true,
        extractionComplete: true,
        businessVerified: false
      }));

      setTimeout(() => {
        setCurrentStep('business');
      }, 1500);

    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Verification failed';
      setIdentityVerificationStatus({ success: false, error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const submitBusinessVerification = async () => {
    if (!businessFormData.tinNumber || 
        !businessFormData.businessName || 
        businessFormData.businessType.length === 0) {
      toast.error('Please fill in all required business information');
      return;
    }
    if (!businessFiles.tinCertificate) {
      toast.error('TIN Certificate is required');
      return;
    }

    setIsLoading(true);

    try {
      const businessUploadFormData = new FormData();
      businessUploadFormData.append('verificationStep', 'business');
      
      Object.entries(businessFiles).forEach(([key, file]) => {
        if (file) businessUploadFormData.append(key, file);
      });

      const uploadResponse = await axios.post('/api/verify', businessUploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.error || 'Business document upload failed');
      }

      toast.success('Business documents uploaded!');

      const finalRegistrationData = {
        ...collectedData,
        ...businessFormData,
        tinCertificateUrl: uploadResponse.data.tinCertificateUrl,
        incorporationCertUrl: uploadResponse.data.incorporationCertUrl,
        vatCertificateUrl: uploadResponse.data.vatCertificateUrl,
        ssnitCertUrl: uploadResponse.data.ssnitCertUrl,
        role: "PROVIDER",
        isFullProviderRegistration: true,
      };

      const registerRes = await axios.post('/api/register', finalRegistrationData);
      
      if (!registerRes.data.success) {
        throw new Error(registerRes.data.message || "Registration failed");
      }

      toast.success('Business verification submitted for review!');
      router.push('/pending-approval');
      onComplete();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Business verification failed';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 'selfie' && selfieImageFile) {
      setCurrentStep('id');
    } else if (currentStep === 'id' && idImageFile) {
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
    if (currentStep === 'business') return 3;
    return 1;
  };

  const canProceedFromSelfie = () => selfieImageFile !== null;
  const canProceedFromId = () => idImageFile !== null;
  const canSubmitBusiness = () => {
    return businessFormData.tinNumber && 
           businessFormData.businessName && 
           businessFormData.businessType.length > 0 && 
           businessFiles.tinCertificate;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <FiShield className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Seller Verification</h1>
          <p className="text-gray-600">Complete verification to start selling services</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {['selfie', 'id', 'business'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                getStepNumber() > index + 1 ? 'bg-green-500 text-white' :
                getStepNumber() === index + 1 ? 'bg-blue-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {getStepNumber() > index + 1 ? <FiCheck /> : index + 1}
              </div>
              {index < 2 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  getStepNumber() > index + 1 ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Status Messages */}
        {identityVerificationStatus?.success === false && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-red-500 text-lg mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-800">Verification Failed</p>
                <p className="text-sm text-red-600 mt-1">{identityVerificationStatus.error}</p>
              </div>
            </div>
          </div>
        )}

        {identityVerificationStatus?.success === true && currentStep === 'id' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <FiCheck className="text-green-500 text-lg mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800">Identity Verified!</p>
                <p className="text-sm text-green-600 mt-1">
                  Match confidence: {identityVerificationStatus.confidence}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {currentStep === 'selfie' && (
            <SelfieStep
              selfieImage={selfieImageFile}
              onSelfieCapture={handleSelfieCapture}
              onNext={nextStep}
              canProceed={canProceedFromSelfie()}
            />
          )}
          
          {currentStep === 'id' && (
            <IDStep
              idFile={idImageFile}
              onIdUpload={handleIdUpload}
              onBack={prevStep}
              onNext={nextStep}
              isLoading={isLoading}
              canProceed={canProceedFromId()}
            />
          )}
          
          {currentStep === 'business' && (
            <BusinessStep
              businessData={businessFormData}
              businessFiles={businessFiles}
              onDataChange={handleBusinessDataChange}
              onFileUpload={handleBusinessFileUpload}
              onBusinessTypeChange={handleBusinessTypeChange}
              onBack={prevStep}
              onSubmit={submitBusinessVerification}
              isLoading={isLoading}
              canSubmit={canSubmitBusiness()}
              identityVerified={identityVerificationStatus?.success === true}
            />
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <FiShield className="text-blue-500 text-lg mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-800">Secure & Encrypted</p>
              <p className="text-sm text-blue-600 mt-1">
                Your information is protected with bank-level security
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
interface SelfieStepProps {
  selfieImage: Blob | null;
  onSelfieCapture: (blob: Blob) => void;
  onNext: () => void;
  canProceed: boolean;
}

const SelfieStep = ({ selfieImage, onSelfieCapture, onNext, canProceed }: SelfieStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
        <FiUser className="text-blue-600 text-xl" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Take a Selfie</h2>
      <p className="text-gray-600">Position your face in the camera frame</p>
    </div>
    
    <div className="relative">
      {/* Replace with your actual Camera component */}
      <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
        <button 
          onClick={() => onSelfieCapture(new Blob())}
          className="p-4 bg-white rounded-full shadow-md"
        >
          <FiCamera className="text-blue-500 text-2xl" />
        </button>
      </div>
      {selfieImage && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <FiCheck className="text-white text-sm" />
        </div>
      )}
    </div>
    
    <button
      onClick={onNext}
      disabled={!canProceed}
      className="w-full py-3 px-4 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
    >
      Continue <FiArrowRight />
    </button>
  </div>
);

interface IDStepProps {
  idFile: File | null;
  onIdUpload: (file: File) => void;
  onBack: () => void;
  onNext: () => void;
  isLoading: boolean;
  canProceed: boolean;
}

const IDStep = ({ idFile, onIdUpload, onBack, onNext, isLoading, canProceed }: IDStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="w-12 h-12 bg-indigo-100 rounded-full mx-auto mb-3 flex items-center justify-center">
        <FiFileText className="text-indigo-600 text-xl" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Upload ID Document</h2>
      <p className="text-gray-600">Ghana Card, Passport, or Driver's License</p>
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
        className="cursor-pointer block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
          <FiUpload className="text-gray-400 text-2xl" />
        </div>
        <p className="text-blue-600 font-medium">Upload ID Document</p>
        <p className="text-gray-500 text-sm mt-1">JPEG, PNG (max 5MB)</p>
      </label>
      {idFile && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <FiCheck className="text-white text-sm" />
        </div>
      )}
    </div>
    
    {idFile && (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800 font-medium">Document uploaded</p>
        <p className="text-green-600 text-sm truncate">{idFile.name}</p>
      </div>
    )}
    
    <div className="flex gap-3">
      <button
        onClick={onBack}
        disabled={isLoading}
        className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
      >
        <FiArrowLeft /> Back
      </button>
      <button
        onClick={onNext}
        disabled={!canProceed || isLoading}
        className="flex-1 py-3 px-4 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <FiLoader className="animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            Verify & Continue <FiArrowRight />
          </>
        )}
      </button>
    </div>
  </div>
);

interface BusinessStepProps {
  businessData: BusinessFormData;
  businessFiles: BusinessFiles;
  onDataChange: <K extends keyof BusinessFormData>(field: K, value: BusinessFormData[K]) => void;
  onFileUpload: <K extends keyof BusinessFiles>(field: K, file: File) => void;
  onBusinessTypeChange: (category: ServiceCategory, isChecked: boolean) => void;
  onBack: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  canSubmit: boolean;
  identityVerified: boolean;
}

const BusinessStep = ({ 
  businessData, 
  businessFiles, 
  onDataChange, 
  onFileUpload,
  onBusinessTypeChange,
  onBack, 
  onSubmit, 
  isLoading, 
  canSubmit,
  identityVerified 
}: BusinessStepProps) => {
  const handleFileChange = (field: keyof BusinessFiles, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onFileUpload(field, e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3 flex items-center justify-center">
          <FiBriefcase className="text-purple-600 text-xl" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Business Information</h2>
        <p className="text-gray-600">Provide your business details</p>
      </div>

      {identityVerified && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FiCheck className="text-green-500" />
            <p className="text-green-800 font-medium">Identity Verified</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Type *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.values(ServiceCategory) as ServiceCategory[]).map((category) => (
                <div key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`category-${category}`}
                    checked={businessData.businessType.includes(category)}
                    onChange={(e) => onBusinessTypeChange(category, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`category-${category}`} className="ml-2 text-sm text-gray-700">
                    {category}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Required Documents</h3>
        
        <FileUpload
          label="TIN Certificate *"
          file={businessFiles.tinCertificate}
          onChange={(e) => handleFileChange('tinCertificate', e)}
          required
        />
        
        <FileUpload
          label="Certificate of Incorporation"
          file={businessFiles.incorporationCert}
          onChange={(e) => handleFileChange('incorporationCert', e)}
        />
        
        <FileUpload
          label="VAT Certificate"
          file={businessFiles.vatCertificate}
          onChange={(e) => handleFileChange('vatCertificate', e)}
        />
        
        <FileUpload
          label="SSNIT Certificate"
          file={businessFiles.ssnitCert}
          onChange={(e) => handleFileChange('ssnitCert', e)}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
        >
          <FiArrowLeft /> Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isLoading}
          className="flex-1 py-3 px-4 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <FiLoader className="animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              Submit for Review <FiArrowRight />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

interface FileUploadProps {
  label: string;
  file: File | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

const FileUpload = ({ label, file, onChange, required = false }: FileUploadProps) => {
  const inputId = `file-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="file"
          id={inputId}
          accept="image/*,.pdf"
          onChange={onChange}
          className="hidden"
        />
        <label
          htmlFor={inputId}
          className="cursor-pointer block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <div className="w-8 h-8 bg-gray-100 rounded-full mx-auto mb-2 flex items-center justify-center">
            <FiUpload className="text-gray-400" />
          </div>
          <p className="text-blue-600 font-medium text-sm">Upload {label}</p>
          <p className="text-gray-500 text-xs">PDF, JPEG, PNG (max 10MB)</p>
        </label>
        {file && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
            <FiCheck className="text-white text-xs" />
          </div>
        )}
      </div>
      {file && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 text-sm font-medium">Uploaded</p>
          <p className="text-green-600 text-xs truncate">{file.name}</p>
        </div>
      )}
    </div>
  );
};

export default VerificationSteps;