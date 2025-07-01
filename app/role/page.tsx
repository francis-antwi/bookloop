'use client';

import { useState, useEffect } from 'react';
import { FiUserCheck, FiCheck, FiLoader } from 'react-icons/fi';
import { useSession, update } from 'next-auth/react';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface RoleSelectorProps {
  onRoleSelected?: (role: string) => void;
}

const RoleSelector = ({ onRoleSelected }: RoleSelectorProps) => {
  const { data: session, update: updateSession, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(session?.user?.role || null);

  // Removed the 'status === "unauthenticated"' redirect from here.
  // The 'pages.newUser' in authOptions and middleware should handle initial unauthenticated redirects.
  useEffect(() => {
    if (status === 'loading') return;
    // If a user somehow lands here unauthenticated and not via a new user flow,
    // the middleware should catch it. This component should focus on role selection
    // once a session is established or being established.
  }, [status, router]);

  const handleRoleSelect = async (role: string) => {
    if (selectedRole === role) return;
    setIsLoading(true);

    try {
      setSelectedRole(role);

      // 1. Update via API
      const response = await axios.post('/api/role', { role }, { withCredentials: true });

      // 2. Refresh session data
      const updatedSession = await updateSession({
        role: role,
        ...(role === 'PROVIDER' && { isFaceVerified: false }),
      });

      console.log('Updated session:', updatedSession);

      if (response.status >= 200 && response.status < 300) {
        if (response.data.success) {
          onRoleSelected?.(role);
          toast.success('Role selected successfully');
          router.push(role === 'PROVIDER' ? '/verify' : '/');
        } else if (response.data.skipCreate) {
          toast.success(response.data.message || 'Provider role selected. Proceeding to verification.');
          router.push('/verify');
        } else {
          throw new Error(response.data.message || 'Role selection failed');
        }
      } else {
        throw new Error(response.data.message || 'Unexpected response from server');
      }
    } catch (err) {
      const axiosError = err as AxiosError;
      const status = axiosError.response?.status;
      const message =
        (axiosError.response?.data as { message?: string })?.message ||
        axiosError.message ||
        'Failed to select role';

      toast.error(message);

      if (status === 403 && (axiosError.response?.data as { error?: string })?.error === 'Verification required') {
        setTimeout(() => {
          router.push('/verify');
        }, 1000);
      }

      setSelectedRole(session?.user?.role || null);
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    {
      value: 'CUSTOMER',
      label: 'Customer',
      desc: 'Looking for services',
      gradient: 'from-blue-50 to-indigo-50',
      border: 'border-blue-200',
      selectedBorder: 'border-blue-500',
      selectedBg: 'bg-gradient-to-r from-blue-50 to-indigo-100',
      icon: '🛍️',
    },
    {
      value: 'PROVIDER',
      label: 'Service Provider',
      desc: 'Offering services',
      gradient: 'from-emerald-50 to-teal-50',
      border: 'border-emerald-200',
      selectedBorder: 'border-emerald-500',
      selectedBg: 'bg-gradient-to-r from-emerald-50 to-teal-100',
      icon: '⚡',
    },
  ];

  // ✅ Loading session
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-lg">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6 p-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-3">
          <FiUserCheck className="text-white text-xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Role</h2>
        <p className="text-gray-600 text-sm">Select how you'll be using our platform</p>
      </div>

      <div className="space-y-3">
        {roles.map((role) => (
          <button
            key={role.value}
            onClick={() => handleRoleSelect(role.value)}
            disabled={isLoading}
            className={`
              relative w-full p-5 rounded-xl text-left transition-all duration-300
              transform hover:scale-[1.02] active:scale-[0.98]
              border-2 shadow-sm hover:shadow-md
              ${selectedRole === role.value
                ? `${role.selectedBorder} ${role.selectedBg} shadow-lg`
                : `${role.border} bg-white hover:${role.gradient}`
              }
              ${isLoading ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
              group
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="text-2xl mt-1">{role.icon}</div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">{role.label}</div>
                  <div className="text-gray-600 text-sm mt-1">{role.desc}</div>
                </div>
              </div>
              <div className="flex items-center">
                {isLoading && selectedRole === role.value ? (
                  <FiLoader className="text-blue-500 animate-spin" />
                ) : selectedRole === role.value ? (
                  <div className="flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full">
                    <FiCheck className="text-white text-sm" />
                  </div>
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full group-hover:border-gray-400 transition-colors" />
                )}
              </div>
            </div>
            {selectedRole === role.value && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-b-xl" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleSelector;
