
export type ThemeName = 'light' | 'dark';

export const COLOR_THEMES = {
  light: {
    background: '#FFFFFF',
    backgroundSecondary: '#F1F5F9',
    text: '#000000',
    primary: '#3B82F6',
    danger: '#EF4444',
    success: '#10B981',
  },
  dark: {
    background: '#1E1E1E',
    backgroundSecondary: '#2A2A2A',
    text: '#FFFFFF',
    primary: '#2563EB',
    danger: '#F87171',
    success: '#34D399',
  },
} as const;
