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
exports.MemoryTokenStorage = exports.MobileTokenStorage = exports.WebTokenStorage = exports.createTokenStorage = exports.getPlatform = exports.WealthLogAPI = exports.createWealthLogAPI = void 0;
// Main exports for @wealthlog/shared package
__exportStar(require("./api/index"), exports);
__exportStar(require("./storage/index"), exports);
__exportStar(require("./types/index"), exports);
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
