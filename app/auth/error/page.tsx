"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AuthErrorRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!error) return;

    const roleErrors = ["ROLE_SELECTION_REQUIRED", "redirect-role"];
    const verifyErrors = ["PROVIDER_VERIFICATION_REQUIRED", "redirect-verify"];

    if (roleErrors.includes(error)) {
      // ✅ Redirect to "/" if user already has a role
      if (status === "authenticated" && session?.user?.role) {
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
    <div className="flex min-h-screen items-center justify-center text-lg">
      Redirecting...
    </div>
  );
}
