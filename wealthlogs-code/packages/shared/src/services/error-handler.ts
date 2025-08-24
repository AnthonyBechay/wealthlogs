/**
 * Centralized Error Handling Service
 * Provides consistent error handling across web and mobile platforms
 */

export enum ErrorCode {
  // Authentication Errors (1000-1099)
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_TOKEN_INVALID = 'AUTH_003',
  AUTH_UNAUTHORIZED = 'AUTH_004',
  AUTH_EMAIL_NOT_VERIFIED = 'AUTH_005',
  AUTH_USER_INACTIVE = 'AUTH_006',
  
  // Validation Errors (1100-1199)
  VALIDATION_FAILED = 'VAL_001',
  VALIDATION_MISSING_FIELD = 'VAL_002',
  VALIDATION_INVALID_FORMAT = 'VAL_003',
  
  // Business Logic Errors (1200-1299)
  BUSINESS_INSUFFICIENT_FUNDS = 'BUS_001',
  BUSINESS_DUPLICATE_ENTRY = 'BUS_002',
  BUSINESS_LIMIT_EXCEEDED = 'BUS_003',
  BUSINESS_INVALID_OPERATION = 'BUS_004',
  
  // Database Errors (1300-1399)
  DB_CONNECTION_FAILED = 'DB_001',
  DB_QUERY_FAILED = 'DB_002',
  DB_TRANSACTION_FAILED = 'DB_003',
  DB_RECORD_NOT_FOUND = 'DB_004',
  
  // Network Errors (1400-1499)
  NETWORK_TIMEOUT = 'NET_001',
  NETWORK_OFFLINE = 'NET_002',
  NETWORK_SERVER_ERROR = 'NET_003',
  
  // System Errors (1500-1599)
  SYSTEM_INTERNAL_ERROR = 'SYS_001',
  SYSTEM_SERVICE_UNAVAILABLE = 'SYS_002',
  SYSTEM_RATE_LIMIT_EXCEEDED = 'SYS_003',
  RATE_LIMIT_EXCEEDED = 'RATE_001',
}

export interface ErrorContext {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  details?: Record<string, any>;
  timestamp?: Date;
  requestId?: string;
  stack?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly isOperational: boolean;

  constructor(context: ErrorContext) {
    super(context.message);
    this.name = 'AppError';
    this.code = context.code;
    this.statusCode = context.statusCode || 500;
    this.details = context.details;
    this.timestamp = context.timestamp || new Date();
    this.requestId = context.requestId;
    this.isOperational = true;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }
}

/**
 * Error Factory for creating consistent errors
 */
export class ErrorFactory {
  static authError(message: string, code = ErrorCode.AUTH_UNAUTHORIZED, details?: any) {
    return new AppError({
      code,
      message,
      statusCode: 401,
      details,
    });
  }

  static validationError(message: string, details?: any) {
    return new AppError({
      code: ErrorCode.VALIDATION_FAILED,
      message,
      statusCode: 400,
      details,
    });
  }

  static notFoundError(resource: string, id?: string | number) {
    return new AppError({
      code: ErrorCode.DB_RECORD_NOT_FOUND,
      message: `${resource} not found${id ? `: ${id}` : ''}`,
      statusCode: 404,
      details: { resource, id },
    });
  }

  static businessError(message: string, code: ErrorCode, details?: any) {
    return new AppError({
      code,
      message,
      statusCode: 422,
      details,
    });
  }

  static systemError(message: string, details?: any) {
    return new AppError({
      code: ErrorCode.SYSTEM_INTERNAL_ERROR,
      message,
      statusCode: 500,
      details,
    });
  }
}

/**
 * Error Handler for different platforms
 */
export class ErrorHandler {
  private static isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

  /**
   * Handle errors in Express middleware
   */
  static expressHandler(err: Error | AppError, req: any, res: any, next: any) {
    if (!(err instanceof AppError)) {
      // Convert unknown errors to AppError
      err = new AppError({
        code: ErrorCode.SYSTEM_INTERNAL_ERROR,
        message: this.isDevelopment ? err.message : 'Internal server error',
        statusCode: 500,
        stack: err.stack,
      });
    }

    const appError = err as AppError;

    // Log error
    this.logError(appError);

    // Send response
    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(this.isDevelopment && { details: appError.details }),
        ...(this.isDevelopment && { stack: appError.stack }),
        timestamp: appError.timestamp,
        requestId: appError.requestId || req.id,
      },
    });
  }

  /**
   * Handle errors in React/Next.js
   */
  static async handleClientError(error: Error | AppError): Promise<ErrorContext> {
    if (!(error instanceof AppError)) {
      error = new AppError({
        code: ErrorCode.SYSTEM_INTERNAL_ERROR,
        message: error.message,
      });
    }

    const appError = error as AppError;
    
    // Log to console in development
    if (this.isDevelopment) {
      console.error('Client Error:', appError);
    }

    // Send to error tracking service (e.g., Sentry)
    await this.reportError(appError);

    return appError.toJSON();
  }

  /**
   * Handle API response errors
   */
  static handleApiError(response: any): AppError {
    if (response.status === 401) {
      return ErrorFactory.authError(
        response.data?.message || 'Authentication failed',
        ErrorCode.AUTH_UNAUTHORIZED
      );
    }

    if (response.status === 400) {
      return ErrorFactory.validationError(
        response.data?.message || 'Validation failed',
        response.data?.errors
      );
    }

    if (response.status === 404) {
      return ErrorFactory.notFoundError('Resource');
    }

    if (response.status === 429) {
      return new AppError({
        code: ErrorCode.SYSTEM_RATE_LIMIT_EXCEEDED,
        message: 'Too many requests',
        statusCode: 429,
      });
    }

    if (response.status >= 500) {
      return ErrorFactory.systemError('Server error occurred');
    }

    return ErrorFactory.systemError('An unexpected error occurred');
  }

  /**
   * Log errors to appropriate service
   */
  private static logError(error: AppError) {
    const logData = {
      timestamp: error.timestamp,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack,
      requestId: error.requestId,
    };

    if (error.statusCode >= 500) {
      console.error('ERROR:', logData);
    } else if (error.statusCode >= 400) {
      console.warn('WARNING:', logData);
    } else {
      console.info('INFO:', logData);
    }
  }

  /**
   * Report errors to external service
   */
  private static async reportError(error: AppError) {
    // Implement Sentry, LogRocket, or other error tracking
    // This is a placeholder for actual implementation
    if (typeof process !== 'undefined' && process.env?.SENTRY_DSN) {
      // await Sentry.captureException(error);
    }
  }
}

/**
 * Retry mechanism for transient failures
 */
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      backoff?: number;
      shouldRetry?: (error: any) => boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 2,
      shouldRetry = (error) => error.code === 'NETWORK_ERROR' || error.statusCode >= 500,
    } = options;

    let lastError: any;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts || !shouldRetry(error)) {
          throw error;
        }
        
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError;
  }
}

/**
 * Circuit Breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: Date;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold = 5,
    private readonly timeout = 60000, // 1 minute
    private readonly resetTimeout = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime!.getTime() > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new AppError({
          code: ErrorCode.SYSTEM_SERVICE_UNAVAILABLE,
          message: 'Service temporarily unavailable',
          statusCode: 503,
        });
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.reset();
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  private reset() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = undefined;
  }
}

export default {
  AppError,
  ErrorFactory,
  ErrorHandler,
  RetryHandler,
  CircuitBreaker,
  ErrorCode,
};
