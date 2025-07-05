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
  const { data: session, status, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(session?.user?.role || null);

  // Don't render until session is loaded
  if (status === "loading") {
    return (
      <div className="max-w-md mx-auto space-y-6 p-6">
        <div className="text-center">
          <FiLoader className="animate-spin text-2xl mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto space-y-6 p-6">
        <div className="text-center">
          <p className="text-gray-600">Please sign in to continue</p>
        </div>
      </div>
    );
  }

  const handleRoleSelect = async (role: string) => {
    if (selectedRole === role) return;
    
    // Double check session exists before making API call
    if (!session) {
      toast.error('Please sign in first');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Making API call with session:', session.user.email);
      
      await axios.post('/api/role', { role });
      await update({ role });
      setSelectedRole(role);
      onRoleSelected(role);
      toast.success('Role selected successfully');
    } catch (error: any) {
      console.error('Role selection error:', error);
      const message = error?.response?.data?.message || 'Failed to select role';
      toast.error(message);
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
      icon: '🛍️'
    },
    { 
      value: 'PROVIDER', 
      label: 'Service Provider', 
      desc: 'Offering services',
      gradient: 'from-emerald-50 to-teal-50',
      border: 'border-emerald-200',
      selectedBorder: 'border-emerald-500',
      selectedBg: 'bg-gradient-to-r from-emerald-50 to-teal-100',
      icon: '⚡'
    },
  ];

  return (
    <div className="max-w-md mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-3">
          <FiUserCheck className="text-white text-xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Choose Your Role
        </h2>
        <p className="text-gray-600 text-sm">
          Select how you'll be using our platform
        </p>
        {/* Debug info - remove in production */}
        <p className="text-xs text-gray-500">
          Signed in as: {session?.user?.email}
        </p>
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
            {/* Content */}
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="text-2xl mt-1">{role.icon}</div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {role.label}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {role.desc}
                  </div>
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

            {/* Selected Indicator Bar */}
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