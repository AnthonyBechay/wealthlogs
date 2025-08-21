"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Input = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const clsx_1 = require("clsx");
const Input = (0, react_1.forwardRef)(({ label, error, helpText, className, ...props }, ref) => {
    const inputStyles = (0, clsx_1.clsx)('w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm', {
        'border-gray-300 focus:ring-primary-500 focus:border-primary-500': !error,
        'border-red-300 focus:ring-red-500 focus:border-red-500': error,
    }, className);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-1", children: [label && ((0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700", children: label })), (0, jsx_runtime_1.jsx)("input", { ref: ref, className: inputStyles, "aria-invalid": error ? 'true' : 'false', "aria-describedby": error ? `${props.id}-error` : helpText ? `${props.id}-help` : undefined, ...props }), error && ((0, jsx_runtime_1.jsx)("p", { id: `${props.id}-error`, className: "text-sm text-red-600", children: error })), helpText && !error && ((0, jsx_runtime_1.jsx)("p", { id: `${props.id}-help`, className: "text-sm text-gray-500", children: helpText }))] }));
});
exports.Input = Input;
Input.displayName = 'Input';
