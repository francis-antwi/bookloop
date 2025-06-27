import { useRouter } from "next/router";
import { useEffect } from "react";

export default function CallbackError() {
  const router = useRouter();
  const { reason } = router.query;

  useEffect(() => {
    let msg = "An unknown error occurred.";
    if (reason === "face-verification-required") {
      msg = "Please complete face verification before signing in.";
    } else if (reason === "role-not-selected") {
      msg = "Please select your role before signing in.";
    }

    alert(msg); // Replace with toast if using toast library

    router.replace("/");
  }, [router]);

  return null;
}
