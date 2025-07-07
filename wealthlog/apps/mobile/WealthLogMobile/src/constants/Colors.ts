// src/constants/Colors.ts

const tintColorLight = '#007bff'; // Primary blue
const tintColorDark = '#fff';

export default {
  light: {
    text: '#343a40', // Dark gray for text
    background: '#f8f9fa', // Light gray background
    tint: tintColorLight,
    icon: '#6c757d', // Medium gray for icons
    tabIconDefault: '#6c757d',
    tabIconSelected: tintColorLight,
    primary: tintColorLight,
    secondary: '#6c757d', // Medium gray
    accent: '#28a745', // Green for positive actions/success
    error: '#dc3545', // Red for errors/negative actions
    warning: '#ffc107', // Yellow for warnings
    card: '#ffffff', // Card background
    border: '#dee2e6', // Border color
    inputBackground: '#ffffff',
    inputBorder: '#ced4da',
    disabled: '#adb5bd',
    link: tintColorLight,
  },
  dark: { // Example dark theme colors - can be expanded
    text: '#e9ecef',
    background: '#212529',
    tint: tintColorDark,
    icon: '#adb5bd',
    tabIconDefault: '#adb5bd',
    tabIconSelected: tintColorDark,
    primary: tintColorLight, // Keep primary same or use a lighter blue
    secondary: '#adb5bd',
    accent: '#20c997', // Lighter green
    error: '#f16270', // Lighter red
    warning: '#ffd33d',
    card: '#343a40',
    border: '#495057',
    inputBackground: '#495057',
    inputBorder: '#6c757d',
    disabled: '#6c757d',
    link: tintColorLight, // Or a lighter blue for dark mode
  },
};

// Common colors (can be used directly if not using light/dark theme logic yet)
export const commonColors = {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    white: '#ffffff',
    black: '#000000',
    grey: '#ced4da', // General purpose grey
};
