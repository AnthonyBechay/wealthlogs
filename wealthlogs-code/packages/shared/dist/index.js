"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.health = exports.performance = exports.metrics = exports.logger = exports.HealthCheck = exports.PerformanceMonitor = exports.MetricsCollector = exports.Logger = exports.getApiClient = exports.createApiClient = exports.ApiClient = exports.RateLimiter = exports.CSRFProtection = exports.SecureStorage = exports.SecurityService = exports.FieldValidators = exports.ValidationSchemas = exports.DataValidator = exports.ErrorCode = exports.CircuitBreaker = exports.RetryHandler = exports.ErrorHandler = exports.ErrorFactory = exports.AppError = exports.MemoryTokenStorage = exports.MobileTokenStorage = exports.WebTokenStorage = exports.createTokenStorage = exports.getPlatform = exports.WealthLogAPI = exports.createWealthLogAPI = void 0;
// Main exports for @wealthlog/shared package
__exportStar(require("./api/index"), exports);
__exportStar(require("./storage/index"), exports);
__exportStar(require("./types/index"), exports);
// Export new services
__exportStar(require("./services/error-handler"), exports);
__exportStar(require("./services/data-validator"), exports);
__exportStar(require("./services/security"), exports);
__exportStar(require("./services/api-client"), exports);
__exportStar(require("./services/monitoring"), exports);
// Re-export commonly used utilities
var index_1 = require("./api/index");
Object.defineProperty(exports, "createWealthLogAPI", { enumerable: true, get: function () { return index_1.createWealthLogAPI; } });
Object.defineProperty(exports, "WealthLogAPI", { enumerable: true, get: function () { return index_1.WealthLogAPI; } });
Object.defineProperty(exports, "getPlatform", { enumerable: true, get: function () { return index_1.getPlatform; } });
var index_2 = require("./storage/index");
Object.defineProperty(exports, "createTokenStorage", { enumerable: true, get: function () { return index_2.createTokenStorage; } });
Object.defineProperty(exports, "WebTokenStorage", { enumerable: true, get: function () { return index_2.WebTokenStorage; } });
Object.defineProperty(exports, "MobileTokenStorage", { enumerable: true, get: function () { return index_2.MobileTokenStorage; } });
Object.defineProperty(exports, "MemoryTokenStorage", { enumerable: true, get: function () { return index_2.MemoryTokenStorage; } });
// Re-export new service utilities
var error_handler_1 = require("./services/error-handler");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return error_handler_1.AppError; } });
Object.defineProperty(exports, "ErrorFactory", { enumerable: true, get: function () { return error_handler_1.ErrorFactory; } });
Object.defineProperty(exports, "ErrorHandler", { enumerable: true, get: function () { return error_handler_1.ErrorHandler; } });
Object.defineProperty(exports, "RetryHandler", { enumerable: true, get: function () { return error_handler_1.RetryHandler; } });
Object.defineProperty(exports, "CircuitBreaker", { enumerable: true, get: function () { return error_handler_1.CircuitBreaker; } });
Object.defineProperty(exports, "ErrorCode", { enumerable: true, get: function () { return error_handler_1.ErrorCode; } });
var data_validator_1 = require("./services/data-validator");
Object.defineProperty(exports, "DataValidator", { enumerable: true, get: function () { return data_validator_1.DataValidator; } });
Object.defineProperty(exports, "ValidationSchemas", { enumerable: true, get: function () { return data_validator_1.ValidationSchemas; } });
Object.defineProperty(exports, "FieldValidators", { enumerable: true, get: function () { return data_validator_1.FieldValidators; } });
var security_1 = require("./services/security");
Object.defineProperty(exports, "SecurityService", { enumerable: true, get: function () { return security_1.SecurityService; } });
Object.defineProperty(exports, "SecureStorage", { enumerable: true, get: function () { return security_1.SecureStorage; } });
Object.defineProperty(exports, "CSRFProtection", { enumerable: true, get: function () { return security_1.CSRFProtection; } });
Object.defineProperty(exports, "RateLimiter", { enumerable: true, get: function () { return security_1.RateLimiter; } });
var api_client_1 = require("./services/api-client");
Object.defineProperty(exports, "ApiClient", { enumerable: true, get: function () { return api_client_1.ApiClient; } });
Object.defineProperty(exports, "createApiClient", { enumerable: true, get: function () { return api_client_1.createApiClient; } });
Object.defineProperty(exports, "getApiClient", { enumerable: true, get: function () { return api_client_1.getApiClient; } });
var monitoring_1 = require("./services/monitoring");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return monitoring_1.Logger; } });
Object.defineProperty(exports, "MetricsCollector", { enumerable: true, get: function () { return monitoring_1.MetricsCollector; } });
Object.defineProperty(exports, "PerformanceMonitor", { enumerable: true, get: function () { return monitoring_1.PerformanceMonitor; } });
Object.defineProperty(exports, "HealthCheck", { enumerable: true, get: function () { return monitoring_1.HealthCheck; } });
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return monitoring_1.logger; } });
Object.defineProperty(exports, "metrics", { enumerable: true, get: function () { return monitoring_1.metrics; } });
Object.defineProperty(exports, "performance", { enumerable: true, get: function () { return monitoring_1.performance; } });
Object.defineProperty(exports, "health", { enumerable: true, get: function () { return monitoring_1.health; } });
Object.defineProperty(exports, "LogLevel", { enumerable: true, get: function () { return monitoring_1.LogLevel; } });
