'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { FiUserCheck, FiCheck, FiLoader, FiAlertCircle } from 'react-icons/fi';
// Import useSession from next-auth/react
import { useSession } from 'next-auth/react';

// Define the UserData interface to match your NextAuth session user type
// Ensure this matches the extended Session['user'] type in your next-auth.d.ts
interface UserData {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | null;
  isFaceVerified: boolean;
  selfieImage: string | null;
  idImage: string | null;
  // Add other fields from your Session['user'] if needed by this component
}

const RoleSelector = () => {
  const router = useRouter();
  // Use the useSession hook to get session data and status
  const { data: session, status, update } = useSession(); // 'update' is used to trigger session refresh
  
  // Use local state to manage the user data displayed in the component
  // Initialize with session.user if available, or null
  const [user, setUser] = useState<UserData | null>(session?.user as UserData || null);
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'PROVIDER' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // useEffect to handle initial session loading and user data population
  useEffect(() => {
    // When session status changes to 'authenticated' and user data is available
    if (status === 'authenticated' && session?.user) {
      setUser(session.user as UserData); // Cast to UserData
      setSelectedRole(session.user.role as 'CUSTOMER' | 'PROVIDER' || null); // Initialize selected role
    } else if (status === 'unauthenticated') {
      // If unauthenticated, redirect to sign-in page
      toast.error('Authentication required');
      router.replace('/');
    }
    // No need for a separate fetchUser function if using useSession
  }, [status, session, router]); // Depend on status, session, and router

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="animate-spin text-2xl" />
      </div>
    );
  }

  // If status is unauthenticated and user is still null after initial load
  if (status === 'unauthenticated' && !user) {
    return (
      <div className="text-center p-8 text-red-500">
        <FiAlertCircle className="inline-block mr-2" />
        User not authenticated
      </div>
    );
  }

  // If user already has a role, display a message
  if (user?.role) {
    return (
      <div className="p-4 bg-green-50 text-green-800 rounded text-center">
        You're already registered as a {user.role.toLowerCase()}
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

    try {
      // Send the role update to your API
      // axios will automatically send the NextAuth.js session cookie with this request
      const { data } = await axios.patch(
        '/api/role',
        { role }
      );

      // After a successful role update, you should ideally trigger a session update
      // This will re-fetch the session from the server and update the client-side session state
      // The 'update' function from useSession() is perfect for this.
      await update({ role: role }); // Pass the updated role to trigger a session refresh

      toast.success('Role updated successfully');
      
      // Redirect based on role and verification status from the updated session
      // Access updated user data from the session object after the 'update' call
      if (role === 'PROVIDER' && (!session?.user?.isFaceVerified || !session?.user?.idImage)) {
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
