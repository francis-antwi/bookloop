'use client';

import axios from 'axios';
import { IoMdClose } from 'react-icons/io';
import { useCallback, useState, useEffect } from 'react';
import { signIn } from "next-auth/react";
import {
  FieldValues,
  SubmitHandler,
  useForm
} from 'react-hook-form';
import useRegisterModal from '@/app/hooks/useRegisterModal';
import useLoginModal from '@/app/hooks/useLoginModal';
import toast from 'react-hot-toast';
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiCheck,
  FiArrowRight,
  FiArrowLeft,
  FiCamera,
  FiUpload,
  FiUserCheck,
  FiShield,
  FiRefreshCw
} from 'react-icons/fi';
import Camera from '../inputs/Camera';
import PhoneAuth from "@/app/components/PhoneAuth";

interface VerificationResponse {
  verification: {
    faceMatch: boolean;
    confidence: number;
    threshold: number;
  };
  document: {
    imageUrl: string;
    idName: string;
    idNumber: string;
    idDOB: string;
    idExpiryDate: string;
    idIssuer: string;
  };
  selfie: {
    imageUrl: string;
  };
}

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selfieImageBlob, setSelfieImageBlob] = useState<Blob | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [matchStatus, setMatchStatus] = useState<{
    success: boolean;
    faceConfidence: number | null;
  } | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
    getValues,
  } = useForm<FieldValues>({
    defaultValues: {
      name: '',
      email: '',
      contactPhone: '',
      password: '',
      role: '',
    },
  });

  const watchedValues = watch();

  const handlePhoneVerified = (phoneNumber: string) => {
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
      icon: FiUpload,
      description: 'Upload a photo of your Ghana Card',
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

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    // If user is a customer, skip ID/face verification
    if (data.role === 'CUSTOMER') {
      setIsLoading(true);
      try {
        await axios.post('/api/register', {
          ...data,
          isPhoneVerified: true,
          isFaceVerified: false, // Customers don't need face verification
        });

        // Automatically log in the customer
        const loginRes = await signIn("credentials", {
          redirect: false,
          email: data.email,
          password: data.password,
        });

        if (loginRes?.ok) {
          toast.success('Account created and logged in!');
          registerModal.onClose();
        } else {
          toast.error('Registration succeeded, but auto-login failed.');
          loginModal.onOpen();
        }
      } catch (err: any) {
        console.error('Registration error:', err);
        const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          "Registration failed. Please try again.";
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // For service providers, proceed with verification
    if (!selfieImageBlob || !idFile) {
      toast.error('Please capture a selfie and upload your Ghana Card.');
      return;
    }

    if (idFile.size > 2 * 1024 * 1024) {
      toast.error("ID image is too large. Please upload one smaller than 2MB.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("selfieImage", new File([selfieImageBlob], "selfie.jpg", { type: "image/jpeg" }));
    formData.append("idImage", idFile);

    try {
      // Verify identity first
      const verifyRes = await axios.post<VerificationResponse>('/api/verify', formData);
      const { verification, document, selfie } = verifyRes.data;
      const confidence = verification.confidence || 0;
      const isVerified = verification.faceMatch && confidence >= verification.threshold;

      if (isVerified) {
        // Register user if verification succeeds
        await axios.post('/api/register', {
          ...data,
          selfieImage: selfie.imageUrl,
          idImage: document.imageUrl,
          faceConfidence: confidence,
          isFaceVerified: true,
          isPhoneVerified: true,
          idName: document.idName,
          idNumber: document.idNumber,
          idDOB: document.idDOB,
          idExpiryDate: document.idExpiryDate,
          idIssuer: document.idIssuer,
          
        });

        toast.success('Account created successfully!');
        loginModal.onOpen();
        registerModal.onClose();
      } else {
        const score = confidence.toFixed(1);
        toast.error(`Face match failed (${score}%). Please try again.`);
        setMatchStatus({ 
          success: false, 
          faceConfidence: confidence 
        });
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.error || 
                        err.response?.data?.message || 
                        err.message || 
                        "Registration failed. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = useCallback(() => {
    loginModal.onOpen();
    registerModal.onClose();
  }, [loginModal, registerModal]);

  const handleNext = async () => {
    const current = filteredSteps[currentStep];
    
    // Handle phone verification step
    if (current.field === 'phoneVerification') {
      if (!isPhoneVerified) {
        toast.error('Please verify your phone number first');
        return;
      }
      setCurrentStep((prev) => prev + 1);
      return;
    }

    // Handle phone number step
    if (current.field === 'contactPhone') {
      const valid = await trigger(current.field);
      if (valid) {
        setCurrentStep((prev) => prev + 1);
      }
      return;
    }

    // If user selects customer, skip verification steps
    if (current.field === 'role' && watchedValues.role === 'CUSTOMER') {
      const valid = await trigger(current.field);
      if (valid) {
        // Jump directly to the end (submit step)
        setCurrentStep(filteredSteps.length - 1);
      }
      return;
    }

    if (['selfieImage', 'idImage'].includes(current.field)) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    const valid = await trigger(current.field);
    if (valid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const jumpToStep = (stepIndex: number) => {
    if (stepIndex < currentStep || isStepValid(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };

  const isStepValid = (stepIndex: number) => {
    const field = filteredSteps[stepIndex].field;
    if (field === 'phoneVerification') return isPhoneVerified;
    if (field === 'selfieImage') return !!selfieImageBlob;
    if (field === 'idImage') return !!idFile;
    if (field === 'role') return !!watchedValues.role && !errors.role;
    return watchedValues[field]?.trim().length > 0 && !errors[field];
  };

  const canProceed = isStepValid(currentStep);
  const allFieldsComplete = filteredSteps.every((_, i) => isStepValid(i));

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

          {/* Progress Bar with clickable steps */}
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
              {filteredSteps.map((step, index) => (
                <button
                  key={index}
                  onClick={() => jumpToStep(index)}
                  disabled={index > currentStep && !isStepValid(index)}
                  className={`w-4 h-4 rounded-full transition-colors duration-200 ${
                    index <= currentStep || isStepValid(index)
                      ? 'bg-white cursor-pointer hover:bg-blue-200'
                      : 'bg-white/30 cursor-not-allowed'
                  } ${
                    index === currentStep ? 'ring-2 ring-blue-300' : ''
                  }`}
                  aria-label={`Go to step ${index + 1}: ${step.label}`}
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
              <div className="space-y-3 sm:space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center hover:border-blue-400 transition-colors duration-200">
                  <FiUpload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                    disabled={isLoading}
                    className="hidden"
                    id="id-upload"
                    capture="environment"
                  />
                  <label
                    htmlFor="id-upload"
                    className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base"
                  >
                    Click to upload or take a photo of your Ghana Card
                  </label>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1 sm:mt-2">
                    PNG, JPG or JPEG (max. 2MB). You can take a photo with your camera.
                  </p>
                </div>

                {idFile && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 sm:p-3 rounded-xl text-sm">
                    <FiCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="font-medium">ID selected: {idFile.name}</span>
                  </div>
                )}
              </div>
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

          {/* Match Status */}
          {matchStatus && !matchStatus.success && (
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-red-800 text-sm sm:text-base">Verification Failed</p>
                  <p className="text-xs sm:text-sm text-red-600 mt-1">
                    Face match score: {typeof matchStatus?.faceConfidence === 'number' 
                      ? matchStatus.faceConfidence.toFixed(1) 
                      : '0.0'}%
                    <br />
                    Minimum required score is 80%. Please try again with clearer photos.
                  </p>
                  <button
                    onClick={() => {
                      setSelfieImageBlob(null);
                      setIdFile(null);
                      setMatchStatus(null);
                      setCurrentStep(steps.length - 2); // Go back to selfie step
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
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Account...
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