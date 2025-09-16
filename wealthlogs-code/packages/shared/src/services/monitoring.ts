/**
 * Simple monitoring and logging utilities
 * Browser and mobile compatible
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Simple logger for browser and mobile
 */
export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string = 'WealthLog', level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${this.prefix}] [${level}] ${message}`;
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message), ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  error(message: string, error?: any, ...args: any[]) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), error, ...args);
    }
  }
}

/**
 * Simple metrics collector
 */
export class MetricsCollector {
  private metrics: Map<string, any[]> = new Map();

  increment(metric: string, tags?: Record<string, string>) {
    const key = this.getKey(metric, tags);
    const current = this.metrics.get(key) || [0];
    current[0]++;
    this.metrics.set(key, current);
  }

  gauge(metric: string, value: number, tags?: Record<string, string>) {
    const key = this.getKey(metric, tags);
    this.metrics.set(key, [value]);
  }

  startTimer(metric: string, tags?: Record<string, string>): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.timing(metric, duration, tags);
    };
  }

  timing(metric: string, duration: number, tags?: Record<string, string>) {
    const key = this.getKey(metric, tags);
    const current = this.metrics.get(key) || [];
    current.push(duration);
    this.metrics.set(key, current);
  }

  private getKey(metric: string, tags?: Record<string, string>): string {
    if (!tags) return metric;
    const tagStr = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    return `${metric}{${tagStr}}`;
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  clear() {
    this.metrics.clear();
  }
}

/**
 * Simple performance monitor
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  mark(name: string) {
    // Use the global performance object, not this class instance
    if (typeof window !== 'undefined' && window.performance) {
      this.marks.set(name, window.performance.now());
    } else if (typeof globalThis !== 'undefined' && globalThis.performance) {
      this.marks.set(name, globalThis.performance.now());
    } else {
      // Fallback to Date.now() if performance is not available
      this.marks.set(name, Date.now());
    }
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    if (!start) {
      throw new Error(`Start mark "${startMark}" not found`);
    }

    let end: number;
    if (endMark) {
      const endValue = this.marks.get(endMark);
      if (!endValue) {
        throw new Error(`End mark "${endMark}" not found`);
      }
      end = endValue;
    } else {
      // Use the global performance object for current time
      if (typeof window !== 'undefined' && window.performance) {
        end = window.performance.now();
      } else if (typeof globalThis !== 'undefined' && globalThis.performance) {
        end = globalThis.performance.now();
      } else {
        end = Date.now();
      }
    }

    return end - start;
  }

  clear(name?: string) {
    if (name) {
      this.marks.delete(name);
    } else {
      this.marks.clear();
    }
  }
}

// Export singleton instances for convenience
export const logger = new Logger('WealthLog', LogLevel.INFO);
export const metrics = new MetricsCollector();
export const performanceMonitor = new PerformanceMonitor();

export default {
  Logger,
  LogLevel,
  MetricsCollector,
  PerformanceMonitor,
  logger,
  metrics,
  performance: performanceMonitor, // Renamed to avoid confusion with global performance
};
