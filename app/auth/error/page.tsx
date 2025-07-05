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

  // ⏳ 2-second fallback redirect
  useEffect(() => {
    const timeout = setTimeout(() => {
      setTimedOut(true);
      router.replace("/");
    }, 2000); // ← 2 seconds

    return () => clearTimeout(timeout);
  }, [router]);

  // 🔁 Main redirect logic based on error type and session
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
      <p className="text-lg font-semibold mb-2">Redirecting...</p>
      <p className="text-sm text-gray-500">
        If you are not redirected automatically,{" "}
        <button
          className="underline text-blue-500 hover:text-blue-600"
          onClick={() => router.replace("/")}
        >
          click here
        </button>
        .
      </p>
      {timedOut && (
        <p className="mt-2 text-xs text-red-500">
          Taking too long? Redirecting to home.
        </p>
      )}
    </div>
  );
}
