/**
 * Monitoring Service
 * Centralized logging, metrics, and monitoring for all platforms
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogContext {
  level: LogLevel;
  message: string;
  timestamp: Date;
  category?: string;
  userId?: string | number;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  error?: Error;
  stack?: string;
}

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  unit?: string;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logHandlers: ((log: LogContext) => void)[] = [];
  private buffer: LogContext[] = [];
  private maxBufferSize = 100;
  private isDevelopment = process.env.NODE_ENV === 'development';

  private constructor() {
    // Set log level from environment
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLogLevel && LogLevel[envLogLevel as keyof typeof LogLevel] !== undefined) {
      this.logLevel = LogLevel[envLogLevel as keyof typeof LogLevel];
    }

    // Add default console handler
    this.addHandler(this.consoleHandler.bind(this));
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set minimum log level
   */
  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  /**
   * Add custom log handler
   */
  addHandler(handler: (log: LogContext) => void) {
    this.logHandlers.push(handler);
  }

  /**
   * Log methods
   */
  debug(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error | any, metadata?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, { ...metadata, error });
  }

  fatal(message: string, error?: Error | any, metadata?: Record<string, any>) {
    this.log(LogLevel.FATAL, message, { ...metadata, error });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    if (level < this.logLevel) return;

    const context: LogContext = {
      level,
      message,
      timestamp: new Date(),
      metadata,
    };

    // Add error details if present
    if (metadata?.error) {
      context.error = metadata.error;
      context.stack = metadata.error.stack;
    }

    // Add to buffer
    this.buffer.push(context);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Process through handlers
    this.logHandlers.forEach(handler => {
      try {
        handler(context);
      } catch (error) {
        console.error('Log handler error:', error);
      }
    });
  }

  /**
   * Default console handler
   */
  private consoleHandler(log: LogContext) {
    const timestamp = log.timestamp.toISOString();
    const level = LogLevel[log.level];
    const prefix = `[${timestamp}] [${level}]`;
    
    const message = log.metadata 
      ? `${prefix} ${log.message} ${JSON.stringify(log.metadata)}`
      : `${prefix} ${log.message}`;

    switch (log.level) {
      case LogLevel.DEBUG:
        if (this.isDevelopment) console.debug(message);
        break;
      case LogLevel.INFO:
        console.info(message);
        break;
      case LogLevel.WARN:
        console.warn(message);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message);
        if (log.stack) console.error(log.stack);
        break;
    }
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count?: number): LogContext[] {
    const logs = [...this.buffer];
    return count ? logs.slice(-count) : logs;
  }

  /**
   * Clear log buffer
   */
  clearBuffer() {
    this.buffer = [];
  }
}

/**
 * Metrics collector for performance monitoring
 */
export class MetricsCollector {
  private static instance: MetricsCollector;
  private metrics: Metric[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private maxMetrics = 1000;
  private metricsHandlers: ((metric: Metric) => void)[] = [];

  private constructor() {}

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Record a metric
   */
  record(name: string, value: number, tags?: Record<string, string>, unit?: string) {
    const metric: Metric = {
      name,
      value,
      timestamp: new Date(),
      tags,
      unit,
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Process through handlers
    this.metricsHandlers.forEach(handler => {
      try {
        handler(metric);
      } catch (error) {
        console.error('Metrics handler error:', error);
      }
    });
  }

  /**
   * Increment a counter
   */
  increment(name: string, tags?: Record<string, string>) {
    const existing = this.metrics.find(m => 
      m.name === name && JSON.stringify(m.tags) === JSON.stringify(tags)
    );

    if (existing) {
      existing.value++;
      existing.timestamp = new Date();
    } else {
      this.record(name, 1, tags, 'count');
    }
  }

  /**
   * Record timing
   */
  recordTiming(name: string, duration: number, tags?: Record<string, string>) {
    this.record(name, duration, tags, 'ms');
  }

  /**
   * Start a timer
   */
  startTimer(name: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordTiming(name, duration);
      return duration;
    };
  }

  /**
   * Record performance metric
   */
  recordPerformance(metric: PerformanceMetric) {
    this.performanceMetrics.push(metric);
    if (this.performanceMetrics.length > this.maxMetrics) {
      this.performanceMetrics.shift();
    }
  }

  /**
   * Get metrics summary
   */
  getSummary(name?: string): Record<string, any> {
    const filtered = name 
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (filtered.length === 0) return {};

    const values = filtered.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: filtered.length,
      sum,
      avg,
      min,
      max,
      last: filtered[filtered.length - 1]?.value,
    };
  }

