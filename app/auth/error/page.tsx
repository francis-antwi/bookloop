"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ClientErrorHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  const message = useMemo(() => {
    switch (error) {
      case "ROLE_SELECTION_REQUIRED":
      case "redirect-role":
        return "Redirecting to role selection...";
      case "PROVIDER_VERIFICATION_REQUIRED":
      case "redirect-verify":
        return "Redirecting to verification...";
      default:
        return "Redirecting...";
    }
  }, [error]);

  useEffect(() => {
    if (!error) return;

    const roleErrors = ["ROLE_SELECTION_REQUIRED", "redirect-role"];
    const verifyErrors = ["PROVIDER_VERIFICATION_REQUIRED", "redirect-verify"];

    if (roleErrors.includes(error)) {
      router.replace("/role");
    } else if (verifyErrors.includes(error)) {
      router.replace("/verify");
    } else {
      router.replace("/");
    }
  }, [error, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-lg text-gray-700">
      {message}
    </div>
  );
}
