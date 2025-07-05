'use client';

import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';
import { IoMdClose } from 'react-icons/io';
import { useCallback, useState } from 'react';
import { FieldValues, SubmitHandler, useForm } from 'react-hook-form';
import useRegisterModal from '@/app/hooks/useRegisterModal';
import toast from 'react-hot-toast';

import useLoginModal from '@/app/hooks/useLoginModal';
import { useRouter } from "next/navigation";


const LoginModal = () => {
    const router = useRouter();
    const registerModal = useRegisterModal();
    const loginModal = useLoginModal();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<FieldValues>({
        defaultValues: {
            email: '',
            password: '',
        }
    });

 const onSubmit: SubmitHandler<FieldValues> = (data) => {
  setIsLoading(true);

  signIn("credentials", {
    ...data,
    redirect: false,
  })
    .then((callback) => {
      setIsLoading(false);

      if (callback?.ok) {
        toast.success("Logged In");

        // Read callbackUrl from current URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const callbackUrl = urlParams.get("callbackUrl");

        // Prevent redirecting back to forgot-password
        if (
          callbackUrl &&
          callbackUrl !== "/forgot-password" &&
          !callbackUrl.includes("/forgot-password")
        ) {
          router.push(callbackUrl);
        } else {
          router.push("/"); // Fallback to home
        }
          router.refresh(); //
        loginModal.onClose();
      } else if (callback?.error) {
        toast.error(callback.error || "Invalid credentials");
      }
    })
    .catch(() => {
      setIsLoading(false);
      toast.error("Something went wrong. Please try again.");
    });
};

    const toggle = useCallback(() => {
        loginModal.onClose();
        registerModal.onOpen();
    }, [loginModal, registerModal]);

    if (!loginModal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
            {/* Enhanced backdrop with blur */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={loginModal.onClose} />
            
            {/* Modal container with animation */}
            <div className="relative w-full max-w-md transform animate-in fade-in zoom-in-95 duration-300">
                {/* Gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-sm opacity-75" />
                
                <div className="relative bg-white/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                    {/* Header with gradient accent */}
                    <div className="relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                        
                        <div className="flex items-center justify-between p-6 border-b border-gray-100/50">
                            <div className="text-center flex-1">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    Welcome Back
                                </h2>
                                <p className="text-sm text-gray-600 mt-1">Sign in to your BookLoop account</p>
                            </div>
                            
                            <button
                                onClick={loginModal.onClose}
                                disabled={isLoading}
                                className="
                                    group ml-4 p-2 rounded-full
                                    bg-gray-100/50 hover:bg-red-50
                                    border border-gray-200/50 hover:border-red-200
                                    transition-all duration-200
                                    hover:scale-110 active:scale-95
                                    focus:outline-none focus:ring-2 focus:ring-red-500/20
                                "
                            >
                                <IoMdClose 
                                    size={18} 
                                    className="text-gray-600 group-hover:text-red-500 transition-colors duration-200" 
                                />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 p-6">
                        <div className="space-y-5">
                            {/* Email input with icon */}
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <HiOutlineMail size={20} />
                                </div>
                                <input
                                    {...register('email', { 
                                        required: 'Email is required',
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: 'Invalid email address'
                                        }
                                    })}
                                    type="email"
                                    placeholder="Enter your email"
                                    disabled={isLoading}
                                    className="
                                        w-full pl-11 pr-4 py-3 rounded-xl
                                        bg-gray-50/50 border border-gray-200/50
                                        focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                                        transition-all duration-200
                                        placeholder:text-gray-400
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    "
                                />
                                {errors.email && (
                                    <p className="mt-1 text-xs text-red-500">{errors.email.message as string}</p>
                                )}
                            </div>

                            {/* Password input with icon and toggle */}
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                                    <HiOutlineLockClosed size={20} />
                                </div>
                                <input
                                    {...register('password', { 
                                        required: 'Password is required',
                                        minLength: {
                                            value: 6,
                                            message: 'Password must be at least 8 characters'
                                        }
                                    })}
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    disabled={isLoading}
                                    className="
                                        w-full pl-11 pr-11 py-3 rounded-xl
                                        bg-gray-50/50 border border-gray-200/50
                                        focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                                        transition-all duration-200
                                        placeholder:text-gray-400
                                        disabled:opacity-50 disabled:cursor-not-allowed
                                    "
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <HiOutlineEyeOff size={20} /> : <HiOutlineEye size={20} />}
                                </button>
                                {errors.password && (
                                    <p className="mt-1 text-xs text-red-500">{errors.password.message as string}</p>
                                )}
                            </div>

                            {/* Forgot password link */}
                            <div className="text-right">
                               <button
  type="button"
 onClick={() => {
    loginModal.onClose(); // ✅ close the modal first
    router.push("/forgot-password", { scroll: false }); // ✅ then navigate
  }}
  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors duration-200"
>
  Forgot password?
</button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50/50 backdrop-blur-sm p-6 border-t border-gray-100/50">
                        {/* Primary action button */}
                        <button
                            disabled={isLoading}
                            onClick={handleSubmit(onSubmit)}
                            className="
                                w-full py-3 px-6 rounded-xl font-semibold text-white
                                bg-gradient-to-r from-blue-600 to-purple-600
                                hover:from-blue-700 hover:to-purple-700
                                transform transition-all duration-200
                                hover:scale-[1.02] active:scale-[0.98]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                disabled:hover:scale-100
                                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2
                                shadow-lg hover:shadow-xl
                                relative overflow-hidden
                            "
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </div>
                            ) : (
                                'Sign In'
                            )}
                        </button>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-gray-50/50 text-gray-500 font-medium">Or continue with</span>
                            </div>
                        </div>

                        {/* Google sign-in button */}
                        <button
onClick={async () => {
  setIsLoading(true);

  try {
    // Trigger Google sign-in (redirects to provider)
    await signIn("google"
        , {
  callbackUrl: "/role" // or "/", "/dashboard", etc.
});
  } catch (error) {
    console.error("Google sign-in error:", error);
    toast.error("Google sign-in failed. Please try again.");
    setIsLoading(false); // restore loading state if signIn fails synchronously
  }
}}

  disabled={isLoading}
  className="
    w-full py-3 px-6 rounded-xl font-semibold
    bg-white border-2 border-gray-200
    text-gray-700 hover:text-gray-900
    hover:border-gray-300 hover:bg-gray-50
    transform transition-all duration-200
    hover:scale-[1.02] active:scale-[0.98]
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:hover:scale-100
    focus:outline-none focus:ring-2 focus:ring-gray-500/20 focus:ring-offset-2
    shadow-sm hover:shadow-md
    flex items-center justify-center gap-3
  "
>
  <FcGoogle size={20} />
  Continue with Google
</button>

                        {/* Sign up link */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                First time using BookLoop?{' '}
                                <button
                                    onClick={toggle}
                                    className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors duration-200"
                                >
                                    Create account
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginModal;