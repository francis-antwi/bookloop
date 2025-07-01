"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthErrorRedirectPage() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    // If there's no error parameter, or if this page is reached without a specific error,
    // redirect to a default safe page, like home, to prevent users from just sitting
    // on a "Redirecting..." page indefinitely.
    if (!error) {
      router.replace("/");
      return;
    }

    const roleErrors = ["ROLE_SELECTION_REQUIRED", "redirect-role"];
    const verifyErrors = ["PROVIDER_VERIFICATION_REQUIRED", "redirect-verify"];

    if (roleErrors.includes(error)) {
      // *** THIS IS THE CRITICAL CORRECTION ***
      // If a role selection error, redirect to the actual role selection page.
      router.replace("/role");
    } else if (verifyErrors.includes(error)) {
      // If a verification error, redirect to the verification page.
      router.replace("/verify");
    } else {
      // Fallback for any other unhandled errors (e.g., general auth errors from NextAuth.js).
      // You might also want to display a generic error message here before redirecting.
      router.replace("/");
    }
  }, [error, router]); // Added 'router' to dependency array for completeness

  return (
    <div className="flex min-h-screen items-center justify-center text-lg">
      Redirecting...
    </div>
  );
}
