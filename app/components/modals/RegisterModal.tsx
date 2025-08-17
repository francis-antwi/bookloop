// Updated RegisterModal.tsx with improved provider registration flow
'use client';

import axios from 'axios';
import { IoMdClose } from 'react-icons/io';
import { useCallback, useState } from 'react';
import { signIn } from "next-auth/react";
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import useRegisterModal from '@/app/hooks/useRegisterModal';
import useLoginModal from '@/app/hooks/useLoginModal';
import toast from 'react-hot-toast';
import { 
  FiUser, FiMail, FiPhone, FiLock, FiEye, FiEyeOff, 
  FiCheck, FiArrowRight, FiArrowLeft, FiLoader,
  FiUserCheck
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPhoneVerified, setIsPhoneVerified] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    setValue,
    getValues,
    reset,
  } = useForm<FieldValues>({
    defaultValues: {
      name: '',
      email: '',
      contactPhone: '',
      password: '',
      role: ''
    },
  });

  const watchedValues = watch();

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
    }
  ];
// Fix the onSubmit function in RegisterModal.tsx

const onSubmit: SubmitHandler<FieldValues> = async (data) => {
  setIsLoading(true);
  
  try {
    if (data.role === 'PROVIDER') {
      // For PROVIDER - create account with minimal data, mark as incomplete
      const providerRegistrationPayload = {
        name: data.name,
        email: data.email,
        contactPhone: data.contactPhone,
        password: data.password,
        role: data.role,
        // Set provider-specific defaults that API expects
        verified: false,
        isFaceVerified: false,
        requiresApproval: true,
        status: "PENDING_REVIEW",
        businessVerified: false
      };

      // Register the provider with basic info only
      const registrationResponse = await axios.post('/api/register', providerRegistrationPayload);

      if (!registrationResponse.data.success) {
        throw new Error(registrationResponse.data.message || 'Registration failed');
      }

      // Auto-login the provider after successful registration
      const loginResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false
      });
      console.log('loginResult:', loginResult);
      if (!loginResult?.ok || loginResult.error) {
        throw new Error('Registration successful but auto-login failed. Please sign in manually.');
      }

      // Show success message
      toast.success('Account created! Please complete your verification.');
      
      // Close modal and redirect to verify page
      registerModal.onClose();
      reset();
      
    setTimeout(() => {
  router.push('/verify');
}, 200);
    } else {
      // For CUSTOMER - complete registration as before
      const customerRegistrationPayload = {
        name: data.name,
        email: data.email,
        contactPhone: data.contactPhone,
        password: data.password,
        role: data.role,
        verified: true, // Customers are auto-verified
        isFaceVerified: false,
        status: "ACTIVE"
      };

      const response = await axios.post('/api/register', customerRegistrationPayload);

      if (!response.data.success) {
        throw new Error(response.data.message || 'Registration failed');
      }

      // Handle successful customer registration
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
        router.push('/');
        router.refresh();
      } else {
        toast.success('Account created successfully!');
        loginModal.onOpen();
      }
      
      registerModal.onClose();
      reset();
    }
  } catch (error: any) {
    console.error('Registration error:', error);
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
    const current = steps[currentStep];
    
    // Validate current step
    const valid = await trigger(current.field);
    if (!valid) return;

    // Proceed to next step
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
    const field = steps[stepIndex].field;
    if (field === 'role') return !!watchedValues.role && !errors.role;
    if (field === 'contactPhone') return true; // Phone is optional
    return watchedValues[field]?.trim().length > 0 && !errors[field];
  };

  const canProceed = isStepValid(currentStep);
  const allFieldsComplete = steps.every((_, i) => isStepValid(i));

  if (!registerModal.isOpen) return null;

  const currentField = steps[currentStep];
  const IconComponent = currentField.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

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
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-1">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between px-1">
              {steps.map((_, index) => (
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
            {currentField.field === 'role' ? (
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
                        required: currentField.field === 'contactPhone' ? false : `${currentField.label} is required`,
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

            {currentStep < steps.length - 1 ? (
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
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {watchedValues.role === 'PROVIDER' ? 'Continue to Verification' : 'Create Account'}
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