'use client';

import axios from 'axios';
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
  FiUserCheck
} from 'react-icons/fi';
import Camera from '../inputs/Camera';

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [selfieImageBlob, setSelfieImageBlob] = useState<Blob | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [matchStatus, setMatchStatus] = useState<{ success: boolean; faceConfidence: number } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
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
    },
    { 
      field: 'selfieImage', 
      label: 'Verify Identity',
      icon: FiCamera,
      description: 'Take a clear photo of yourself'
    },
    { 
      field: 'idImage', 
      label: 'Upload ID',
      icon: FiUpload,
      description: 'Upload a photo of your government ID'
    },
  ];

const onSubmit: SubmitHandler<FieldValues> = async (data) => {
  if (!selfieImageBlob || !idFile) {
    toast.error('Please capture a selfie and upload your ID photo.');
    return;
  }

  // ✅ Check ID file size before proceeding
  if (idFile.size > 2 * 1024 * 1024) {
    toast.error("ID image is too large. Please upload one smaller than 2MB.");
    return;
  }

  setIsLoading(true);

  const formData = new FormData();
  formData.append(
    "selfieImage",
    new File([selfieImageBlob!], "selfie.jpg", { type: "image/jpeg" })
  );
  formData.append("idImage", idFile!);

  try {
    const res = await axios.post('/api/verify', formData);
    const { confidence, selfieUrl, idUrl } = res.data;

    if (confidence >= 80) {
      await axios.post('/api/register', {
        ...data,
        selfieImage: selfieUrl,
        idImage: idUrl,
        faceConfidence: confidence,
        isFaceVerified: true,
      });

      toast.success('Account created successfully!');
      loginModal.onOpen();
      registerModal.onClose();
    } else {
      toast.error(`Face match failed. Score: ${confidence.toFixed(1)}%`);
      setMatchStatus({ success: false, faceConfidence: confidence });
    }
  } catch (err: any) {
    const errorMessage =
      err.response?.data?.detail?.error_message ||
      err.response?.data?.detail ||
      err.response?.data?.error ||
      err.message ||
      "Face verification failed.";

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
    const current = steps[currentStep];
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

  const isStepValid = (stepIndex: number) => {
    const field = steps[stepIndex].field;
    if (field === 'selfieImage') return !!selfieImageBlob;
    if (field === 'idImage') return !!idFile;
    if (field === 'role') return !!watchedValues.role && !errors.role;
    return watchedValues[field]?.trim().length > 0 && !errors[field];
  };

  const canProceed = isStepValid(currentStep);
  const allFieldsComplete = steps.every((_, i) => isStepValid(i));

  if (!registerModal.isOpen) return null;

  const currentField = steps[currentStep];
  const IconComponent = currentField.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300">
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
          <button 
            onClick={registerModal.onClose} 
            disabled={isLoading}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors duration-200"
          >
            <IoMdClose size={20} />
          </button>
          
          <div className="mb-4">
            <h2 className="text-2xl font-bold">Join Us</h2>
            <p className="text-blue-100 text-sm">Create your account in a few simple steps</p>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="flex justify-between text-xs mb-2">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-white h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {/* Step Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl mb-4">
              <IconComponent className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {currentField.label}
            </h3>
            <p className="text-gray-500 text-sm">
              {currentField.description}
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {currentField.field === 'role' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: 'CUSTOMER', label: 'Customer', desc: 'Looking for services' },
                    { value: 'PROVIDER', label: 'Provider', desc: 'Offering services' }
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
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
                        <div className="font-medium text-gray-800">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.desc}</div>
                      </div>
                      {watchedValues.role === option.value && (
                        <FiCheck className="w-5 h-5 text-blue-600" />
                      )}
                    </label>
                  ))}
                </div>
                {errors.role && (
                  <p className="text-red-500 text-sm flex items-center gap-2">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors.role.message}
                  </p>
                )}
              </div>
            ) : currentField.field === 'selfieImage' ? (
              <div className="space-y-4">
                <Camera onCapture={(blob) => setSelfieImageBlob(blob)} />
                {selfieImageBlob && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
                    <FiCheck className="w-5 h-5" />
                    <span className="text-sm font-medium">Selfie captured successfully</span>
                  </div>
                )}
              </div>
            ) : currentField.field === 'idImage' ? (
              <div className="space-y-4">
  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors duration-200">
    <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
    <input
  type="file"
  accept="image/*"
  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
  disabled={isLoading}
  className="hidden"
  id="id-upload"
/>
<label
  htmlFor="id-upload"
  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
>
  Click to upload or take a photo of your ID
</label>

    <p className="text-gray-500 text-sm mt-2">
      PNG, JPG or JPEG (max. 10MB). You can take a photo with your camera.
    </p>
  </div>

  {idFile && (
    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
      <FiCheck className="w-5 h-5" />
      <span className="text-sm font-medium">ID selected: {idFile.name}</span>
    </div>
  )}
</div>

            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <div className={`flex items-center border-2 rounded-xl px-4 py-3 transition-all duration-200 ${
                    errors[currentField.field] 
                      ? 'border-red-300 bg-red-50' 
                      : watchedValues[currentField.field]?.trim().length > 0 
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 focus-within:border-blue-500'
                  }`}>
                    <IconComponent className={`w-5 h-5 mr-3 ${
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
                          : 'text'
                      }
                      className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
                      disabled={isLoading}
                    />
                    {currentField.field === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                      </button>
                    )}
                    {watchedValues[currentField.field]?.trim().length > 0 && !errors[currentField.field] && (
                      <FiCheck className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
                {errors[currentField.field] && (
                  <p className="text-red-500 text-sm flex items-center gap-2 mt-2">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors[currentField.field]?.message}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Match Status */}
          {matchStatus && !matchStatus.success && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-2 text-red-700">
                <span className="text-lg">❌</span>
                <div>
                  <p className="font-medium">Verification Failed</p>
                  <p className="text-sm">Match score: {matchStatus.faceConfidence.toFixed(1)}% (minimum required: 80%)</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100">
          <div className="flex justify-between items-center">
            {currentStep > 0 ? (
              <button
                onClick={handlePrev}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                <FiArrowLeft className="w-4 h-4" />
                Previous
              </button>
            ) : (
              <div></div>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed || isLoading}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
                  canProceed && !isLoading
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue
                <FiArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit(onSubmit)}
                disabled={!allFieldsComplete || isLoading}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
                  allFieldsComplete && !isLoading
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    Create Account
                    <FiCheck className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          <div className="text-center mt-6">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <button 
                onClick={toggle} 
                className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
              >
                Sign in instead
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterModal;