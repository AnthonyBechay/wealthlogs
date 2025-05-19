// pages/register.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";
import Link from "next/link";

// Types for better type safety (parce que ton code original avait 10 useState éparpillés jai failli pleurer)
interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  securityQuestion: string;
  securityAnswer: string;
  roleName: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
    status?: number;
  };
  message?: string;
}

// Standard password requirements
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumbers: false,
  requireSpecialChars: false,
  specialChars: "!@#$%^&*()_+-=[]{}|;:,.<>?"
};

export default function Register() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RegisterForm>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    securityQuestion: "",
    securityAnswer: "",
    roleName: "MEMBER"
  });
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Centralized input change handler (fini les 10 setUsername setEmail, setPassword je comprend pas pk taime faire ca)
  const handleInputChange = (field: keyof RegisterForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Clear errors when user starts typing
    if (error) setError("");
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Enhanced error handling
  const getErrorMessage = (err: unknown): string => {
    const error = err as ApiError;
    
    if (error.response?.status === 409) {
      return "Username or email already exists.";
    }
    if (error.response?.status === 422) {
      return "Please check your input and try again.";
    }
    if (error.response?.status === 429) {
      return "Too many registration attempts. Please try again later.";
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
    
    return "Registration failed. Please try again.";
  };

  // Standard password validation (only length) horse
  const validatePassword = (password: string): string[] => {
    const errors = [];
    if (password.length < PASSWORD_REQUIREMENTS.minLength) {
      errors.push(`at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
    }
    return errors;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Step validation
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Basic info validation
      if (!formData.username.trim()) newErrors.username = "Username is required";
      if (!formData.email.trim()) newErrors.email = "Email is required";
      if (formData.email && !validateEmail(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
    }

    if (step === 2) {
      // Password validation
      if (!formData.password) newErrors.password = "Password is required";
      if (formData.password) {
        const passwordErrors = validatePassword(formData.password);
        if (passwordErrors.length > 0) {
          newErrors.password = `Password must contain ${passwordErrors.join(", ")}`;
        }
      }
      if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";
      if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    if (step === 3) {
      // Personal info validation  hello
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateStep(3)) {
      return;
    }

    setIsLoading(true);

    try {
      // Remove confirmPassword from the data sent to the API
      const { confirmPassword, ...registrationData } = formData;
      
      // Clean up empty optional fields
      const cleanData = Object.fromEntries(
        Object.entries(registrationData).filter(([_, value]) => value !== "")
      );

      await api.post("/auth/register", cleanData);
      
      // Redirect to login with success message
      router.push("/login?message=Registration successful! Please log in.");
    } catch (err) {
      console.error("Registration error:", err);
      
      // Handle field-specific errors from API
      const apiError = err as ApiError;
      if (apiError.response?.data?.errors) {
        setErrors(apiError.response.data.errors);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  // Get password strength indicator (simplified)
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: "Enter password", color: "gray" };
    
    const length = password.length;
    
    if (length >= 12) return { strength: 5, label: "Very Strong", color: "green" };
    if (length >= 10) return { strength: 4, label: "Strong", color: "blue" };
    if (length >= 8) return { strength: 3, label: "Good", color: "yellow" };
    if (length >= 6) return { strength: 2, label: "Weak", color: "orange" };
    return { strength: 1, label: "Too Short", color: "red" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-2)] bg-[var(--background)] text-[var(--text)] py-8">
      <div className="w-full max-w-lg bg-[var(--background-2)] rounded-lg shadow p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-center text-[var(--text)]">
            Create an Account
          </h2>
          <p className="text-center text-[var(--text)] mt-1">
            Get started with your WealthLog!
          </p>
          
          {/* Progress indicator */}
          <div className="flex justify-center mt-4">
            <div className="flex space-x-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    step <= currentStep
                      ? 'bg-[var(--primary)]'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-sm text-[var(--text)] mt-2">
            Step {currentStep} of 3
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

        <form onSubmit={currentStep === 3 ? handleRegister : (e) => e.preventDefault()} className="mt-6 space-y-4" noValidate>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Basic Information</h3>
              
              {/* Username */}
              <div>
                <label htmlFor="username" className="block font-semibold text-[var(--text)]">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
                  value={formData.username}
                  onChange={handleInputChange("username")}
                  required
                  aria-describedby={errors.username ? "username-error" : undefined}
                />
                {errors.username && (
                  <p id="username-error" className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block font-semibold text-[var(--text)]">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
                  value={formData.email}
                  onChange={handleInputChange("email")}
                  required
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </>
          )}

          {/* Step 2: Password Security */}
          {currentStep === 2 && (
            <>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Password Security</h3>
              
              {/* Password Requirements Info */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <h4 className="font-medium text-blue-800 mb-2">Password Requirements:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• At least {PASSWORD_REQUIREMENTS.minLength} characters long</li>
                </ul>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block font-semibold text-[var(--text)]">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="mt-1 p-2 w-full pr-10 border rounded focus:outline-none focus:ring focus:ring-blue-300"
                    value={formData.password}
                    onChange={handleInputChange("password")}
                    required
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    onClick={() => togglePasswordVisibility('password')}
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
                
                {/* Password strength indicator */}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${(passwordStrength.strength / 5) * 100}%`,
                            backgroundColor: passwordStrength.color === 'green' ? '#22c55e' :
                                          passwordStrength.color === 'blue' ? '#3b82f6' :
                                          passwordStrength.color === 'yellow' ? '#eab308' :
                                          passwordStrength.color === 'orange' ? '#f97316' :
                                          passwordStrength.color === 'red' ? '#ef4444' : '#6b7280'
                          }}
                        />
                      </div>
                      <span 
                        className="text-sm font-medium"
                        style={{
                          color: passwordStrength.color === 'green' ? '#16a34a' :
                                passwordStrength.color === 'blue' ? '#2563eb' :
                                passwordStrength.color === 'yellow' ? '#ca8a04' :
                                passwordStrength.color === 'orange' ? '#ea580c' :
                                passwordStrength.color === 'red' ? '#dc2626' : '#4b5563'
                        }}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                )}
                
                {errors.password && (
                  <p id="password-error" className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block font-semibold text-[var(--text)]">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="mt-1 p-2 w-full pr-10 border rounded focus:outline-none focus:ring focus:ring-blue-300"
                    value={formData.confirmPassword}
                    onChange={handleInputChange("confirmPassword")}
                    required
                    aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
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
                {errors.confirmPassword && (
                  <p id="confirm-password-error" className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          {/* Step 3: Personal Information */}
          {currentStep === 3 && (
            <>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Personal Information</h3>
              
              {/* First & Last Name */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label htmlFor="firstName" className="block font-semibold text-[var(--text)]">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
                    value={formData.firstName}
                    onChange={handleInputChange("firstName")}
                    required
                    aria-describedby={errors.firstName ? "first-name-error" : undefined}
                  />
                  {errors.firstName && (
                    <p id="first-name-error" className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>
                <div className="flex-1">
                  <label htmlFor="lastName" className="block font-semibold text-[var(--text)]">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
                    value={formData.lastName}
                    onChange={handleInputChange("lastName")}
                    required
                    aria-describedby={errors.lastName ? "last-name-error" : undefined}
                  />
                  {errors.lastName && (
                    <p id="last-name-error" className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block font-semibold text-[var(--text)]">
                  Phone (Optional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
                  value={formData.phone}
                  onChange={handleInputChange("phone")}
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dateOfBirth" className="block font-semibold text-[var(--text)]">
                  Date of Birth (Optional)
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  autoComplete="bday"
                  className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange("dateOfBirth")}
                />
              </div>

              {/* Security Question */}
              <div>
                <label htmlFor="securityQuestion" className="block font-semibold text-[var(--text)]">
                  Security Question (Optional)
                </label>
                <input
                  id="securityQuestion"
                  name="securityQuestion"
                  type="text"
                  className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
                  value={formData.securityQuestion}
                  onChange={handleInputChange("securityQuestion")}
                  placeholder="e.g., What was your first pet's name?"
                  aria-describedby={errors.securityQuestion ? "security-question-error" : undefined}
                />
                {errors.securityQuestion && (
                  <p id="security-question-error" className="mt-1 text-sm text-red-600">{errors.securityQuestion}</p>
                )}
              </div>

              {/* Security Answer */}
              <div>
                <label htmlFor="securityAnswer" className="block font-semibold text-[var(--text)]">
                  Security Answer (Optional)
                </label>
                <input
                  id="securityAnswer"
                  name="securityAnswer"
                  type="text"
                  className="mt-1 p-2 w-full border rounded focus:outline-none focus:ring focus:ring-blue-300"
                  value={formData.securityAnswer}
                  onChange={handleInputChange("securityAnswer")}
                  aria-describedby={errors.securityAnswer ? "security-answer-error" : undefined}
                />
                {errors.securityAnswer && (
                  <p id="security-answer-error" className="mt-1 text-sm text-red-600">{errors.securityAnswer}</p>
                )}
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex space-x-4 mt-6">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="flex-1 py-2 px-4 border border-gray-300 rounded font-semibold text-[var(--text)] hover:bg-gray-50 transition"
              >
                Previous
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-2 px-4 bg-[var(--primary)] text-white font-semibold rounded hover:bg-[var(--primary)] transition"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 px-4 bg-green-600 text-white font-bold rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            )}
          </div>
        </form>

        <p className="mt-4 text-center text-[var(--text)]">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
