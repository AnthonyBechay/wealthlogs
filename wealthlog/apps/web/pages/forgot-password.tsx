// pages/forgot-password.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";
import Link from "next/link";

// Types for better type safety
interface ForgotPasswordForm {
  email: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

export default function ForgotPassword() {
  const router = useRouter();
  const [formData, setFormData] = useState<ForgotPasswordForm>({
    email: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Centralized input change handler
  const handleInputChange = (field: keyof ForgotPasswordForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Clear error when user starts typing
    if (error) setError("");
  };

  // Enhanced error handling
  const getErrorMessage = (err: unknown): string => {
    const error = err as ApiError;
    
    if (error.response?.status === 404) {
      return "No account found with this email address.";
    }
    if (error.response?.status === 429) {
      return "Too many requests. Please try again later.";
    }
    if (error.response?.status >= 500) {
      return "Server error. Please try again later.";
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (!navigator.onLine) {
      return "Please check your internet connection.";
    }
    
    return "An error occurred. Please try again.";
  };

  // Simple email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Client-side validation
    if (!formData.email.trim()) {
      setError("Email address is required.");
      setIsLoading(false);
      return;
    }
    
    if (!isValidEmail(formData.email.trim())) {
      setError("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    try {
      await api.post("/auth/forgot-password", {
        email: formData.email.trim()
      });
      
      setIsSuccess(true);
    } catch (err) {
      console.error("Forgot password error:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push("/login");
  };

  const handleResendEmail = async () => {
    setError("");
    setIsLoading(true);

    try {
      await api.post("/auth/forgot-password", {
        email: formData.email.trim()
      });
    } catch (err) {
      console.error("Resend error:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-2)] bg-[var(--background)] text-[var(--text)]">
        <div className="w-full max-w-md bg-[var(--background-2)] rounded-lg shadow p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold text-center text-[var(--text)] mb-2">
              Check your email
            </h2>
            <p className="text-[var(--text)] mb-6">
              We've sent a password reset link to <strong>{formData.email}</strong>
            </p>
            <p className="text-sm text-[var(--text)] mb-6">
              Didn't receive the email? Check your spam folder or 
            </p>
            
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={isLoading}
                className="w-full py-2 text-[var(--primary)] font-semibold border border-[var(--primary)] rounded hover:bg-[var(--primary)] hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Resending..." : "Resend email"}
              </button>
              
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full py-2 text-[var(--text)] font-semibold border border-gray-300 rounded hover:bg-gray-50 transition"
              >
                Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-2)] bg-[var(--background)] text-[var(--text)]">
      <div className="w-full max-w-md bg-[var(--background-2)] rounded-lg shadow p-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-center text-[var(--text)]">
            Forgot Password?
          </h2>
          <p className="text-center text-[var(--text)] mt-2">
            No worries, we'll send you reset instructions.
          </p>
        </div>

        {error && (
          <div 
            className="text-red-600 bg-red-50 p-2 rounded mt-4 text-center"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {/* Email */}
          <div>
            <label 
              htmlFor="email"
              className="block font-semibold text-[var(--text)]"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className="w-full mt-1 p-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={formData.email}
              onChange={handleInputChange("email")}
              disabled={isLoading}
              required
              placeholder="Enter your email address"
              aria-describedby={error ? "error-message" : undefined}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 mt-3 text-white font-bold rounded bg-[var(--primary)] hover:bg-[var(--primary)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" 
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <span>Send reset email</span>
            )}
          </button>
        </form>

        {/* Back to login link */}
        <div className="mt-6 text-center">
          <Link 
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-semibold flex items-center justify-center space-x-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
