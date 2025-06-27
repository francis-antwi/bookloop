'use client';

import { useState } from 'react';
import { FiUserCheck, FiCheck } from 'react-icons/fi';
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
    setIsLoading(true);
    try {
      await axios.post('/api/role', { role });
      await update({ role });
      setSelectedRole(role);
      onRoleSelected(role);
      toast.success('Role selected successfully');
    } catch {
      toast.error('Failed to select role');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <FiUserCheck className="text-blue-500" />
        Select Your Role
      </h2>
      <div className="grid grid-cols-1 gap-3">
        {[
          { value: 'CUSTOMER', label: 'Customer', desc: 'Looking for services' },
          { value: 'PROVIDER', label: 'Service Provider', desc: 'Offering services' },
        ].map((role) => (
          <button
            key={role.value}
            onClick={() => handleRoleSelect(role.value)}
            disabled={isLoading}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              selectedRole === role.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${isLoading ? 'opacity-70' : ''}`}
          >
            <div className="font-medium">{role.label}</div>
            <div className="text-sm text-gray-500">{role.desc}</div>
            {selectedRole === role.value && <FiCheck className="ml-auto text-blue-500" />}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleSelector;
