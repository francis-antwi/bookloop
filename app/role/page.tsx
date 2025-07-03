'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { FiUserCheck, FiCheck, FiLoader, FiAlertCircle } from 'react-icons/fi';

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
  const [user, setUser] = useState<UserData | null>(null);
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'PROVIDER' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user data with JWT
  const fetchUser = async () => {
    try {
      const { data } = await axios.get('/api/user/me', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setUser(data);
      setSelectedRole(data.role);
    } catch (err) {
      console.error('Failed to load user:', err);
      toast.error('Authentication required');
      router.replace('/');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [router]);

  const handleRoleSelect = async (role: 'CUSTOMER' | 'PROVIDER') => {
    if (!user?.id) {
      toast.error('Authentication required');
      router.replace('/');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data } = await axios.patch(
        '/api/role',
        { role },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      // Update local state
      setUser(data.user);
      setSelectedRole(role);
      
      // Update token if returned new one
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      toast.success('Role updated successfully');
      
      // Redirect based on role and verification status
      if (role === 'PROVIDER' && (!data.user.isFaceVerified || !data.user.idImage)) {
        router.replace('/verify');
      } else {
        router.replace('/dashboard');
      }

    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      toast.error(error.response?.data?.message || 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="animate-spin text-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center p-8 text-red-500">
        <FiAlertCircle className="inline-block mr-2" />
        User not authenticated
      </div>
    );
  }

  if (user.role) {
    return (
      <div className="p-4 bg-green-50 text-green-800 rounded text-center">
        You're already registered as a {user.role.toLowerCase()}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4 text-center">Select Your Role</h2>
      
      <div className="space-y-4">
        {(['CUSTOMER', 'PROVIDER'] as const).map((role) => (
          <button
            key={role}
            disabled={isSubmitting}
            onClick={() => handleRoleSelect(role)}
            className={`w-full p-4 rounded-lg border flex items-center justify-between
              ${selectedRole === role 
                ? role === 'PROVIDER' 
                  ? 'bg-blue-50 border-blue-500' 
                  : 'bg-green-50 border-green-500'
                : 'bg-white border-gray-200 hover:border-gray-300'
              }
              ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            <span className="font-medium">
              {role === 'PROVIDER' ? 'Service Provider' : 'Customer'}
            </span>
            {selectedRole === role && (
              isSubmitting 
                ? <FiLoader className="animate-spin" /> 
                : <FiCheck />
            )}
          </button>
        ))}
      </div>

      {isSubmitting && (
        <div className="mt-4 text-sm text-gray-500 text-center">
          <FiLoader className="inline-block animate-spin mr-2" />
          Updating your account...
        </div>
      )}
    </div>
  );
};

export default RoleSelector;