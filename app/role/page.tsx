'use client';

import { useState } from 'react';
import { FiUserCheck, FiCheck, FiLoader } from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface RoleSelectorProps {
  onRoleSelected: (role: string) => void;
}

const RoleSelector = ({ onRoleSelected }: RoleSelectorProps) => {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(session?.user?.role || null);

  const handleRoleSelect = async (role: string) => {
    if (selectedRole === role) return;

    setIsLoading(true);
    try {
      const response = await axios.post('/api/role', { role }, { withCredentials: true });
      await update({ role }); // update session

      setSelectedRole(role);
      onRoleSelected(role);
      toast.success('Role selected successfully');

      // ✅ Redirect based on role
      if (role === 'PROVIDER') {
        window.location.href = '/verify';
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || 'Failed to select role';

      toast.error(message);

      // Redirect to /verify if verification is required
      if (status === 403 && err?.response?.data?.error === 'Verification required') {
        setTimeout(() => {
          window.location.href = '/verify';
        }, 1000);
      }
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
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-3">
          <FiUserCheck className="text-white text-xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Role</h2>
        <p className="text-gray-600 text-sm">Select how you'll be using our platform</p>
      </div>

      {/* Role Cards */}
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

              {/* Status Indicator */}
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
