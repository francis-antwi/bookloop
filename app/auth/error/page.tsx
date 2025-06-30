"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ClientErrorHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  useEffect(() => {
    if (!error) return;

    // Only handle verification errors
    // Let middleware handle role selection automatically
    if (error === "PROVIDER_VERIFICATION_REQUIRED" || error === "redirect-verify") {
      router.replace("/verify");
    } else {
      router.replace("/");
    }
  }, [error, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-lg text-gray-700">
      {error === "PROVIDER_VERIFICATION_REQUIRED" || error === "redirect-verify"
        ? "Redirecting to verification..."
        : "Redirecting..."}
    </div>
  );
}