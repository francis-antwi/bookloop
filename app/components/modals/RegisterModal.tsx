'use client';

import axios from 'axios';
import { IoMdClose } from 'react-icons/io';
import { useCallback, useState, useEffect, useMemo } from 'react';
import { signIn } from "next-auth/react";
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import useRegisterModal from '@/app/hooks/useRegisterModal';
import useLoginModal from '@/app/hooks/useLoginModal';
import toast from 'react-hot-toast';
import { 
  FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, 
  FiCheck, FiArrowRight, FiArrowLeft, FiCamera,
  FiUpload, FiUserCheck, FiShield, FiFileText, FiAlertCircle, FiLoader,
  FiBriefcase, FiMapPin, FiImage, FiTrash2, FiInfo
} from 'react-icons/fi';
import Camera from '../inputs/Camera';
import PhoneAuth from "@/app/components/PhoneAuth";
import { useRouter } from 'next/navigation';
import { categories } from '../navbar/Categories';

interface VerificationResponse {
  success: boolean;
  extractedData?: {
    idName?: string;
    idNumber?: string;
    personalIdNumber?: string;
    idType?: string;
    idDOB?: string;
    idExpiryDate?: string;
    idIssueDate?: string;
    idIssuer?: string;
    nationality?: string;
    gender?: string;
    placeOfIssue?: string;
    rawText?: string;
    faceConfidence?: number;
  };
  matchConfidence?: number;
  selfieUrl?: string;
  imageUrl?: string;
  error?: string;
}

