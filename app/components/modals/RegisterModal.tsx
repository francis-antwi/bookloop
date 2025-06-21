'use client';

import axios from 'axios';
import { FcGoogle } from 'react-icons/fc';
import { IoMdClose } from 'react-icons/io';
import { useCallback, useState } from 'react';
import {
  FieldValues,
  SubmitHandler,
  useForm
} from 'react-hook-form';
import useRegisterModal from '@/app/hooks/useRegisterModal';
import useLoginModal from '@/app/hooks/useLoginModal';
import toast from 'react-hot-toast';
import { signIn } from 'next-auth/react';
import { FiUser, FiMail, FiPhone, FiLock, FiCheck, FiEye, FiEyeOff } from 'react-icons/fi';
const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [focusedField, setFocusedField] = useState('');
  const [completedFields, setCompletedFields] = useState(new Set());

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger
  } = useForm<FieldValues>({
    defaultValues: {
      name: '',
      email: '',
      contactPhone: '',
      password: '',
    },
  });

  const watchedValues = watch();

  const steps = [
    { field: 'name', label: 'Full Name', icon: FiUser, placeholder: 'Enter your full name' },
    { field: 'email', label: 'Email Address', icon: FiMail, placeholder: 'Enter your email address' },
    { field: 'contactPhone', label: 'Phone Number', icon: FiPhone, placeholder: 'Enter your phone number' },
    { field: 'password', label: 'Password', icon: FiLock, placeholder: 'Create a secure password' },
  ];

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setIsLoading(true);
    axios.post('/api/register', data)
      .then(() => {
        toast.success('Account created successfully!');
        loginModal.onOpen();
        registerModal.onClose();
      })
      .catch(() => {
        toast.error('Something went wrong. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const toggle = useCallback(() => {
    loginModal.onOpen();
    registerModal.onClose();
  }, [loginModal, registerModal]);

  const handleNext = async () => {
    const currentField = steps[currentStep].field;
    const isValid = await trigger(currentField);
    
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const isStepValid = (stepIndex: number) => {
    const field = steps[stepIndex].field;
    return watchedValues[field]?.trim().length > 0 && !errors[field];
  };

  const canProceed = isStepValid(currentStep);
  const allFieldsComplete = steps.every((_, index) => isStepValid(index));

  if (!registerModal.isOpen) return null;

  const currentField = steps[currentStep];
  const IconComponent = currentField.icon;
  const fieldValue = watchedValues[currentField.field] || '';
  const isFieldComplete = fieldValue.trim().length > 0 && !errors[currentField.field];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 animate-in slide-in-from-bottom-8">
        
        {/* Animated Background Pattern */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
        </div>

        {/* Header */}
        <div className="relative flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Join BookLoop
            </h2>
            <p className="text-sm text-gray-500 mt-1">Step {currentStep + 1} of {steps.length}</p>
          </div>
          <button
            onClick={registerModal.onClose}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50"
          >
            <IoMdClose size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-2 rounded-full transition-all duration-500 ${
                  index < currentStep
                    ? 'bg-gradient-to-r from-green-400 to-green-500'
                    : index === currentStep
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500'
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 space-y-6">
          {/* Step Indicator */}
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-all duration-300 transform ${
              isFieldComplete 
                ? 'bg-green-100 text-green-600 scale-110' 
                : focusedField === currentField.field
                ? 'bg-blue-100 text-blue-600 scale-105'
                : 'bg-gray-100 text-gray-400'
            }`}>
              {isFieldComplete ? (
                <FiCheck size={24} className="animate-in zoom-in duration-300" />
              ) : (
                <IconComponent size={24} />
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {currentField.label}
            </h3>
          </div>

          {/* Enhanced Input Field */}
          <div className="relative">
            <div className={`relative border-2 rounded-xl transition-all duration-300 transform ${
              focusedField === currentField.field
                ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-105'
                : isFieldComplete
                ? 'border-green-500 shadow-md shadow-green-500/10'
                : errors[currentField.field]
                ? 'border-red-500 shadow-md shadow-red-500/10'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                {...register(currentField.field, { 
                  required: `${currentField.label} is required`,
                  ...(currentField.field === 'email' && {
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  }),
                  ...(currentField.field === 'password' && {
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })
                })}
                type={currentField.field === 'password' && !showPassword ? 'password' : 
                      currentField.field === 'email' ? 'email' :
                      currentField.field === 'contactPhone' ? 'tel' : 'text'}
                onFocus={() => setFocusedField(currentField.field)}
                onBlur={() => setFocusedField('')}
                placeholder={currentField.placeholder}
                disabled={isLoading}
                className="w-full px-4 py-4 pr-12 bg-transparent outline-none text-gray-800 placeholder-gray-400 disabled:opacity-50"
                autoFocus
              />
              
              {/* Password Toggle */}
              {currentField.field === 'password' && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {showPassword ? <FiEyeOff size={20} className="text-gray-400" /> : <FiEye size={20} className="text-gray-400" />}
                </button>
              )}
              
              {/* Success Check */}
              {isFieldComplete && currentField.field !== 'password' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <FiCheck size={20} className="text-green-500" />
                </div>
              )}
            </div>
            
            {/* Error Message */}
            {errors[currentField.field] && (
              <p className="text-red-500 text-sm mt-2 animate-in slide-in-from-top-2">
                {errors[currentField.field]?.message}
              </p>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                disabled={isLoading}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
              >
                Previous
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed || isLoading}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  canProceed && !isLoading
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={!allFieldsComplete || isLoading}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${
                  allFieldsComplete && !isLoading
                    ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transform hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer - Social Login & Toggle */}
        <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or continue with</span>
            </div>
          </div>
          
          <button
            onClick={() => signIn('google')}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 py-3 px-4 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
          >
            <FcGoogle size={20} />
            <span className="font-medium text-gray-700">Google</span>
          </button>
          
          <div className="text-center">
            <span className="text-gray-500 text-sm">Already have an account? </span>
            <button
              onClick={toggle}
              disabled={isLoading}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline transition-colors disabled:opacity-50"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;