  /**
   * Add metrics handler
   */
  addHandler(handler: (metric: Metric) => void) {
    this.metricsHandlers.push(handler);
  }

  /**
   * Get all metrics
   */
  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.performanceMetrics = [];
  }
}

/**
 * Performance monitor for tracking operations
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private operations: Map<string, number> = new Map();
  private logger = Logger.getInstance();
  private metrics = MetricsCollector.getInstance();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start monitoring an operation
   */
  startOperation(operationId: string, metadata?: Record<string, any>): void {
    this.operations.set(operationId, Date.now());
    this.logger.debug(`Operation started: ${operationId}`, metadata);
  }

  /**
   * End monitoring an operation
   */
  endOperation(operationId: string, success = true, metadata?: Record<string, any>): number {
    const startTime = this.operations.get(operationId);
    
    if (!startTime) {
      this.logger.warn(`Operation not found: ${operationId}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.operations.delete(operationId);

    // Record performance metric
    this.metrics.recordPerformance({
      name: operationId,
      duration,
      timestamp: new Date(),
      success,
      metadata,
    });

    // Log based on duration
    const logMetadata = { ...metadata, duration, success };
    
    if (duration > 5000) {
      this.logger.warn(`Slow operation: ${operationId}`, logMetadata);
    } else {
      this.logger.debug(`Operation completed: ${operationId}`, logMetadata);
    }

    return duration;
  }

  /**
   * Measure async function performance
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startOperation(name, metadata);
    
    try {
      const result = await fn();
      this.endOperation(name, true, metadata);
      return result;
    } catch (error) {
      this.endOperation(name, false, { ...metadata, error });
      throw error;
    }
  }

  /**
   * Get active operations
   */
  getActiveOperations(): string[] {
    return Array.from(this.operations.keys());
  }

  /**
   * Clear stale operations (older than timeout)
   */
  clearStaleOperations(timeoutMs = 300000) {
    const now = Date.now();
    const stale: string[] = [];

    this.operations.forEach((startTime, operationId) => {
      if (now - startTime > timeoutMs) {
        stale.push(operationId);
      }
    });

    stale.forEach(operationId => {
      this.logger.warn(`Stale operation cleared: ${operationId}`);
      this.operations.delete(operationId);
    });

    return stale.length;
  }
}

/**
 * Health check service
 */
export class HealthCheck {
  private static instance: HealthCheck;
  private checks: Map<string, () => Promise<boolean>> = new Map();
  private results: Map<string, { healthy: boolean; lastCheck: Date; error?: string }> = new Map();
  private logger = Logger.getInstance();

  private constructor() {}

  static getInstance(): HealthCheck {
    if (!HealthCheck.instance) {
      HealthCheck.instance = new HealthCheck();
    }
    return HealthCheck.instance;
  }

  /**
   * Register a health check
   */
  register(name: string, check: () => Promise<boolean>) {
    this.checks.set(name, check);
  }

  /**
   * Run all health checks
   */
  async checkAll(): Promise<Record<string, any>> {
    const results: Record<string, any> = {
      healthy: true,
      timestamp: new Date(),
      checks: {},
    };

    for (const [name, check] of this.checks) {
      try {
        const healthy = await check();
        results.checks[name] = {
          healthy,
          lastCheck: new Date(),
        };
        
        if (!healthy) {
          results.healthy = false;
        }

        this.results.set(name, {
          healthy,
          lastCheck: new Date(),
        });
      } catch (error: any) {
        results.healthy = false;
        results.checks[name] = {
          healthy: false,
          lastCheck: new Date(),
          error: error.message,
        };

        this.results.set(name, {
          healthy: false,
          lastCheck: new Date(),
          error: error.message,
        });

        this.logger.error(`Health check failed: ${name}`, error);
      }
    }

    return results;
  }

  /**
   * Get last health check results
   */
  getLastResults(): Record<string, any> {
    const results: Record<string, any> = {};
    
    this.results.forEach((result, name) => {
      results[name] = result;
    });

    return results;
  }

  /**
   * Check if system is healthy
   */
  isHealthy(): boolean {
    for (const result of this.results.values()) {
      if (!result.healthy) return false;
    }
    return true;
  }
}

/**
 * Create singleton instances
 */
export const logger = Logger.getInstance();
export const metrics = MetricsCollector.getInstance();
export const performance = PerformanceMonitor.getInstance();
export const health = HealthCheck.getInstance();

export default {
  Logger,
  MetricsCollector,
  PerformanceMonitor,
  HealthCheck,
  logger,
  metrics,
  performance,
  health,
  LogLevel,
};
