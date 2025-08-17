"use client";

import { useState, useEffect } from "react";
import { FiUserCheck, FiCheck, FiLoader, FiAlertCircle } from "react-icons/fi";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";

const RoleSelector = () => {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ⏳ Redirect early if role already exists
  useEffect(() => {
    // Only redirect if session is loaded and user has a role
    if (status === "authenticated" && session?.user?.role) {
      router.replace("/");
    }
  }, [session?.user?.role, status, router]); // Add status to dependencies

  // Redirect if unauthenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleRoleSelect = async (role: string) => {
    if (isLoading || !session?.user?.email || !session?.user?.id) {
      // Potentially, if session is still loading or user data is incomplete,
      // prevent action or redirect if applicable.
      // For immediate redirect, consider if you want to allow this function
      // to execute only after session is fully loaded and valid.
      // For now, keeping the original check.
      if (!session?.user?.email || !session?.user?.id) { // Only redirect if essential data is missing
         router.replace("/"); // or a more appropriate fallback
         return;
      }
      if (isLoading) return; // Prevent multiple clicks
    }

    // ✨ Immediately reflect the new role for UI state
    setSelectedRole(role);
    setIsLoading(true);
    setError(null);

    try {
      // Await the API call, which now provides the redirect path
      const res = await axios.post("/api/role", {
        role,
        userId: session.user.id, // Ensure your API route uses this if needed, otherwise token.email is sufficient
      });

      const { success, message, redirect } = res.data;

      if (success && redirect) {
        // IMPORTANT: Directly use the redirect path from the server
        // without waiting for session.update()
        // The server is the single source of truth for the immediate redirect.
        // The session update can happen in the background or on the next page load.
        router.replace(redirect);

        // Optionally, if you still want to optimistically update the session *before* redirect,
        // you could do so, but it's not strictly necessary for "immediate" redirect.
        // A common pattern is to let the new page load and fetch fresh session data.
        // If you keep update(), it will add a slight delay.
        // If the backend truly sets the role, the next page load will have it.
        // If update() is critical for some client-side state *before* navigation, keep it.
        // For *immediate* redirect, remove or defer this.
        // await update({ role }); // Consider removing or deferring this for immediate redirect

        toast.success(message || "Role set successfully!");
        return; // Ensure no further code runs after redirect
      } else {
        // Handle cases where API indicates success but no redirect is provided (unlikely given your API)
        toast.success(message || "Role set successfully, but no redirect specified.");
        // Fallback to a default redirect if needed
        router.replace(role === "PROVIDER" ? "/verify" : "/");
      }

    } catch (err: any) {
      console.error("Role selection error:", err);
      // Use the redirect path provided by the API error response, if available
      const redirectPath =
        err?.response?.data?.redirect ||
        (err?.response?.status === 401 ? "/" : null); // Fallback for unauthorized

      if (redirectPath) {
        router.replace(redirectPath);
      } else {
        // Display generic error message if no specific redirect or message from API
        const errorMessage =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Failed to update role. Please try again.";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      // setIsLoading(false) might not be hit if redirect occurs, which is fine.
      // It's mainly for preventing double clicks and showing spinner if redirect is slow/fails.
      setIsLoading(false);
    }
  };

  const roles = [
    // ... (rest of your roles array)
    {
      value: "CUSTOMER",
      label: "Customer",
      icon: "🛍️",
      desc: "Looking for services and solutions",
      features: ["Browse services", "Book appointments", "Rate sellers"],
      style: {
        gradient: "from-blue-50 to-indigo-50",
        border: "border-blue-200",
        selectedBorder: "border-blue-500",
        selectedBg: "bg-gradient-to-r from-blue-50 to-indigo-100",
      },
    },
    {
      value: "PROVIDER",
      label: "Service Seller",
      icon: "⚡",
      desc: "Offering professional services",
      features: ["List services", "Manage bookings", "Earn income"],
      style: {
        gradient: "from-emerald-50 to-teal-50",
        border: "border-emerald-200",
        selectedBorder: "border-emerald-500",
        selectedBg: "bg-gradient-to-r from-emerald-50 to-teal-100",
      },
    },
  ];

  return (
    <div className="max-w-md mx-auto space-y-6 p-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-3">
          <FiUserCheck className="text-white text-xl" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Role</h2>
        <p className="text-gray-600 text-sm">
          Select how you'll be using our platform
        </p>

        <div className="bg-gray-50 rounded-lg p-3 mt-4 text-sm text-gray-600">
          Signed in as:{" "}
          <span className="font-medium">{session?.user?.email}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <FiAlertCircle className="text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {roles.map((role) => (
          <button
            key={role.value}
            onClick={() => handleRoleSelect(role.value)}
            disabled={isLoading}
            className={`relative w-full p-5 rounded-xl text-left transition-all duration-300
              border-2 shadow-sm hover:shadow-md
              ${
                selectedRole === role.value
                  ? `${role.style.selectedBorder} ${role.style.selectedBg} shadow-lg`
                  : `${role.style.border} bg-white hover:${role.style.gradient}`
              }
              ${
                isLoading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
              }
              group`}
          >
            <div className="flex items-start justify-between">
              <div className="flex space-x-3">
                <div className="text-2xl mt-1">{role.icon}</div>
                <div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {role.label}
                  </div>
                  <div className="text-gray-600 text-sm mt-1">
                    {role.desc}
                  </div>
                  <ul className="mt-2 space-y-1">
                    {role.features.map((f, idx) => (
                      <li
                        key={idx}
                        className="flex items-center space-x-2 text-xs text-gray-500"
                      >
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex items-center">
                {isLoading && selectedRole === role.value ? (
                  <FiLoader className="text-blue-500 animate-spin" />
                ) : selectedRole === role.value ? (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <FiCheck className="text-white text-sm" />
                  </div>
                ) : (
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RoleSelector;