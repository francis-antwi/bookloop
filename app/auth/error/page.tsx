"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthErrorRedirectPage() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (!error) return;

    // ✅ Support multiple role redirect cases
    const roleErrors = ["ROLE_SELECTION_REQUIRED", "redirect-role"];
    const verifyErrors = ["PROVIDER_VERIFICATION_REQUIRED", "redirect-verify"];

    if (roleErrors.includes(error)) {
      router.replace("/role");
    } else if (verifyErrors.includes(error)) {
      router.replace("/verify");
    } else {
      router.replace("/"); // fallback
    }
  }, [error, router]);

  return <p>Redirecting...</p>;
}
