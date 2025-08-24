/**
 * Secure Form Components with Built-in Validation
 * Provides form components with security features
 */

import React, { useState, useCallback, FormEvent } from 'react';
import {
  DataValidator,
  ValidationSchema,
  FieldValidators,
  SecurityService,
  CSRFProtection,
  logger
} from '@wealthlog/shared';

interface SecureFormProps {
  onSubmit: (data: any) => Promise<void>;
  validationSchema: ValidationSchema;
  className?: string;
  children: React.ReactNode;
  csrfProtection?: boolean;
}

/**
 * Secure Form Component
 */
export const SecureForm: React.FC<SecureFormProps> = ({
  onSubmit,
  validationSchema,
  className = '',
  children,
  csrfProtection = true
}) => {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);

    try {
      // Get form data
      const formData = new FormData(e.currentTarget);
      const data: Record<string, any> = {};
      
      formData.forEach((value, key) => {
        data[key] = value;
      });

      // Add CSRF token if enabled
      if (csrfProtection) {
        const csrfToken = CSRFProtection.getToken();
        if (csrfToken) {
          data._csrf = csrfToken;
        }
      }

      // Validate data
      const validationResult = DataValidator.validate(data, validationSchema);
      
      if (!validationResult.isValid) {
        setErrors(validationResult.errors);
        logger.warn('Form validation failed', validationResult.errors);
        return;
      }

      // Submit sanitized data
      await onSubmit(validationResult.data!);
    } catch (error: any) {
      logger.error('Form submission error', error);
      setErrors({ _form: [error.message || 'Submission failed'] });
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, validationSchema, csrfProtection]);

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      {/* Pass errors to children */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as any, { errors, submitting });
        }
        return child;
      })}
      
      {/* Form-level errors */}
      {errors._form && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {errors._form.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </form>
  );
};

interface SecureInputProps {
  name: string;
  type?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  errors?: Record<string, string[]>;
  disabled?: boolean;
  maxLength?: number;
  pattern?: string;
  sanitize?: boolean;
}

/**
 * Secure Input Component
 */
export const SecureInput: React.FC<SecureInputProps> = ({
  name,
  type = 'text',
  label,
  placeholder,
  required = false,
  autoComplete,
  className = '',
  errors = {},
  disabled = false,
  maxLength,
  pattern,
  sanitize = true
}) => {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const fieldErrors = errors[name] || [];
  const hasError = touched && fieldErrors.length > 0;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Sanitize input if enabled
    if (sanitize && type === 'text') {
      newValue = SecurityService.sanitizeHtml(newValue);
    }
    
    setValue(newValue);
  }, [sanitize, type]);

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        disabled={disabled}
        maxLength={maxLength}
        pattern={pattern}
        className={`
          w-full px-3 py-2 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${hasError ? 'border-red-500' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${className}
        `}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${name}-error` : undefined}
      />
      
      {hasError && (
        <div id={`${name}-error`} className="mt-1 text-sm text-red-600">
          {fieldErrors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
};

interface PasswordInputProps extends Omit<SecureInputProps, 'type'> {
  showStrength?: boolean;
}

/**
 * Secure Password Input with Strength Indicator
 */
export const PasswordInput: React.FC<PasswordInputProps> = ({
  showStrength = true,
  ...props
}) => {
  const [value, setValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState<any>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    if (showStrength && newValue) {
      const passwordStrength = SecurityService.getPasswordStrength(newValue);
      setStrength(passwordStrength);
    } else {
      setStrength(null);
    }
  }, [showStrength]);

  const toggleShowPassword = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const getStrengthColor = () => {
    if (!strength) return 'gray';
    if (strength.score < 4) return 'red';
    if (strength.score < 7) return 'yellow';
    return 'green';
  };

  return (
    <div className="mb-4">
      {props.label && (
        <label htmlFor={props.name} className="block text-sm font-medium text-gray-700 mb-1">
          {props.label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          {...props}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          className={`
            w-full px-3 py-2 pr-10 border rounded-md shadow-sm
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${props.errors?.[props.name]?.length ? 'border-red-500' : 'border-gray-300'}
            ${props.disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${props.className || ''}
          `}
        />
        
        <button
          type="button"
          onClick={toggleShowPassword}
          className="absolute inset-y-0 right-0 px-3 flex items-center"
          tabIndex={-1}
        >
          {showPassword ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>
      
      {showStrength && strength && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">Password Strength</span>
            <span className={`text-xs font-medium text-${getStrengthColor()}-600`}>
              {strength.score}/10
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`bg-${getStrengthColor()}-500 h-2 rounded-full transition-all`}
              style={{ width: `${strength.score * 10}%` }}
            />
          </div>
          
          {strength.feedback.length > 0 && (
            <ul className="mt-1 text-xs text-gray-600">
              {strength.feedback.map((item: string, index: number) => (
                <li key={index}>• {item}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {props.errors?.[props.name] && (
        <div className="mt-1 text-sm text-red-600">
          {props.errors[props.name].map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
};

interface SecureFileUploadProps {
  name: string;
  label?: string;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  required?: boolean;
  errors?: Record<string, string[]>;
  onFileSelect?: (files: File[]) => void;
}

/**
 * Secure File Upload Component
 */
export const SecureFileUpload: React.FC<SecureFileUploadProps> = ({
  name,
  label,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  required = false,
  errors = {},
  onFileSelect
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const fieldErrors = errors[name] || [];

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const errors: string[] = [];
    const validFiles: File[] = [];

    files.forEach(file => {
      // Check file size
      if (file.size > maxSize) {
        errors.push(`${file.name} exceeds maximum size of ${maxSize / 1024 / 1024}MB`);
        return;
      }

      // Check file name for malicious patterns
      const sanitizedName = SecurityService.sanitizeHtml(file.name);
      if (sanitizedName !== file.name) {
        errors.push(`${file.name} contains invalid characters`);
        return;
      }

      // Check file extension
      if (accept) {
        const acceptedTypes = accept.split(',').map(t => t.trim());
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const fileType = file.type;
        
        const isAccepted = acceptedTypes.some(type => 
          type === fileType || type === fileExtension || 
          (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '')))
        );
        
        if (!isAccepted) {
          errors.push(`${file.name} is not an accepted file type`);
          return;
        }
      }

      validFiles.push(file);
    });

    setFileErrors(errors);
    setSelectedFiles(validFiles);
    
    if (onFileSelect) {
      onFileSelect(validFiles);
    }
  }, [maxSize, accept, onFileSelect]);

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
        <div className="space-y-1 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          <div className="flex text-sm text-gray-600">
            <label
              htmlFor={name}
              className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
            >
              <span>Upload files</span>
              <input
                id={name}
                name={name}
                type="file"
                accept={accept}
                multiple={multiple}
                required={required}
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          
          <p className="text-xs text-gray-500">
            {accept ? `Accepted: ${accept}` : 'Any file type'}
            {` up to ${maxSize / 1024 / 1024}MB`}
          </p>
        </div>
      </div>
      
      {selectedFiles.length > 0 && (
        <div className="mt-2">
          <h4 className="text-sm font-medium text-gray-700">Selected files:</h4>
          <ul className="mt-1 text-sm text-gray-600">
            {selectedFiles.map((file, index) => (
              <li key={index}>
                {file.name} ({(file.size / 1024).toFixed(2)}KB)
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {(fileErrors.length > 0 || fieldErrors.length > 0) && (
        <div className="mt-1 text-sm text-red-600">
          {[...fileErrors, ...fieldErrors].map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default {
  SecureForm,
  SecureInput,
  PasswordInput,
  SecureFileUpload
};
