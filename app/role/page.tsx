'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { FiUserCheck, FiCheck, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { useSession } from 'next-auth/react'; // Import useSession

interface UserData {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN' | null;
  isFaceVerified: boolean;
  selfieImage: string | null;
  idImage: string | null;
  // Ensure all relevant fields from your NextAuth session user are included here
}

const RoleSelector = () => {
  const router = useRouter();
  const { data: session, status, update } = useSession(); // Get session data, status, and update function
  
  const [user, setUser] = useState<UserData | null>(null);
  const [selectedRole, setSelectedRole] = useState<'CUSTOMER' | 'PROVIDER' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // This effect runs when the session status changes or session data updates
    if (status === 'authenticated' && session?.user) {
      // If authenticated, set the user data from the session
      setUser(session.user as UserData);
      // Initialize selected role if the user already has one
      setSelectedRole(session.user.role as 'CUSTOMER' | 'PROVIDER' || null);
    } else if (status === 'unauthenticated') {
      // If unauthenticated, redirect to the sign-in page and show an error toast
      toast.error('Authentication required. Please log in.');
      router.replace('/');
    }
    // No need for a separate fetchUser function as useSession manages it
  }, [status, session, router]); // Dependencies: status, session, and router

  // Show a loading spinner while the session status is 'loading'
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <FiLoader className="animate-spin text-2xl text-blue-500" />
        <p className="ml-2 text-gray-600">Loading session...</p>
      </div>
    );
  }

  // If the user is unauthenticated and no user data is present, display an error
  if (status === 'unauthenticated' && !user) {
    return (
      <div className="text-center p-8 text-red-500 bg-red-50 rounded-lg shadow-md">
        <FiAlertCircle className="inline-block mr-2 text-3xl" />
        <p className="text-lg font-semibold">User not authenticated.</p>
        <p className="mt-2 text-sm">Please log in to continue.</p>
      </div>
    );
  }

  // If the user already has a role, display a message and prevent further selection
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
    // Ensure user ID is available before proceeding
    if (!user?.id) {
      toast.error('User data not available. Please try logging in again.');
      router.replace('/');
      return;
    }

    setIsSubmitting(true);
    setSelectedRole(role); // Visually select the role immediately

    try {
      // Make the PATCH request to your API route
      // axios will automatically send the NextAuth.js session cookie
      const { data } = await axios.patch(
        '/api/role', // Ensure this path is correct
        { role }
      );

      // After successful update, trigger a session refresh
      // This will update the client-side session with the latest user data from the server
      await update({ role: role }); // Pass the updated role to ensure it's reflected

      toast.success('Role updated successfully!');
      
      // Redirect based on the updated session data
      // Check session.user for the latest verification status after the update
      if (role === 'PROVIDER' && (!session?.user?.isFaceVerified || !session?.user?.idImage)) {
        router.replace('/verify'); // Redirect providers to verification if not verified
      } else {
        router.replace('/dashboard'); // Redirect others to dashboard
      }

    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      // Display specific error message from the backend if available, otherwise a generic one
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
            disabled={isSubmitting} // Disable button during submission
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
