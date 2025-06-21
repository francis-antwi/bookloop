'use client';

import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FieldValues>({
    defaultValues: {
      email: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      setLoading(true);
      const response = await axios.post("/api/auth/forgot-password", data);

      if (response.status === 200) {
        toast.success("Reset link sent to your email.");
      } else {
        toast.error("Unexpected response from server.");
      }
    } catch (error: any) {
      console.error("❌ Forgot Password Error:", error);
      toast.error(
        error?.response?.data?.error ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4 text-center">Forgot Password</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input
            {...register("email", { required: "Email is required" })}
            type="email"
            placeholder="Enter your email"
            className="w-full p-3 border border-gray-300 rounded"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition duration-200"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </main>
  );
}
