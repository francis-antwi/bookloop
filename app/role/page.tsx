'use client';

import { useState } from 'react';
import { FiUserCheck, FiCheck, FiLoader } from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import axios, { AxiosError } from 'axios'; // Import AxiosError for better type safety
import toast from 'react-hot-toast';

interface RoleSelectorProps {
  onRoleSelected?: (role: string) => void; // Made optional as it's used with ?.
}

const RoleSelector = ({ onRoleSelected }: RoleSelectorProps) => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize selectedRole based on the current session's user role, if available.
  // This helps if the component is re-rendered or accessed when a role is already set.
  const [selectedRole, setSelectedRole] = useState<string | null>(session?.user?.role || null);

  const handleRoleSelect = async (role: string) => {
    // Prevent re-selecting the same role if it's already active/selected
    if (selectedRole === role) return;

    setIsLoading(true);

    try {
      // Set the selected role immediately for UI feedback
      setSelectedRole(role); // Moved this here for immediate visual feedback

      const response = await axios.post('/api/role', { role }, { withCredentials: true });

      if (response.status >= 200 && response.status < 300) {
        // No need to setSelectedRole here again as it's done above
        onRoleSelected?.(role); // Call the optional callback

        toast.success('Role selected successfully');

        // Redirect based on the selected role
        // A full page reload (window.location.href) is often good after role selection
        // to ensure middleware re-evaluates correctly with the new session data.
        window.location.href = role === 'PROVIDER' ? '/verify' : '/';
      } else {
        // Handle non-2xx responses from the server
        const message = response?.data?.message || 'Unexpected response from server';
        toast.error(message);
      }
    } catch (err) { // `err` is implicitly `unknown` here
      const axiosError = err as AxiosError; // Explicitly cast to AxiosError for type safety

      // Extract error details
      const status = axiosError.response?.status;
      const message = (axiosError.response?.data as { message?: string })?.message || axiosError.message || 'Failed to select role';

      toast.error(message);

      // Specific handling for verification required error (if your API sends it)
      if (status === 403 && (axiosError.response?.data as { error?: string })?.error === 'Verification required') {
        setTimeout(() => {
          window.location.href = '/verify';
        }, 1000); // Redirect after a short delay
      }
      // If the selection failed, revert the visual selection
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
            disabled={isLoading} // Disable all buttons when loading
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
            {/* Conditional bottom border for visual feedback on selection */}
            {selectedRole === role.value && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-b-xl" />
            )}
          </button>
        ))}
      </div>
    </div>z
  );
};

export default RoleSelector;