interface BusinessFiles {
  tinCertificate: File | null;
  incorporationCert: File | null;
  vatCertificate: File | null;
  ssnitCert: File | null;
}

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selfieImageBlob, setSelfieImageBlob] = useState<Blob | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    confidence?: number;
    error?: string;
  } | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [businessFiles, setBusinessFiles] = useState<BusinessFiles>({
    tinCertificate: null,
    incorporationCert: null,
    vatCertificate: null,
    ssnitCert: null
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
    getValues,
    reset,
    unregister,
  } = useForm<FieldValues>({
    defaultValues: {
      name: '',
      email: '',
      contactPhone: '',
      password: '',
      role: '',
      tinNumber: '',
      registrationNumber: '',
      businessName: '',
      businessType: '',
      businessAddress: '',
      businessPhone: ''
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    if (watchedValues.businessType === 'COMPANY') {
      register('registrationNumber', { required: 'Registration number is required for companies' });
    } else {
      unregister('registrationNumber');
    }
  }, [watchedValues.businessType, register, unregister]);

  const handlePhoneVerified = (phoneNumber: string, otp: string) => {
    setIsPhoneVerified(true);
    toast.success('Phone number verified successfully!');
  };

  const steps = [
    { 
      field: 'name', 
      label: 'Full Name', 
      icon: FiUser, 
      placeholder: 'Enter your full name',
      description: 'Let us know what to call you'
    },
    { 
      field: 'email', 
      label: 'Email Address', 
      icon: FiMail, 
      placeholder: 'Enter your email address',
      description: 'We\'ll use this to send you updates'
    },
    { 
      field: 'contactPhone', 
      label: 'Phone Number', 
      icon: FiPhone, 
      placeholder: 'Enter your phone number',
      description: 'For account security and notifications'
    },
    { 
      field: 'phoneVerification', 
      label: 'Verify Phone Number',
      icon: FiShield,
      description: 'We\'ll send a verification code to your phone'
    },
    { 
      field: 'password', 
      label: 'Password', 
      icon: FiLock, 
      placeholder: 'Create a secure password',
      description: 'Minimum 6 characters recommended'
    },
    { 
      field: 'role', 
      label: 'Account Type',
      icon: FiUserCheck,
      description: 'Choose how you\'ll use our platform'
    },
    { 
      field: 'selfieImage', 
      label: 'Verify Identity',
      icon: FiCamera,
      description: 'Take a clear photo of yourself',
      providerOnly: true
    },
    { 
      field: 'idImage', 
      label: 'Upload ID',
      icon: FiFileText,
      description: 'Upload a photo of your Ghana Card',
      providerOnly: true
    },
    { 
      field: 'businessInfo', 
      label: 'Business Information',
      icon: FiBriefcase,
      description: 'Provide your business details',
      providerOnly: true
    },
  ];

  const getFilteredSteps = () => {
    if (watchedValues.role === 'CUSTOMER') {
      return steps.filter(step => !step.providerOnly);
    }
    return steps;
  };

  const filteredSteps = getFilteredSteps();

  const handleIdUpload = (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPEG/PNG images are allowed');
      return;
    }

    // Validate file size
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('Image too large. Max 5MB allowed.');
      return;
    }

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      if (img.width < 800 || img.height < 600) {
        toast.error('Image resolution too low. Please use a higher quality image.');
        return;
      }
      setIdFile(file);
      toast.success('ID image accepted');
    };
    img.onerror = () => {
      toast.error('Invalid image file');
    };
  };

  const onFileUpload = (field: keyof BusinessFiles, file: File) => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPEG, PNG, JPG, or PDF files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setBusinessFiles(prev => ({
      ...prev,
      [field]: file
    }));

    toast.success(`${field.replace(/([A-Z])/g, ' $1')} uploaded successfully`);
  };

  const submitVerification = async (isBusinessVerification = false): Promise<VerificationResponse> => {
    if (!isBusinessVerification && (!selfieImageBlob || !idFile)) {
      toast.error('Please complete all verification steps');
      throw new Error('Missing verification files');
    }

    setIsLoading(true);
    setVerificationStatus(null);

    try {
      const verificationFormData = new FormData();
      if (selfieImageBlob) {
        verificationFormData.append('selfie', new File([selfieImageBlob], 'selfie.jpg'));
      }
      if (idFile) {
        verificationFormData.append('idImage', idFile);
      }
      verificationFormData.append('email', watchedValues.email);
      verificationFormData.append('verificationStep', isBusinessVerification ? 'business' : 'identity');

      const response = await axios.post<VerificationResponse>('/api/verify', verificationFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Verification failed');
      }

      const extractedData = response.data.extractedData || {};
      const confidence = response.data.matchConfidence || extractedData.faceConfidence || 0;

      if (confidence < 80) {
        throw new Error(`Face match confidence too low (${confidence.toFixed(1)}%)`);
      }

      setVerificationStatus({ success: true, confidence });
      return response.data;
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || 'Verification failed';
      setVerificationStatus({ 
        success: false, 
        error: errorMsg,
        confidence: error.response?.data?.matchConfidence
      });
      toast.error(errorMsg);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);
    
    try {
      const registrationPayload: any = {
        name: data.name,
        email: data.email,
        contactPhone: data.contactPhone,
        password: data.password,
        role: data.role,
        isPhoneVerified: true,
        isFaceVerified: data.role === 'PROVIDER',
        verified: data.role === 'PROVIDER',
        extractionComplete: data.role === 'PROVIDER',
        nationality: 'Ghanaian',
        idType: 'GHANA_CARD'
      };

      if (data.role === 'PROVIDER') {
        try {
          const verificationData = await submitVerification(false);
          
          if (!verificationData.success || !verificationData.selfieUrl || !verificationData.imageUrl) {
            throw new Error('Identity verification failed');
          }

          const extractedData = verificationData.extractedData || {};
          const idNumber = extractedData.idNumber || extractedData.personalIdNumber || '';
          const faceConfidence = verificationData.matchConfidence || 0;

          if (faceConfidence < 80) {
            throw new Error(`Face match confidence too low (${faceConfidence.toFixed(1)}%)`);
          }

          Object.assign(registrationPayload, {
            isFaceVerified: true,
            verified: false,
            extractionComplete: true,
            selfieImage: verificationData.selfieUrl,
            idImage: verificationData.imageUrl,
            faceConfidence,
            idName: extractedData.idName || '',
            idNumber,
            personalIdNumber: extractedData.personalIdNumber || '',
            idDOB: extractedData.idDOB || '',
            idExpiryDate: extractedData.idExpiryDate || '',
            idIssueDate: extractedData.idIssueDate || '',
            idIssuer: extractedData.idIssuer || '',
            gender: extractedData.gender || '',
            placeOfIssue: extractedData.placeOfIssue || '',
            rawText: extractedData.rawText || '',
            ...(data.tinNumber && { tinNumber: data.tinNumber }),
            businessName: data.businessName || '',
            businessType: data.businessType || '',
            businessAddress: data.businessAddress || '',
            businessPhone: data.businessPhone || '',
            registrationNumber: data.registrationNumber || '',
            requiresApproval: true,
            status: 'PENDING_REVIEW',
            businessVerified: false
          });

          const hasBusinessFiles = Object.values(businessFiles).some(file => file !== null);
          if (hasBusinessFiles) {
            const businessFormData = new FormData();
            Object.entries(businessFiles).forEach(([key, file]) => {
              if (file) businessFormData.append(key, file);
            });

            const uploadResponse = await axios.post('/api/verify', businessFormData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              params: { verificationStep: 'business' }
            });

            if (uploadResponse.data.success) {
              Object.assign(registrationPayload, {
                tinCertificateUrl: uploadResponse.data.tinCertificateUrl,
                incorporationCertUrl: uploadResponse.data.incorporationCertUrl,
                vatCertificateUrl: uploadResponse.data.vatCertificateUrl,
                ssnitCertUrl: uploadResponse.data.ssnitCertUrl,
              });
            }
          }

        } catch (error: any) {
          throw new Error(`Provider registration failed: ${error.message}`);
        }
      }

      const response = await axios.post('/api/register', registrationPayload);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Registration failed');
      }

      if (response.data.shouldAutoLogin) {
        const loginResult = await signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false
        });

        if (loginResult?.error) {
          throw new Error('Auto-login failed');
        }

        toast.success('Account created and logged in!');
        
        if (data.role === 'PROVIDER') {
          router.push('/pending-approval');
        } else {
          router.push('/');
        }
      } else {
        toast.success('Account created successfully!');
        loginModal.onOpen();
      }

      registerModal.onClose();
      reset();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 
                     error.response?.data?.message || 
                     error.message || 
                     'Registration failed';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(() => {
    if (isLoading) return;
    loginModal.onOpen();
    registerModal.onClose();
  }, [isLoading, loginModal, registerModal]);

  const handleNext = async () => {
    const current = filteredSteps[currentStep];
    
    if (current.field === 'phoneVerification') {
      if (!isPhoneVerified) {
        toast.error('Please verify your phone number first');
        return;
      }
      setCurrentStep(prev => prev + 1);
      return;
    }

    const valid = await trigger(current.field);
    if (!valid) return;

    if (current.field === 'role' && watchedValues.role === 'CUSTOMER') {
      setCurrentStep(filteredSteps.length - 1);
      return;
    }

    setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const jumpToStep = (stepIndex: number) => {
    if (stepIndex < currentStep || isStepValid(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  const isStepValid = (stepIndex: number) => {
    const field = filteredSteps[stepIndex].field;
    if (field === 'phoneVerification') return true;
    if (field === 'selfieImage') return !!selfieImageBlob;
    if (field === 'idImage') return !!idFile;
    if (field === 'businessInfo') {
      return (
        !!watchedValues.tinNumber &&
        !!watchedValues.businessName &&
        !!watchedValues.businessType &&
        !!businessFiles.tinCertificate
      );
    }
    if (field === 'role') return !!watchedValues.role && !errors.role;
    return watchedValues[field]?.trim().length > 0 && !errors[field];
  };

  const canProceed = isStepValid(currentStep);
  const allFieldsComplete = filteredSteps.every((_, i) => isStepValid(i));

  const FileUpload = ({ label, file, onFileUpload, required = false }: {
    label: string;
    file: File | null;
    onFileUpload: (file: File) => void;
    required?: boolean;
  }) => {
    const inputId = `file-${label.toLowerCase().replace(/\s+/g, '-')}`;
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type="file"
            id={inputId}
            accept="image/*,.pdf"
            onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
            className="hidden"
            disabled={isLoading}
          />
          <label
            htmlFor={inputId}
            className={`cursor-pointer block border-2 border-dashed border-gray-300 rounded-lg p-4 text-center transition-all duration-200 ${
              isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              <FiUpload className="text-gray-400" />
              <span className="text-sm text-gray-600">
                {file ? file.name : 'Choose file or drag here'}
              </span>
            </div>
          </label>
          {file && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <FiCheck className="text-white text-xs" />
            </div>
          )}
        </div>
        {file && file.type.startsWith('image/') && (
          <div className="mt-2">
            <img 
              src={URL.createObjectURL(file)} 
              alt="Preview" 
              className="h-20 object-contain border rounded"
            />
          </div>
        )}
      </div>
    );
  };

  const BusinessStep = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            TIN Number *
          </label>
          <input
            type="text"
            {...register('tinNumber', { 
              required: 'TIN number is required',
              pattern: {
                value: /^[A-Z0-9]{8,15}$/,
                message: 'Please enter a valid TIN number'
              }
            })}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-blue-500 ${
              errors.tinNumber 
                ? 'border-red-300 bg-red-50' 
                : watchedValues.tinNumber 
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
            }`}
            placeholder="Enter TIN number"
            disabled={isLoading}
          />
          {errors.tinNumber && (
            <p className="text-red-500 text-xs mt-1">
              {errors.tinNumber.message}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Registration Number
            {watchedValues.businessType === 'COMPANY' && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="text"
            {...register('registrationNumber')}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-blue-500 ${
              errors.registrationNumber 
                ? 'border-red-300 bg-red-50' 
                : watchedValues.registrationNumber 
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
            }`}
            placeholder="Enter registration number"
            disabled={isLoading}
          />
          {errors.registrationNumber && (
            <p className="text-red-500 text-xs mt-1">
              {errors.registrationNumber.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Name *
        </label>
        <input
          type="text"
          {...register('businessName', { 
            required: 'Business name is required',
            minLength: {
              value: 3,
              message: 'Business name must be at least 3 characters'
            }
          })}
          className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-blue-500 ${
            errors.businessName 
              ? 'border-red-300 bg-red-50' 
              : watchedValues.businessName 
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300'
          }`}
          placeholder="Enter business name"
          disabled={isLoading}
        />
        {errors.businessName && (
          <p className="text-red-500 text-xs mt-1">
            {errors.businessName.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type *
          </label>
          <select
            {...register('businessType', { required: 'Business type is required' })}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-blue-500 ${
              errors.businessType 
                ? 'border-red-300 bg-red-50' 
                : watchedValues.businessType 
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
            }`}
            disabled={isLoading}
          >
            <option value="">Select business type</option>
            {categories.map((cat) => (
              <option key={cat.label} value={cat.label}>
                {cat.label}
              </option>
            ))}
          </select>
          {errors.businessType && (
            <p className="text-red-500 text-xs mt-1">
              {errors.businessType.message}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Phone
          </label>
          <input
            type="tel"
            {...register('businessPhone')}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-blue-500 ${
              watchedValues.businessPhone 
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300'
            }`}
            placeholder="Enter business phone"
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Address
        </label>
        <textarea
          {...register('businessAddress')}
          className={`w-full p-3 border rounded-lg focus:ring-2 focus:border-blue-500 ${
            watchedValues.businessAddress 
              ? 'border-green-300 bg-green-50'
              : 'border-gray-300'
          }`}
          rows={3}
          placeholder="Enter business address"
          disabled={isLoading}
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
    </div>
  );

  if (!registerModal.isOpen) return null;

  const currentField = filteredSteps[currentStep];
  const IconComponent = currentField.icon;
  const progress = ((currentStep + 1) / filteredSteps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 my-8">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-5 sm:px-8 sm:py-6 text-white">
          <button 
            onClick={registerModal.onClose} 
            disabled={isLoading}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
          >
            <IoMdClose size={20} />
          </button>
          
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-bold">Join Us</h2>
            <p className="text-blue-100 text-xs sm:text-sm">Create your account in a few simple steps</p>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="flex justify-between text-xs mb-2">
              <span>Step {currentStep + 1} of {filteredSteps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-1">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between px-1">
              {filteredSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => jumpToStep(index)}
                  disabled={index > currentStep && !isStepValid(index)}
                  className={`w-4 h-4 rounded-full transition-colors duration-200 ${
                    index <= currentStep || isStepValid(index)
                      ? 'bg-white cursor-pointer hover:bg-blue-200'
                      : 'bg-white/30 cursor-not-allowed'
                  } ${index === currentStep ? 'ring-2 ring-blue-300' : ''}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          {/* Step Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl mb-3 sm:mb-4">
              <IconComponent className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">
              {currentField.label}
            </h3>
            <p className="text-gray-500 text-xs sm:text-sm">
              {currentField.description}
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 sm:space-y-6">
            {currentField.field === 'phoneVerification' ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-blue-600 mb-1">We'll send a verification code to:</p>
                  <p className="font-medium text-blue-800">{watchedValues.contactPhone}</p>
                </div>

                <PhoneAuth 
                  phoneNumber={watchedValues.contactPhone}
                  onVerified={handlePhoneVerified}
                />

                {isPhoneVerified && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 sm:p-3 rounded-xl text-sm">
                    <FiCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-medium">Phone number verified successfully!</span>
                  </div>
                )}
              </div>
            ) : currentField.field === 'role' ? (
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  {[
                    { value: 'CUSTOMER', label: 'Customer', desc: 'Looking for services' },
                    { value: 'PROVIDER', label: 'Provider', desc: 'Offering services' }
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`relative flex items-center p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        watchedValues.role === option.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        {...register('role', { required: 'Role is required' })}
                        type="radio"
                        value={option.value}
                        disabled={isLoading}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 text-sm sm:text-base">{option.label}</div>
                        <div className="text-xs sm:text-sm text-gray-500">{option.desc}</div>
                      </div>
                      {watchedValues.role === option.value && (
                        <FiCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                      )}
                    </label>
                  ))}
                </div>
                {errors.role && (
                  <p className="text-red-500 text-xs sm:text-sm flex items-center gap-2">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors.role.message}
                  </p>
                )}
              </div>
            ) : currentField.field === 'selfieImage' ? (
              <div className="space-y-3 sm:space-y-4">
                <Camera onCapture={(blob) => setSelfieImageBlob(blob)} />
                {selfieImageBlob && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 sm:p-3 rounded-xl text-sm">
                    <FiCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-medium">Selfie captured successfully</span>
                  </div>
                )}
              </div>
            ) : currentField.field === 'idImage' ? (
              <div className="space-y-4">
                <div className="flex gap-3">
                  {/* Camera Option */}
                  <label className="flex-1 text-center border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer">
                    <FiCamera className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <span className="block font-medium">Take Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => e.target.files?.[0] && handleIdUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </label>

                  {/* Gallery Option */}
                  <label className="flex-1 text-center border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 transition-colors cursor-pointer">
                    <FiImage className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <span className="block font-medium">Choose from Gallery</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleIdUpload(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>

                {idFile && (
                  <div className="mt-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                      <FiCheck className="text-green-500 mr-2" />
                      <span className="font-medium">ID uploaded successfully</span>
                      <button 
                        onClick={() => setIdFile(null)}
                        className="ml-auto text-red-500 hover:text-red-700"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                    <img 
                      src={URL.createObjectURL(idFile)} 
                      alt="ID Preview" 
                      className="mt-2 max-h-40 mx-auto border rounded"
                    />
                    <div className="text-xs text-gray-500 mt-1 text-center">
                      {idFile.name} - {(idFile.size / 1024 / 1024).toFixed(2)}MB
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mt-4">
                  <FiInfo className="inline mr-2" />
                  Make sure your ID is clearly visible and all details are readable
                </div>
              </div>
            ) : currentField.field === 'businessInfo' ? (
              <BusinessStep />
            ) : (
              <div className="space-y-1 sm:space-y-2">
                <div className="relative">
                  <div className={`flex items-center border-2 rounded-xl px-3 py-2 sm:px-4 sm:py-3 transition-all duration-200 ${
                    errors[currentField.field] 
                      ? 'border-red-300 bg-red-50' 
                      : watchedValues[currentField.field]?.trim().length > 0 
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 focus-within:border-blue-500'
                  }`}>
                    <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 ${
                      errors[currentField.field] 
                        ? 'text-red-400' 
                        : watchedValues[currentField.field]?.trim().length > 0 
                          ? 'text-green-500'
                          : 'text-gray-400'
                    }`} />
                    <input
                      {...register(currentField.field, {
                        required: `${currentField.label} is required`,
                        ...(currentField.field === 'email' && {
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Please enter a valid email address',
                          },
                        }),
                        ...(currentField.field === 'contactPhone' && {
                          pattern: {
                            value: /^[0-9+\-\s()]+$/,
                            message: 'Please enter a valid phone number',
                          },
                          minLength: { value: 10, message: 'Phone number must be at least 10 digits' },
                        }),
                        ...(currentField.field === 'password' && {
                          minLength: { value: 6, message: 'Password must be at least 6 characters' },
                        }),
                      })}
                      placeholder={currentField.placeholder}
                      type={
                        currentField.field === 'password' && !showPassword
                          ? 'password'
                          : currentField.field === 'email'
                          ? 'email'
                          : currentField.field === 'contactPhone'
                          ? 'tel'
                          : 'text'
                      }
                      className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                      disabled={isLoading}
                    />
                    {currentField.field === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        {showPassword ? <FiEyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <FiEye className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                    )}
                    {watchedValues[currentField.field]?.trim().length > 0 && !errors[currentField.field] && (
                      <FiCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                    )}
                  </div>
                </div>
                {errors[currentField.field] && (
                  <p className="text-red-500 text-xs sm:text-sm flex items-center gap-2 mt-1 sm:mt-2">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors[currentField.field]?.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Verification Status */}
          {verificationStatus && !verificationStatus.success && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-2 sm:gap-3">
                <FiAlertCircle className="text-red-500 text-xl mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Verification Failed</p>
                  <p className="text-sm text-red-600 mt-1">
                    {verificationStatus.error}
                    {verificationStatus.confidence && (
                      <span> (Confidence: {verificationStatus.confidence.toFixed(1)}%)</span>
                    )}
                  </p>
                  <button
                    onClick={() => {
                      setSelfieImageBlob(null);
                      setIdFile(null);
                      setVerificationStatus(null);
                    }}
                    className="mt-1 sm:mt-2 text-xs sm:text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                  >
                    Retry Verification
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-between items-center">
            {currentStep > 0 ? (
              <button
                onClick={handlePrev}
                disabled={isLoading}
                className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-1 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 text-sm sm:text-base"
              >
                <FiArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                Previous
              </button>
            ) : (
              <div></div>
            )}

            {currentStep < filteredSteps.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed || isLoading}
                className={`flex items-center gap-1 sm:gap-2 px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base ${
                  canProceed && !isLoading
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue
                <FiArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={!allFieldsComplete || isLoading}
                className={`flex items-center gap-1 sm:gap-2 px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base ${
                  allFieldsComplete && !isLoading
                    ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <>
                    <FiLoader className="animate-spin text-lg" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    Create Account
                    <FiCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Login Link */}
          <div className="text-center mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
            <p className="text-gray-600 text-xs sm:text-sm">
              Already have an account?{' '}
              <button
                onClick={toggle}
                disabled={isLoading}
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;