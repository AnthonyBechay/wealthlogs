// pages/login.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import { api, setAccessToken } from "@wealthlog/common";
import Link from "next/link";

// Types for better type safety (contrairement à ton code original snas aucun "types")
interface LoginForm {
  username: string;
  password: string;
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

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginForm>({
    username: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Centralized input change handler (Je sais pas pourquoi tavais des setusername et setPassword partout)
  const handleInputChange = (field: keyof LoginForm) => (
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
    
    if (error.response?.status === 401) {
      return "Invalid username or password.";
    }
    if (error.response?.status === 429) {
      return "Too many login attempts. Please try again later.";
    }
    if (error.response?.status === 500) {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Client-side validation
    if (!formData.username.trim()) {
      setError("Username is required.");
      setIsLoading(false);
      return;
    }
    if (!formData.password) {
      setError("Password is required.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.post("/auth/login", {
        username: formData.username.trim(),
        password: formData.password
      });
      
      if (response.data?.token) {
        setAccessToken(response.data.token);
        
        // Redirect with query params if present
        const redirectTo = router.query.redirect as string || "/landing";
        await router.push(redirectTo);
      } else {
        throw new Error("Missing token in response");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-2)] bg-[var(--background)] text-[var(--text)]">
      <div className="w-full max-w-md bg-[var(--background-2)] rounded-lg shadow p-6">
        <h2 className="text-3xl font-extrabold text-center text-[var(--text)]">
          Welcome Back
        </h2>
        <p className="text-center text-[var(--text)] mt-1">
          Please log in to continue.
        </p>

        {error && (
          <div 
            className="text-red-600 bg-red-50 p-2 rounded mt-4 text-center"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4" noValidate>
          {/* Username */}
          <div>
            <label 
              htmlFor="username"
              className="block font-semibold text-[var(--text)]"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="w-full mt-1 p-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
              value={formData.username}
              onChange={handleInputChange("username")}
              disabled={isLoading}
              required
              aria-describedby={error ? "error-message" : undefined}
            />
          </div>

          {/* Password */}
          <div>
            <label 
              htmlFor="password"
              className="block font-semibold text-[var(--text)]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full mt-1 p-2 border rounded focus:outline-none focus:ring focus:ring-blue-300"
                value={formData.password}
                onChange={handleInputChange("password")}
                disabled={isLoading}
                required
                aria-describedby={error ? "error-message" : undefined}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Forgot password link  */}
          <div className="text-right">
            <Link 
              href="/forgotPassword"
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              Forgot password?
            </Link>
          </div>

          {/* Login Button */}
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
                <span>Logging in...</span>
              </>
            ) : (
              <span>Login</span>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-[var(--text)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
