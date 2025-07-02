"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const AuthErrorRedirectPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  useEffect(() => {
    if (!error) {
      router.replace("/");
      return;
    }

    const redirectMap: Record<string, string> = {
      ROLE_SELECTION_REQUIRED: "/role",
      "redirect-role": "/role",
      PROVIDER_VERIFICATION_REQUIRED: "/verify",
      "redirect-verify": "/verify",
    };

    const destination = redirectMap[error] || "/";

    router.replace(destination);
  }, [error, router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-lg">
      Redirecting...
    </div>
  );
};

export default AuthErrorRedirectPage;
