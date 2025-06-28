"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthErrorRedirectPage() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (!error) return;

    if (error === "ROLE_SELECTION_REQUIRED") {
      router.replace("/role");
    } else if (error === "PROVIDER_VERIFICATION_REQUIRED") {
      router.replace("/verify");
    } else {
      router.replace("/"); // fallback
    }
  }, [error, router]);

  return <p>Redirecting...</p>;
}
