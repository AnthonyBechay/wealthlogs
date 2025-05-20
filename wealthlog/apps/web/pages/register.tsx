// pages/register.tsx

import { useState } from "react";
import { useRouter } from "next/router";
import { api } from "@wealthlog/common";
import Link from "next/link";

// Types for better type safety
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
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [userEmail, setUserEmail] = useState("");
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
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Centralized input change handler
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

    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (!navigator.onLine) {
      return "Please check your internet connection.";
    }
    
    return "Registration failed. Please try again.";
  };

  // Password validation
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
      // Personal info validation
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

  // Registration function
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrors({});

    if (!validateStep(3)) {
      return;
    }

    setIsLoading(true);

    // Remove confirmPassword from the data sent to the API
    const { confirmPassword, ...registrationData } = formData;
    
    // Clean up empty optional fields
    const cleanData = Object.fromEntries(
      Object.entries(registrationData).filter(([_, value]) => value !== "")
    );

    console.log("Starting registration with:", cleanData);

    // Use Promise-based approach instead of async/await
    api.post("/auth/register", cleanData)
      .then((response) => {
        console.log("✓ Registration successful:", response);
        setUserEmail(formData.email);
        setRegistrationComplete(true);
      })
      .catch((err) => {
        console.log("✗ Registration failed:");
        console.log("Error object:", err);
        console.log("Error response:", err?.response);
        console.log("Error status:", err?.response?.status);
        console.log("Error data:", err?.response?.data);

        // Handle 409 conflict specifically
        if (err?.response?.status === 409) {
          console.log("→ Handling 409 conflict");
          const responseData = err.response.data || {};
          const message = responseData.message || "";

          // Check if we have field-specific errors
          if (responseData.errors) {
            const fieldErrors: Record<string, string> = {};
            Object.entries(responseData.errors).forEach(([field, value]: [string, any]) => {
              if (Array.isArray(value)) {
                fieldErrors[field] = value[0];
              } else {
                fieldErrors[field] = value;
              }
            });
            setErrors(fieldErrors);
            setCurrentStep(1);
          } else {
            // Determine field based on message
            if (message.toLowerCase().includes('email')) {
              setErrors({ email: "This email address is already registered" });
            } else if (message.toLowerCase().includes('username')) {
              setErrors({ username: "This username is already taken" });
            } else {
              setError("Username or email already exists. Please use different values.");
            }
            setCurrentStep(1);
          }
        } else {
          // Handle other errors
          setError(getErrorMessage(err));
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleResendVerification = () => {
    setIsResending(true);
    api.post("/auth/resend-verification", { email: userEmail })
      .then(() => {
        alert("Verification email sent successfully!");
      })
      .catch(() => {
        alert("Failed to resend verification email. Please try again.");
      })
      .finally(() => {
        setIsResending(false);
      });
  };

  const togglePasswordVisibility = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  // Get password strength indicator
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

  // Email Confirmation Success Screen
  if (registrationComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text)] px-4">
        <div className="max-w-md w-full bg-[var(--background-2)] rounded-lg shadow-lg p-8">
          <div className="text-center">
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-[var(--text)] mb-4">
              Account Created Successfully!
            </h2>
            
            <p className="text-[var(--text)] mb-2">We've sent a verification email to:</p>
            <p className="font-semibold text-[var(--primary)] mb-6">{userEmail}</p>
            
            {/* Instructions */}
            <div className="bg-[var(--background)] rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-[var(--text)] mb-2">Next steps:</h3>
              <ol className="text-sm text-[var(--text)] space-y-1 list-decimal list-inside">
                <li>Check your email inbox</li>
                <li>Click the verification link</li>
                <li>Return here and log in</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="w-full px-4 py-2 border border-[var(--primary)] text-[var(--primary)] rounded-lg hover:bg-[var(--primary)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </button>
              
              <Link
                href="/login"
                className="block w-full px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition text-center"
              >
                Go to login
              </Link>
            </div>

            <p className="text-sm text-[var(--text)] mt-6">
              Didn't receive the email? Check your spam folder or click "Resend" above.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--text)] py-8 px-4">
      <div className="w-full max-w-lg bg-[var(--background-2)] rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-[var(--text)]">
            Create an Account
          </h2>
          <p className="text-[var(--text)] mt-1">
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
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <form onSubmit={currentStep === 3 ? handleRegister : (e) => e.preventDefault()} className="space-y-4" noValidate>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Basic Information</h3>
              
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[var(--text)] mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
                  value={formData.username}
                  onChange={handleInputChange("username")}
                  placeholder="Enter username"
                  required
                  aria-describedby={errors.username ? "username-error" : undefined}
                />
                {errors.username && (
                  <p id="username-error" className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[var(--text)] mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
                  value={formData.email}
                  onChange={handleInputChange("email")}
                  placeholder="Enter email address"
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
              <div className="bg-[var(--background)] border border-gray-300 rounded-lg p-3 mb-4">
                <h4 className="font-medium text-[var(--text)] mb-2">Password Requirements:</h4>
                <ul className="text-sm text-[var(--text)] space-y-1">
                  <li>• At least {PASSWORD_REQUIREMENTS.minLength} characters long</li>
                </ul>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[var(--text)] mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
                    value={formData.password}
                    onChange={handleInputChange("password")}
                    placeholder="Minimum 8 characters"
                    required
                    aria-describedby={errors.password ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[var(--text)]"
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
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text)] mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
                    value={formData.confirmPassword}
                    onChange={handleInputChange("confirmPassword")}
                    placeholder="Confirm your password"
                    required
                    aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[var(--text)]"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-[var(--text)] mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
                    value={formData.firstName}
                    onChange={handleInputChange("firstName")}
                    placeholder="First name"
                    required
                    aria-describedby={errors.firstName ? "first-name-error" : undefined}
                  />
                  {errors.firstName && (
                    <p id="first-name-error" className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-[var(--text)] mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
                    value={formData.lastName}
                    onChange={handleInputChange("lastName")}
                    placeholder="Last name"
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
                <label htmlFor="phone" className="block text-sm font-medium text-[var(--text)] mb-1">
                  Phone (Optional)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
                  value={formData.phone}
                  onChange={handleInputChange("phone")}
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-[var(--text)] mb-1">
                  Date of Birth (Optional)
                </label>
                <input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  autoComplete="bday"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange("dateOfBirth")}
                />
              </div>

              {/* Security Question */}
              <div>
                <label htmlFor="securityQuestion" className="block text-sm font-medium text-[var(--text)] mb-1">
                  Security Question (Optional)
                </label>
                <input
                  id="securityQuestion"
                  name="securityQuestion"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
                  value={formData.securityQuestion}
                  onChange={handleInputChange("securityQuestion")}
                  placeholder="e.g., What was your first pet's name?"

                />

              </div>

              {/* Security Answer */}
              <div>
                <label htmlFor="securityAnswer" className="block text-sm font-medium text-[var(--text)] mb-1">
                  Security Answer (Optional)
                </label>
                <input
                  id="securityAnswer"
                  name="securityAnswer"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none bg-[var(--background)] text-[var(--text)]"
                  value={formData.securityAnswer}
                  onChange={handleInputChange("securityAnswer")}
                  placeholder="Your answer"
                />
                
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex space-x-4 mt-6">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-[var(--text)] font-medium hover:bg-[var(--background)] transition"
              >
                Previous
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 py-2 px-4 bg-[var(--primary)] text-white font-medium rounded-lg hover:opacity-90 transition"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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

        <p className="text-center text-[var(--text)] mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--primary)] hover:opacity-80 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
                
