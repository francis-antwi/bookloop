"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AuthErrorRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");
  const { data: session, status } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  // ⏳ Trigger fallback redirect if session is stuck in loading
  useEffect(() => {
    if (status !== "loading") return;

    const timeout = setTimeout(() => {
      setTimedOut(true);
      router.replace("/");
    }, 5000); // ⏰ 5-second timeout

    return () => clearTimeout(timeout);
  }, [status, router]);

  // 🔁 Normal error-based redirect logic
  useEffect(() => {
    if (!error || status === "loading") return;

    const roleErrors = ["ROLE_SELECTION_REQUIRED", "redirect-role"];
    const verifyErrors = ["PROVIDER_VERIFICATION_REQUIRED", "redirect-verify"];

    if (roleErrors.includes(error)) {
      if (session?.user?.role) {
        router.replace("/");
      } else {
        router.replace("/role");
      }
    } else if (verifyErrors.includes(error)) {
      router.replace("/verify");
    } else {
      router.replace("/");
    }
  }, [error, status, session, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      {/* Spinner */}
      <svg
        className="animate-spin h-6 w-6 text-blue-500 mb-3"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        ></path>
      </svg>

      <p className="text-lg font-semibold mb-2">Redirecting...</p>
      <p className="text-sm text-gray-500">
        If you are not redirected automatically,&nbsp;
        <button
          onClick={() => router.replace("/")}
          className="underline text-blue-500 hover:text-blue-600"
        >
          click here
        </button>
        .
      </p>

      {timedOut && (
        <p className="mt-2 text-xs text-red-500">
          Session took too long — redirecting to home.
        </p>
      )}
    </div>
  );
}
