"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signIn, useSession } from "next-auth/react";

type AuthErrorType =
  | "ROLE_SELECTION_REQUIRED"
  | "FACE_VERIFICATION_REQUIRED"
  | string;

export default function AuthErrorRedirectPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status } = useSession();
  const error = params.get("error") as AuthErrorType;
  const callbackUrl = params.get("callbackUrl") || "/";
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    const handleRedirect = async () => {
      // If no error, proceed to callbackUrl
      if (!error) {
        return router.replace(callbackUrl);
      }

      // If session is loading, wait
      if (status === "loading") {
        return;
      }

      try {
        // If user is authenticated
        if (session?.user) {
          const { role, isFaceVerified } = session.user;

          // CASE 1: User has role and is verified (redirect to home)
          if (role) {
            if (role === "PROVIDER" && !isFaceVerified) {
              toast.warning("Face verification required");
              return router.replace("/verify");
            }
            return router.replace(callbackUrl);
          }

          // CASE 2: New user needs role selection
          toast.info("Please select your account type");
          return router.replace("/role");
        }

        // Handle specific error cases
        switch (error) {
          case "FACE_VERIFICATION_REQUIRED":
            toast.warning("Face verification required");
            return router.replace("/verify");
          case "ROLE_SELECTION_REQUIRED":
            toast.info("Please select your account type");
            return router.replace("/role");
          default:
            toast.error("Authentication error occurred");
            return router.replace("/auth/error");
        }
      } catch (err) {
        toast.error("Failed to process authentication");
        return router.replace("/");
      } finally {
        setIsRedirecting(false);
      }
    };

    handleRedirect();
  }, [error, callbackUrl, router, session, status]);

  // If session exists but user lands here, redirect to home
  useEffect(() => {
    if (status === "authenticated" && !error) {
      router.replace(callbackUrl);
    }
  }, [status, error, callbackUrl, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-lg font-medium">
        {isRedirecting ? "Verifying your session..." : "Redirecting..."}
      </p>
    </div>
  );
}