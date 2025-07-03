'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { FiUserCheck, FiCheck, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { useSession, getSession } from 'next-auth/react';

interface UserData {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | null;
  isFaceVerified: boolean;
  selfieImage: string | null;
  idImage: string | null;
}

const RoleSelector = () => {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [user, setUser] = useState<UserData | null>(null);
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'PROVIDER' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      setUser(session.user as UserData);
      setSelectedRole(session.user.role as 'CUSTOMER' | 'PROVIDER' || null);
    } else if (status === 'unauthenticated') {
      toast.error('Authentication required. Please log in.');
      router.replace('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="animate-spin text-2xl text-blue-500" />
        <p className="ml-2 text-gray-600">Loading session...</p>
      </div>
    );
  }

  if (status === 'unauthenticated' && !user) {
    return (
      <div className="text-center p-8 text-red-500 bg-red-50 rounded-lg shadow-md">
        <FiAlertCircle className="inline-block mr-2 text-3xl" />
        <p className="text-lg font-semibold">User not authenticated.</p>
        <p className="mt-2 text-sm">Please log in to continue.</p>
      </div>
    );
  }

  if (user?.role) {
    return (
      <div className="p-6 bg-green-100 text-green-800 rounded-lg shadow-md text-center">
        <FiUserCheck className="inline-block mr-2 text-3xl" />
        <p className="text-lg font-semibold">
          You're already registered as a {user.role.toLowerCase()}.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition duration-200"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const handleRoleSelect = async (role: 'CUSTOMER' | 'PROVIDER') => {
    if (!user?.id) {
      toast.error('User data not available. Please try logging in again.');
      router.replace('/');
      return;
    }

    setIsSubmitting(true);
    setSelectedRole(role);

    try {
      await axios.patch('/api/role', { role });

      // Refresh session to get latest user data
      await update();
      const freshSession = await getSession();

      toast.success('Role updated successfully!');

      const freshUser = freshSession?.user as UserData | undefined;

      if (
        role === 'PROVIDER' &&
        (!freshUser?.isFaceVerified || !freshUser.idImage)
      ) {
        router.replace('/verify');
      } else {
        router.replace('/');
      }
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      toast.error(error.response?.data?.message || 'Failed to update role. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-xl border border-gray-200">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Select Your Role</h2>
      <p className="text-center text-gray-600 mb-6">
        Choose whether you will be a customer or a service provider.
      </p>

      <div className="space-y-4">
        {(['CUSTOMER', 'PROVIDER'] as const).map((role) => (
          <button
            key={role}
            disabled={isSubmitting}
            onClick={() => handleRoleSelect(role)}
            className={`w-full p-5 rounded-xl border-2 flex items-center justify-between transition-all duration-300 ease-in-out
              ${selectedRole === role 
                ? role === 'PROVIDER' 
                  ? 'bg-blue-100 border-blue-600 text-blue-800 shadow-lg' 
                  : 'bg-green-100 border-green-600 text-green-800 shadow-lg'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:border-blue-400 hover:shadow-md'
              }
              ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}
              focus:outline-none focus:ring-2 focus:ring-offset-2 
              ${role === 'PROVIDER' ? 'focus:ring-blue-500' : 'focus:ring-green-500'}
            `}
          >
            <span className="font-semibold text-lg">
              {role === 'PROVIDER' ? 'Service Provider' : 'Customer'}
            </span>
            {selectedRole === role && (
              isSubmitting 
                ? <FiLoader className="animate-spin text-xl" /> 
                : <FiCheck className="text-xl" />
            )}
          </button>
        ))}
      </div>

      {isSubmitting && (
        <div className="mt-6 text-sm text-gray-500 text-center flex items-center justify-center">
          <FiLoader className="inline-block animate-spin mr-2 text-lg" />
          <p>Updating your account and session...</p>
        </div>
      )}
    </div>
  );
};

export default RoleSelector;
