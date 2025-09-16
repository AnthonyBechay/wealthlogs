/**
 * Simple error handling utilities
 */

export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(options: {
    code: string;
    message: string;
    statusCode?: number;
    details?: any;
  }) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode || 500;
    this.details = options.details;
  }
}

/**
 * Common error codes
 */
export const ErrorCode = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

/**
 * Error factory for creating common errors
 */
export class ErrorFactory {
  static validationError(message: string, details?: any): AppError {
    return new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message,
      statusCode: 400,
      details,
    });
  }

  static authenticationError(message: string = 'Authentication required'): AppError {
    return new AppError({
      code: ErrorCode.AUTH_REQUIRED,
      message,
      statusCode: 401,
    });
  }

  static unauthorizedError(message: string = 'Unauthorized'): AppError {
    return new AppError({
      code: ErrorCode.AUTH_UNAUTHORIZED,
      message,
      statusCode: 403,
    });
  }

  static notFoundError(message: string = 'Resource not found'): AppError {
    return new AppError({
      code: ErrorCode.NOT_FOUND,
      message,
      statusCode: 404,
    });
  }

  static rateLimitError(message: string = 'Too many requests'): AppError {
    return new AppError({
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      statusCode: 429,
    });
  }

  static internalError(message: string = 'Internal server error'): AppError {
    return new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message,
      statusCode: 500,
    });
  }
}

/**
 * Simple retry handler
 */
export class RetryHandler {
  constructor(
    private maxAttempts: number = 3,
    private delayMs: number = 1000,
    private backoffMultiplier: number = 2
  ) {}

  async execute<T>(
    fn: () => Promise<T>,
    retryCondition?: (error: any) => boolean
  ): Promise<T> {
    let lastError: any;
    let delay = this.delayMs;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (retryCondition && !retryCondition(error)) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.maxAttempts) {
          throw error;
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= this.backoffMultiplier;
      }
    }

    throw lastError;
  }
}

export default {
  AppError,
  ErrorCode,
  ErrorFactory,
  RetryHandler,
};
