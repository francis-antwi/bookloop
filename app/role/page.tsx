'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';
import { FiUserCheck, FiCheck, FiLoader } from 'react-icons/fi';

interface RoleSelectorProps {
  onRoleSelected?: (role: string) => void;
}

interface UserData {
  email: string;
  role: string | null;
  isFaceVerified: boolean;
  selfieImage: string | null;
  idImage: string | null;
  hasSelectedRole?: boolean;
}

const RoleSelector = ({ onRoleSelected }: RoleSelectorProps) => {
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUser, setIsFetchingUser] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get('/api/role');
        setUser(res.data.user);
        setSelectedRole(res.data.user.role || null);
      } catch (err) {
        console.error('Failed to load user:', err);
        toast.error('You must be signed in to continue.');
        router.replace('/');
      } finally {
        setIsFetchingUser(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleRoleSelect = async (role: string) => {
    if (!user?.email) {
      toast.error('No user session found.');
      router.push('/');
      return;
    }

    if (selectedRole === role) {
      toast('You have already selected this role.', { icon: 'ℹ️' });
      return;
    }

    setIsLoading(true);
    setSelectedRole(role);

    try {
      const response = await axios.post('/api/role', { role });

      if (response.status >= 200 && response.status < 300) {
        const updatedUser = response.data.user;
        toast.success('Role selected successfully!');
        setUser(updatedUser);
        onRoleSelected?.(role);

        // 🔁 Refresh session to get new role in JWT
        await signIn('google', { redirect: false });

        // Redirect
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
        setSelectedRole(user.role || null);
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      const errorMessage =
        (axiosError.response?.data as any)?.message ||
        (axiosError.response?.data as any)?.error ||
        axiosError.message ||
        'An error occurred while selecting your role.';

      toast.error(errorMessage);

      if (
        axiosError.response?.status === 403 &&
        (axiosError.response?.data as any)?.error?.toLowerCase().includes('verification')
      ) {
        router.replace('/verify');
      }

      setSelectedRole(user.role || null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingUser) {
    return <div className="text-center py-10 text-gray-500">Loading your account...</div>;
  }

  if (!user) {
    return <div className="text-center py-10 text-red-500">User not found or unauthorized.</div>;
  }

  if (user.hasSelectedRole && user.role === 'PROVIDER' && user.isFaceVerified) {
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
        {['CUSTOMER', 'PROVIDER'].map((role) => {
          const isSelected = selectedRole === role;
          const isBtnLoading = isLoading && isSelected;
          const isProvider = role === 'PROVIDER';

          const baseStyle =
            'flex-1 flex items-center justify-center px-6 py-4 rounded-lg shadow-md border-2 transition-all duration-300';
          const selectedStyle = isProvider
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-green-600 text-white border-green-600';
          const defaultStyle =
            'bg-white text-gray-800 border-gray-300 hover:border-opacity-70 hover:shadow-lg';

          return (
            <button
              key={role}
              disabled={isLoading}
              onClick={() => handleRoleSelect(role)}
              className={`${baseStyle} ${isSelected ? selectedStyle : defaultStyle} ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isBtnLoading ? (
                <FiLoader className="inline-block mr-3 animate-spin text-xl" />
              ) : isSelected ? (
                <FiCheck className="inline-block mr-3 text-xl" />
              ) : (
                <FiUserCheck className="inline-block mr-3 text-xl" />
              )}
              <span className="font-semibold text-lg">
                {isProvider ? 'Service Provider' : 'Customer'}
              </span>
            </button>
          );
        })}
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
