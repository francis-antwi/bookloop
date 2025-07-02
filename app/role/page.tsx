'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { FiUserCheck, FiCheck, FiLoader } from 'react-icons/fi';

interface RoleSelectorProps {
  onRoleSelected?: (role: string) => void;
}

const RoleSelector = ({ onRoleSelected }: RoleSelectorProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(session?.user?.role || null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = async (role: string) => {
  if (!session?.user?.email) {
    toast.error('Session not found. Please sign in again.');
    return;
  }

  if (selectedRole === role) return;

  setIsLoading(true);
  setSelectedRole(role);

  try {
    const response = await axios.post('/api/role', { role }, { withCredentials: true });

    if (response.status >= 200 && response.status < 300) {
      toast.success('Role selected successfully');
      onRoleSelected?.(role);

      const updatedUser = response.data?.user;

      if (
        role === 'PROVIDER' &&
        (!updatedUser?.isFaceVerified || !updatedUser?.selfieImage || !updatedUser?.idImage)
      ) {
        router.replace('/verify');
      } else {
        router.replace('/');
      }
    } else {
      toast.error(response.data?.message || 'Unexpected error');
      setSelectedRole(session.user.role || null);
    }
  } catch (err) {
    const axiosError = err as AxiosError;
    const message =
      (axiosError.response?.data as { message?: string })?.message ||
      axiosError.message ||
      'Failed to select role';

    toast.error(message);

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


  if (!session?.user?.email) {
    return (
      <div className="text-center text-sm text-gray-600">
        Please sign in to continue.
      </div>
    );
  }

  if (session.user.role === 'PROVIDER' && session.user.isFaceVerified) {
    return (
      <div className="text-center text-sm text-gray-600">
        You are already verified as a Service Provider.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-xl font-semibold">Select your role</h2>

      <div className="flex gap-4">
        <button
          disabled={isLoading}
          onClick={() => handleRoleSelect('CUSTOMER')}
          className={`px-6 py-3 rounded-md shadow-md border ${
            selectedRole === 'CUSTOMER'
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-700'
          } hover:bg-green-700 hover:text-white transition`}
        >
          {selectedRole === 'CUSTOMER' ? (
            <FiCheck className="inline-block mr-2" />
          ) : (
            <FiUserCheck className="inline-block mr-2" />
          )}
          Customer
        </button>

        <button
          disabled={isLoading}
          onClick={() => handleRoleSelect('PROVIDER')}
          className={`px-6 py-3 rounded-md shadow-md border ${
            selectedRole === 'PROVIDER'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700'
          } hover:bg-blue-700 hover:text-white transition`}
        >
          {selectedRole === 'PROVIDER' ? (
            <FiCheck className="inline-block mr-2" />
          ) : (
            <FiUserCheck className="inline-block mr-2" />
          )}
          Service Provider
        </button>
      </div>

      {isLoading && (
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <FiLoader className="mr-2 animate-spin" />
          Saving role...
        </div>
      )}
    </div>
  );
};

export default RoleSelector;
