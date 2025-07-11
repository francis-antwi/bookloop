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
    if (session?.user?.role) {
      router.replace("/");
    }
  }, [session?.user?.role, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="max-w-md mx-auto space-y-6 p-6 text-center">
        <FiLoader className="animate-spin text-2xl text-blue-500 mx-auto mb-4" />
        <p className="text-gray-600">Loading your session...</p>
      </div>
    );
  }

  const handleRoleSelect = async (role: string) => {
    if (isLoading || !session?.user?.email || !session?.user?.id) {
      toast.error("Session error. Please sign in again.");
      router.push("/");
      return;
    }

    if (selectedRole === role) {
      toast.success(`You are already a ${role.toLowerCase()}.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await axios.post("/api/role", {
        role,
        userId: session.user.id,
      });

      await update({ role });
      setSelectedRole(role);
      toast.success(`Role updated to ${role.toLowerCase()} successfully!`);

      const redirectPath = res.data?.redirect || (role === "PROVIDER" ? "/verify" : "/");
      router.push(redirectPath);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to update role. Please try again.";

      setError(message);
      toast.error(message);

      const redirectPath = err?.response?.data?.redirect;
      if (redirectPath) {
        setTimeout(() => router.push(redirectPath), 1000);
      } else if (err?.response?.status === 401) {
        setTimeout(() => router.push("/"), 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    {
      value: "CUSTOMER",
      label: "Customer",
      icon: "🛍️",
      desc: "Looking for services and solutions",
      features: ["Browse services", "Book appointments", "Rate providers"],
      style: {
        gradient: "from-blue-50 to-indigo-50",
        border: "border-blue-200",
        selectedBorder: "border-blue-500",
        selectedBg: "bg-gradient-to-r from-blue-50 to-indigo-100",
      },
    },
    {
      value: "PROVIDER",
      label: "Service Provider",
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
