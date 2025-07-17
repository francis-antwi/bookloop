'use client';

import axios from 'axios';
import { IoMdClose } from 'react-icons/io';
import { useCallback, useState, useMemo } from 'react';
import { signIn } from "next-auth/react";
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import useRegisterModal from '@/app/hooks/useRegisterModal';
import useLoginModal from '@/app/hooks/useLoginModal';
import toast from 'react-hot-toast';
import { 
  FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, 
  FiCheck, FiArrowRight, FiArrowLeft, FiCamera,
  FiUpload, FiUserCheck, FiShield, FiFileText, FiAlertCircle, FiLoader,
  FiBriefcase, FiMapPin
} from 'react-icons/fi';
import Camera from '../inputs/Camera';
import { useRouter } from 'next/navigation';
import { categories } from '../navbar/Categories';

type VerificationStep = 'account' | 'identity' | 'business';

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

const FileUpload = ({ 
  label, 
  file, 
  onFileUpload, 
  required = false, 
  isLoading 
}: {
  label: string;
  file: File | null;
  onFileUpload: (file: File) => void;
  required?: boolean;
  isLoading: boolean;
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
    </div>
  );
};

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState<VerificationStep>('account');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selfieImageBlob, setSelfieImageBlob] = useState<Blob | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    confidence?: number;
    error?: string;
  } | null>(null);
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
    reset,
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

  const handleIdUpload = useCallback((file: File) => {
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
  }, []);

  const onFileUpload = useCallback((field: keyof BusinessFiles, file: File) => {
    if (!file.type.match(/image\/(jpeg|png|jpg)|application\/pdf/)) {
      toast.error('Only JPEG/PNG/PDF files are allowed');
      return;
    }
    if (file.size > 10000000) {
      toast.error('File too large. Max 10MB.');
      return;
    }
    setBusinessFiles(prev => ({ ...prev, [field]: file }));
  }, []);

  const submitVerification = useCallback(async () => {
    if (!selfieImageBlob || !idFile) {
      toast.error('Please complete all identity verification steps');
      throw new Error('Missing selfie or ID for identity verification');
    }

    setIsLoading(true);
    setVerificationStatus(null);

    try {
      const verificationFormData = new FormData();
      verificationFormData.append('selfie', new File([selfieImageBlob], 'selfie.jpg', { type: 'image/jpeg' }));
      verificationFormData.append('idImage', idFile);
      verificationFormData.append('email', watchedValues.email);
      verificationFormData.append('verificationStep', 'identity');

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
      return {
        ...response.data,
        extractedData: {
          ...extractedData,
          idType: extractedData.idType || 'GHANA_CARD',
          nationality: extractedData.nationality || 'Ghanaian'
        }
      };
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
  }, [selfieImageBlob, idFile, watchedValues.email]);

  const onSubmit: SubmitHandler<FieldValues> = useCallback(async (data) => {
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
        const verificationData = await submitVerification();
        const extractedData = verificationData?.extractedData || {};
        
        Object.assign(registrationPayload, {
          selfieImage: verificationData.selfieUrl,
          idImage: verificationData.imageUrl,
          faceConfidence: verificationData.matchConfidence,
          idName: extractedData.idName,
          idNumber: extractedData.idNumber || extractedData.personalIdNumber,
          personalIdNumber: extractedData.personalIdNumber,
          idDOB: extractedData.idDOB,
          idExpiryDate: extractedData.idExpiryDate,
          idIssueDate: extractedData.idIssueDate,
          idIssuer: extractedData.idIssuer,
          gender: extractedData.gender,
          placeOfIssue: extractedData.placeOfIssue,
          rawText: extractedData.rawText,
          requiresApproval: true, 
          status: 'PENDING_REVIEW',
          tinNumber: data.tinNumber,
          businessName: data.businessName,
          businessType: data.businessType,
          businessAddress: data.businessAddress,
          businessPhone: data.businessPhone,
          registrationNumber: data.registrationNumber,
          businessVerified: false,
          idImage: idImageUrl,
          tinCertificateUrl: tinCertificateUrl,
        });

        const businessFormData = new FormData();
        Object.entries(businessFiles).forEach(([key, file]) => {
          if (file) businessFormData.append(key, file);
        });

        const uploadResponse = await axios.post('/api/verify', businessFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000
        });

        if (!uploadResponse.data.success) {
          throw new Error(uploadResponse.data.error || 'Business document upload failed');
        }

        Object.assign(registrationPayload, {
          tinCertificateUrl: uploadResponse.data.tinCertificateUrl,
          incorporationCertUrl: uploadResponse.data.incorporationCertUrl,
          vatCertificateUrl: uploadResponse.data.vatCertificateUrl,
          ssnitCertUrl: uploadResponse.data.ssnitCertUrl,
        });
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
  }, [submitVerification, businessFiles, router, loginModal, registerModal, reset]);

  const toggle = useCallback(() => {
    if (isLoading) return;
    loginModal.onOpen();
    registerModal.onClose();
  }, [isLoading, loginModal, registerModal]);

  const handleNext = useCallback(async () => {
    if (currentStep === 'account') {
      const valid = await trigger(['name', 'email', 'contactPhone', 'password', 'role']);
      if (!valid) return;

      if (watchedValues.role === 'CUSTOMER') {
        return handleSubmit(onSubmit)();
      }
      setCurrentStep('identity');
    } else if (currentStep === 'identity') {
      if (!selfieImageBlob || !idFile) {
        toast.error('Please complete identity verification');
        return;
      }
      setCurrentStep('business');
    }
  }, [currentStep, trigger, watchedValues.role, handleSubmit, onSubmit, selfieImageBlob, idFile]);

  const handlePrev = useCallback(() => {
    if (currentStep === 'business') {
      setCurrentStep('identity');
    } else if (currentStep === 'identity') {
      setCurrentStep('account');
    }
  }, [currentStep]);

  const renderStep = () => {
    switch (currentStep) {
      case 'account':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* Name Field */}
            <div className="space-y-1 sm:space-y-2">
              <div className="relative">
                <div className={`flex items-center border-2 rounded-xl px-3 py-2 sm:px-4 sm:py-3 transition-all duration-200 ${
                  errors.name 
                    ? 'border-red-300 bg-red-50' 
                    : watchedValues.name?.trim().length > 0 
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 focus-within:border-blue-500'
                }`}>
                  <FiUser className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 ${
                    errors.name 
                      ? 'text-red-400' 
                      : watchedValues.name?.trim().length > 0 
                        ? 'text-green-500'
                        : 'text-gray-400'
                  }`} />
                  <input
                    {...register('name', { required: 'Full name is required' })}
                    placeholder="Enter your full name"
                    className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                    disabled={isLoading}
                  />
                </div>
                {errors.name && (
                  <p className="text-red-500 text-xs sm:text-sm flex items-center gap-2 mt-1 sm:mt-2">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1 sm:space-y-2">
              <div className="relative">
                <div className={`flex items-center border-2 rounded-xl px-3 py-2 sm:px-4 sm:py-3 transition-all duration-200 ${
                  errors.email 
                    ? 'border-red-300 bg-red-50' 
                    : watchedValues.email?.trim().length > 0 
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 focus-within:border-blue-500'
                }`}>
                  <FiMail className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 ${
                    errors.email 
                      ? 'text-red-400' 
                      : watchedValues.email?.trim().length > 0 
                        ? 'text-green-500'
                        : 'text-gray-400'
                  }`} />
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Please enter a valid email address',
                      },
                    })}
                    placeholder="Enter your email address"
                    type="email"
                    className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                    disabled={isLoading}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs sm:text-sm flex items-center gap-2 mt-1 sm:mt-2">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Phone Field */}
            <div className="space-y-1 sm:space-y-2">
              <div className="relative">
                <div className={`flex items-center border-2 rounded-xl px-3 py-2 sm:px-4 sm:py-3 transition-all duration-200 ${
                  errors.contactPhone 
                    ? 'border-red-300 bg-red-50' 
                    : watchedValues.contactPhone?.trim().length > 0 
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 focus-within:border-blue-500'
                }`}>
                  <FiPhone className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 ${
                    errors.contactPhone 
                      ? 'text-red-400' 
                      : watchedValues.contactPhone?.trim().length > 0 
                        ? 'text-green-500'
                        : 'text-gray-400'
                  }`} />
                  <input
                    {...register('contactPhone', {
                      required: 'Phone number is required',
                      pattern: {
                        value: /^[0-9+\-\s()]+$/,
                        message: 'Please enter a valid phone number',
                      },
                      minLength: { value: 10, message: 'Phone number must be at least 10 digits' },
                    })}
                    placeholder="Enter your phone number"
                    type="tel"
                    className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                    disabled={isLoading}
                  />
                </div>
                {errors.contactPhone && (
                  <p className="text-red-500 text-xs sm:text-sm flex items-center gap-2 mt-1 sm:mt-2">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors.contactPhone.message}
                  </p>
                )}
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1 sm:space-y-2">
              <div className="relative">
                <div className={`flex items-center border-2 rounded-xl px-3 py-2 sm:px-4 sm:py-3 transition-all duration-200 ${
                  errors.password 
                    ? 'border-red-300 bg-red-50' 
                    : watchedValues.password?.trim().length > 0 
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300 focus-within:border-blue-500'
                }`}>
                  <FiLock className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 ${
                    errors.password 
                      ? 'text-red-400' 
                      : watchedValues.password?.trim().length > 0 
                        ? 'text-green-500'
                        : 'text-gray-400'
                  }`} />
                  <input
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 6, message: 'Password must be at least 6 characters' },
                    })}
                    placeholder="Create a secure password"
                    type={showPassword ? 'text' : 'password'}
                    className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    {showPassword ? <FiEyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <FiEye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs sm:text-sm flex items-center gap-2 mt-1 sm:mt-2">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            {/* Role Selection */}
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
          </div>
        );
      case 'identity':
        return (
          <div className="space-y-6">
            {/* Selfie Step */}
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <FiCamera className="text-blue-600 text-xl" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">
                  Verify Your Identity
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm">
                  Take a clear photo of yourself
                </p>
              </div>
              <Camera onCapture={(blob) => setSelfieImageBlob(blob)} />
              {selfieImageBlob && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 sm:p-3 rounded-xl text-sm">
                  <FiCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium">Selfie captured successfully</span>
                </div>
              )}
            </div>

            {/* ID Upload Step */}
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-indigo-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <FiFileText className="text-indigo-600 text-xl" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 sm:mb-2">
                  Upload ID Document
                </h3>
                <p className="text-gray-500 text-xs sm:text-sm">
                  Ghana Card, Passport, or Driver's License
                </p>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center hover:border-blue-400 transition-colors duration-200">
                <FiUpload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleIdUpload(e.target.files[0])}
                  disabled={isLoading}
                  className="hidden"
                  id="id-upload"
                />
                <label
                  htmlFor="id-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base"
                >
                  Click to upload or take a photo of your ID
                </label>
                <p className="text-gray-500 text-xs sm:text-sm mt-1 sm:mt-2">
                  PNG, JPG or JPEG (max. 5MB)
                </p>
              </div>
              {idFile && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 sm:p-3 rounded-xl text-sm">
                  <FiCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium">ID selected: {idFile.name}</span>
                </div>
              )}
            </div>

            {/* Verification Status */}
            {verificationStatus && (
              <div className={`p-4 rounded-xl ${
                verificationStatus.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  {verificationStatus.success ? (
                    <FiCheck className="text-green-500 text-xl mt-0.5 flex-shrink-0" />
                  ) : (
                    <FiAlertCircle className="text-red-500 text-xl mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      verificationStatus.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {verificationStatus.success ? 'Verification Complete!' : 'Verification Failed'}
                    </p>
                    <p className={`text-sm mt-1 ${
                      verificationStatus.success ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {verificationStatus.success 
                        ? `Match confidence: ${verificationStatus.confidence}%`
                        : verificationStatus.error}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'business':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  TIN Number *
                </label>
                <input
                  type="text"
                  {...register('tinNumber', { required: 'TIN number is required' })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter TIN number"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registration Number
                </label>
                <input
                  type="text"
                  {...register('registrationNumber')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter registration number"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                {...register('businessName', { required: 'Business name is required' })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter business name"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type *
                </label>
                <select
                  {...register('businessType', { required: 'Business type is required' })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
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
                  Business Phone
                </label>
                <input
                  type="tel"
                  {...register('businessPhone')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                isLoading={isLoading}
              />
              
              <FileUpload
                label="Certificate of Incorporation"
                file={businessFiles.incorporationCert}
                onFileUpload={(file) => onFileUpload('incorporationCert', file)}
                isLoading={isLoading}
              />
              
              <FileUpload
                label="VAT Certificate"
                file={businessFiles.vatCertificate}
                onFileUpload={(file) => onFileUpload('vatCertificate', file)}
                isLoading={isLoading}
              />
              
              <FileUpload
                label="SSNIT Certificate"
                file={businessFiles.ssnitCert}
                onFileUpload={(file) => onFileUpload('ssnitCert', file)}
                isLoading={isLoading}
              />
            </div>
          </div>
        );
    }
  };

  if (!registerModal.isOpen) return null;

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

          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-2">
            {['account', 'identity', 'business'].map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  onClick={() => {
                    if (step === 'account' || 
                        (step === 'identity' && watchedValues.role === 'PROVIDER') ||
                        (step === 'business' && watchedValues.role === 'PROVIDER' && selfieImageBlob && idFile)) {
                      setCurrentStep(step as VerificationStep);
                    }
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer transition-colors ${
                    currentStep === step
                      ? 'bg-white text-blue-600'
                      : index < (currentStep === 'account' ? 0 : currentStep === 'identity' ? 1 : 2)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  } ${
                    step === 'account' || 
                    (step === 'identity' && watchedValues.role === 'PROVIDER') ||
                    (step === 'business' && watchedValues.role === 'PROVIDER' && selfieImageBlob && idFile)
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 2 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    index < (currentStep === 'account' ? 0 : currentStep === 'identity' ? 1 : 2)
                      ? 'bg-green-500'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 sm:px-8 sm:py-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-between items-center">
            {currentStep !== 'account' && (
              <button
                onClick={handlePrev}
                disabled={isLoading}
                className="flex items-center gap-1 sm:gap-2 px-4 sm:px-6 py-1 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 text-sm sm:text-base"
              >
                <FiArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                Previous
              </button>
            )}

            <button
              onClick={currentStep === 'business' ? handleSubmit(onSubmit) : handleNext}
              disabled={isLoading || 
                (currentStep === 'account' && (!watchedValues.name || !watchedValues.email || !watchedValues.contactPhone || !watchedValues.password || !watchedValues.role)) ||
                (currentStep === 'identity' && (!selfieImageBlob || !idFile)) ||
                (currentStep === 'business' && (!watchedValues.tinNumber || !watchedValues.businessName || !watchedValues.businessType || !businessFiles.tinCertificate))
              }
              className={`flex items-center gap-1 sm:gap-2 px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base ${
                !isLoading && 
                ((currentStep === 'account' && watchedValues.name && watchedValues.email && watchedValues.contactPhone && watchedValues.password && watchedValues.role) ||
                (currentStep === 'identity' && selfieImageBlob && idFile) ||
                (currentStep === 'business' && watchedValues.tinNumber && watchedValues.businessName && watchedValues.businessType && businessFiles.tinCertificate))
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <FiLoader className="animate-spin text-lg" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {currentStep === 'business' ? 'Complete Registration' : 'Continue'}
                  <FiArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </>
              )}
            </button>
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