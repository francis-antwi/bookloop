'use client';

import { useState, useEffect } from 'react';
import { FiUserCheck, FiCheck, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

interface RoleSelectorProps {
  onRoleSelected: (role: string) => void;
}

const RoleSelector = ({ onRoleSelected }: RoleSelectorProps) => {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected role from session when it loads
  useEffect(() => {
    if (session?.user?.role) {
      setSelectedRole(session.user.role);
    }
  }, [session]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push('/');
    }
  }, [status, router]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="max-w-md mx-auto space-y-6 p-6">
        <div className="text-center">
          <FiLoader className="animate-spin text-2xl mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading your session...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto space-y-6 p-6">
        <div className="text-center">
          <FiAlertCircle className="text-red-500 text-2xl mx-auto mb-4" />
          <p className="text-gray-600">Please sign in to continue</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  const handleRoleSelect = async (role: string) => {
    if (selectedRole === role || isLoading) return;
    
    // Validate session exists
    if (!session?.user?.email) {
      toast.error('Session expired. Please sign in again.');
      router.push('/');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Selecting role:', role, 'for user:', session.user.email);
      
      // Make API call to update role
      const response = await axios.post('/api/role', { 
        role,
        userId: session.user.id // Include user ID for better validation
      });
      
      // Update the session with new role
      await update({ role });
      
      // Update local state
      setSelectedRole(role);
      
      // Call parent callback
      onRoleSelected(role);
      
      toast.success(`Role updated to ${role.toLowerCase()} successfully!`);
      
      // Optional: Redirect based on role
      setTimeout(() => {
        if (role === 'PROVIDER') {
          router.push('/verify'); // Face verification for providers
        } else {
          router.push('/dashboard'); // Customer dashboard
        }
      }, 1500);
      
    } catch (error: any) {
      console.error('Role selection error:', error);
      
      const message = error?.response?.data?.message || 
                     error?.response?.data?.error || 
                     'Failed to update role. Please try again.';
      
      setError(message);
      toast.error(message);
      
      // If session is invalid, redirect to sign in
      if (error?.response?.status === 401) {
        setTimeout(() => router.push('/'), 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    { 
      value: 'CUSTOMER', 
      label: 'Customer', 
      desc: 'Looking for services and solutions',
      gradient: 'from-blue-50 to-indigo-50',
      border: 'border-blue-200',
      selectedBorder: 'border-blue-500',
      selectedBg: 'bg-gradient-to-r from-blue-50 to-indigo-100',
      icon: '🛍️',
      features: ['Browse services', 'Book appointments', 'Rate providers']
    },
    { 
      value: 'PROVIDER', 
      label: 'Service Provider', 
      desc: 'Offering professional services',
      gradient: 'from-emerald-50 to-teal-50',
      border: 'border-emerald-200',
      selectedBorder: 'border-emerald-500',
      selectedBg: 'bg-gradient-to-r from-emerald-50 to-teal-100',
      icon: '⚡',
      features: ['List services', 'Manage bookings', 'Earn income']
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
        
        {/* User info */}
        <div className="bg-gray-50 rounded-lg p-3 mt-4">
          <p className="text-sm text-gray-600">
            Signed in as: <span className="font-medium">{session?.user?.email}</span>
          </p>
          {session?.user?.role && (
            <p className="text-xs text-gray-500 mt-1">
              Current role: {session.user.role}
            </p>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <FiAlertCircle className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Role Cards */}
      <div className="space-y-4">
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
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-lg">
                    {role.label}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {role.desc}
                  </div>
                  
                  {/* Features */}
                  <div className="mt-2 space-y-1">
                    {role.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                        <span className="text-xs text-gray-500">{feature}</span>
                      </div>
                    ))}
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

      {/* Continue Button */}
      {selectedRole && (
        <div className="pt-4 border-t">
          <button
            onClick={() => {
              if (selectedRole === 'PROVIDER') {
                router.push('/verify');
              } else {
                router.push('/');
              }
            }}
            disabled={isLoading}
            className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center space-x-2">
                <FiLoader className="animate-spin" />
                <span>Updating...</span>
              </span>
            ) : (
              `Continue as ${selectedRole.toLowerCase()}`
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default RoleSelector;