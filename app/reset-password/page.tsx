'use client';

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      toast.error("Invalid or expired link");
      router.push("/");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Missing reset token.");
      return;
    }

    try {
      await axios.post("/api/auth/reset-password", {
        token,
        newPassword: password,
      });
      toast.success("Password reset successful");
      router.push("/");
    } catch (err: any) {
      console.error("❌ Reset password error:", err.response?.data || err.message);
      toast.error(err.response?.data?.error || "Reset failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-xl font-semibold mb-4">Reset Password</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          type="password"
          placeholder="Enter new password"
          className="w-full border px-4 py-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          Reset Password
        </button>
      </form>
    </div>
  );
}
