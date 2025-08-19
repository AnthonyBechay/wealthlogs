"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardContent = exports.CardTitle = exports.CardHeader = exports.Card = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = require("clsx");
const Card = ({ children, padding = 'md', className, ...props }) => {
    const paddingStyles = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.clsx)('bg-white border border-gray-200 rounded-lg shadow-sm', paddingStyles[padding], className), ...props, children: children }));
};
exports.Card = Card;
const CardHeader = ({ children, className, ...props }) => {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.clsx)('border-b border-gray-200 pb-4 mb-4', className), ...props, children: children }));
};
exports.CardHeader = CardHeader;
const CardTitle = ({ children, as: Component = 'h3', className, ...props }) => {
    return ((0, jsx_runtime_1.jsx)(Component, { className: (0, clsx_1.clsx)('text-lg font-semibold text-gray-900', className), ...props, children: children }));
};
exports.CardTitle = CardTitle;
const CardContent = ({ children, className, ...props }) => {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.clsx)('text-gray-600', className), ...props, children: children }));
};
exports.CardContent = CardContent;
