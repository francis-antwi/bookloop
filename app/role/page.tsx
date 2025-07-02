'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, update } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { FiUserCheck, FiCheck, FiLoader } from 'react-icons/fi';

interface RoleSelectorProps {
  onRoleSelected?: (role: string) => void;
}

const RoleSelector = ({ onRoleSelected }: RoleSelectorProps) => {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Set selectedRole on load when session is ready
  useEffect(() => {
    if (session?.user?.role) {
      setSelectedRole(session.user.role);
    }
  }, [session]);

  const handleRoleSelect = async (role: string) => {
    if (!session?.user?.email) {
      toast.error('No active session found. Please sign in again.');
      router.push('/');
      return;
    }

    if (selectedRole === role) {
      toast('You already selected this role.', { icon: 'ℹ️' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('/api/role', { role }, { withCredentials: true });

      if (response.status >= 200 && response.status < 300) {
        toast.success('Role selected successfully!');
        onRoleSelected?.(role);

        // Refresh session from server to get latest user state
        await updateSession();

        const updatedUser = response.data?.user;

        // Redirect based on role and verification
        if (
          role === 'PROVIDER' &&
          (!updatedUser?.isFaceVerified || !updatedUser?.selfieImage || !updatedUser?.idImage)
        ) {
          router.replace('/verify');
        } else {
          router.replace('/');
        }
      } else {
        toast.error(response.data?.message || 'Failed to update role.');
        setSelectedRole(session.user.role || null);
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      const errorMessage =
        (axiosError.response?.data as { message?: string })?.message ||
        (axiosError.response?.data as { error?: string })?.error ||
        axiosError.message ||
        'An error occurred while selecting your role.';

      toast.error(errorMessage);

      if (
        axiosError.response?.status === 403 &&
        (axiosError.response?.data as { error?: string })?.error?.includes('verification')
      ) {
        router.replace('/verify');
      }

      setSelectedRole(session.user.role || null);
    } finally {
      setIsLoading(false);
    }
  };

  // Guard if session or user is missing
  if (!session?.user) {
    return (
      <div className="text-center text-sm text-gray-600 p-6">
        Please sign in to continue.
      </div>
    );
  }

  // Guard for already verified providers
  if (session.user.role === 'PROVIDER' && session.user.isFaceVerified) {
    return (
      <div className="text-center text-sm text-gray-600 p-6">
        You are already <strong>verified</strong> as a Service Provider.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800">Select Your Role</h2>
      <p className="text-gray-600 text-center">
        Choose the role that best describes how you'll use our platform.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          disabled={isLoading}
          onClick={() => handleRoleSelect('CUSTOMER')}
          className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg shadow-md border-2 transition-all duration-300 ease-in-out
            ${selectedRole === 'CUSTOMER'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-800 border-gray-300 hover:border-green-500 hover:shadow-lg'
            }
            ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading && selectedRole === 'CUSTOMER' ? (
            <FiLoader className="inline-block mr-3 animate-spin text-xl" />
          ) : selectedRole === 'CUSTOMER' ? (
            <FiCheck className="inline-block mr-3 text-xl" />
          ) : (
            <FiUserCheck className="inline-block mr-3 text-xl" />
          )}
          <span className="font-semibold text-lg">Customer</span>
        </button>

        <button
          disabled={isLoading}
          onClick={() => handleRoleSelect('PROVIDER')}
          className={`flex-1 flex items-center justify-center px-6 py-4 rounded-lg shadow-md border-2 transition-all duration-300 ease-in-out
            ${selectedRole === 'PROVIDER'
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-800 border-gray-300 hover:border-blue-500 hover:shadow-lg'
            }
            ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading && selectedRole === 'PROVIDER' ? (
            <FiLoader className="inline-block mr-3 animate-spin text-xl" />
          ) : selectedRole === 'PROVIDER' ? (
            <FiCheck className="inline-block mr-3 text-xl" />
          ) : (
            <FiUserCheck className="inline-block mr-3 text-xl" />
          )}
          <span className="font-semibold text-lg">Service Provider</span>
        </button>
      </div>

      {isLoading && (
        <div className="mt-5 flex items-center text-sm text-gray-500">
          <FiLoader className="mr-2 animate-spin" />
          Saving your role and updating your profile...
        </div>
      )}
    </div>
  );
};

export default RoleSelector;
