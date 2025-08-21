// styles/colors.ts
export type ThemeName = 'light' | 'dark' | 'system';
export type EffectiveThemeName = 'light' | 'dark';

export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  backgroundHover: string;
  backgroundAccent: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;
  
  // Primary colors (Gris slate premium)
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  
  // Accent colors (Or financier)
  accent: string;
  accentHover: string;
  accentLight: string;
  
  // Secondary colors
  secondary: string;
  secondaryHover: string;
  secondaryLight: string;
  
  // Navigation colors
  navBgStart: string;
  navBgEnd: string;
  navBorder: string;
  navAccent: string;
  
  // Status colors
  success: string;
  successLight: string;
  successHover: string;
  
  danger: string;
  dangerLight: string;
  dangerHover: string;
  
  warning: string;
  warningLight: string;
  warningHover: string;
  
  info: string;
  infoLight: string;
  infoHover: string;
  
  // Borders
  border: string;
  borderLight: string;
  borderAccent: string;
  
  // Glassmorphism
  glassBg: string;
  glassBorder: string;
}

export const COLOR_THEMES: Record<EffectiveThemeName, ThemeColors> = {
  light: {
    // Backgrounds
    background: '#fafbfc',
    backgroundSecondary: '#ffffff',
    backgroundTertiary: '#f5f7fa',
    backgroundHover: '#f0f2f5',
    backgroundAccent: '#f8fafc',
    
    // Text
    text: '#1a202c',
    textSecondary: '#4a5568',
    textMuted: '#718096',
    textLight: '#a0aec0',
    
    // Primary (Gris slate premium)
    primary: '#64748b',
    primaryHover: '#475569',
    primaryLight: '#f1f5f9',
    primaryDark: '#334155',
    
    // Accent (Or financier)
    accent: '#f59e0b',
    accentHover: '#d97706',
    accentLight: '#fef3c7',
    
    // Secondary
    secondary: '#6b7280',
    secondaryHover: '#4b5563',
    secondaryLight: '#f9fafb',
    
    // Navigation
    navBgStart: '#1e293b',
    navBgEnd: '#0f172a',
    navBorder: 'rgba(148, 163, 184, 0.1)',
    navAccent: '#6b7280',
    
    // Status colors
    success: '#059669',
    successLight: '#d1fae5',
    successHover: '#047857',
    
    danger: '#dc2626',
    dangerLight: '#fee2e2',
    dangerHover: '#b91c1c',
    
    warning: '#d97706',
    warningLight: '#fed7aa',
    warningHover: '#b45309',
    
    info: '#0284c7',
    infoLight: '#bae6fd',
    infoHover: '#0369a1',
    
    // Borders
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    borderAccent: '#cbd5e1',
    
    // Glassmorphism
    glassBg: 'rgba(255, 255, 255, 0.25)',
    glassBorder: 'rgba(255, 255, 255, 0.18)',
  },
  
  dark: {
    // Backgrounds
    background: '#0f172a',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#334155',
    backgroundHover: '#475569',
    backgroundAccent: '#1e293b',
    
    // Text
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    textLight: '#64748b',
    
    // Primary
    primary: '#6b7280',
    primaryHover: '#4b5563',
    primaryLight: 'rgba(107, 114, 128, 0.1)',
    primaryDark: '#374151',
    
    // Accent
    accent: '#fbbf24',
    accentHover: '#f59e0b',
    accentLight: 'rgba(251, 191, 36, 0.1)',
    
    // Secondary
    secondary: '#71717a',
    secondaryHover: '#52525b',
    secondaryLight: 'rgba(113, 113, 122, 0.1)',
    
    // Navigation
    navBgStart: '#020617',
    navBgEnd: '#0c1220',
    navBorder: 'rgba(148, 163, 184, 0.1)',
    navAccent: '#71717a',
    
    // Status colors
    success: '#10b981',
    successLight: 'rgba(16, 185, 129, 0.1)',
    successHover: '#059669',
    
    danger: '#f87171',
    dangerLight: 'rgba(248, 113, 113, 0.1)',
    dangerHover: '#ef4444',
    
    warning: '#fbbf24',
    warningLight: 'rgba(251, 191, 36, 0.1)',
    warningHover: '#f59e0b',
    
    info: '#38bdf8',
    infoLight: 'rgba(56, 189, 248, 0.1)',
    infoHover: '#0ea5e9',
    
    // Borders
    border: '#334155',
    borderLight: '#1e293b',
    borderAccent: '#475569',
    
    // Glassmorphism
    glassBg: 'rgba(30, 41, 59, 0.4)',
    glassBorder: 'rgba(148, 163, 184, 0.1)',
  },
} as const;

// Shadow system - correspond aux variables CSS
export interface ThemeShadows {
  sm: string;
  default: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
  glass: string;
}

export const SHADOW_THEMES: Record<EffectiveThemeName, ThemeShadows> = {
  light: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    xxl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
  },
  dark: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    default: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
    xxl: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
    glass: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
  },
} as const;

// Utilitaires pour générer les variables CSS
export const getCSSVariables = (theme: EffectiveThemeName) => {
  const colors = COLOR_THEMES[theme];
  const shadows = SHADOW_THEMES[theme];
  
  const cssVars: Record<string, string> = {};
  
  // Couleurs - conversion camelCase vers kebab-case
  Object.entries(colors).forEach(([key, value]) => {
    const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
    cssVars[`--${cssKey}`] = value;
  });
  
  // Ombres
  Object.entries(shadows).forEach(([key, value]) => {
    const cssKey = key === 'default' ? 'shadow' : `shadow-${key}`;
    cssVars[`--${cssKey}`] = value;
  });
  
  return cssVars;
};

// Hook pour appliquer le thème (React)
export const useTheme = () => {
  const getEffectiveTheme = (themeName: ThemeName): EffectiveThemeName => {
    if (themeName === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themeName;
  };
  
  const applyTheme = (themeName: ThemeName) => {
    const effectiveTheme = getEffectiveTheme(themeName);
    const cssVars = getCSSVariables(effectiveTheme);
    
    // Applique les variables CSS sur :root
    Object.entries(cssVars).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
    
    // Gère la classe .dark
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  
  return {
    themes: COLOR_THEMES,
    shadows: SHADOW_THEMES,
    applyTheme,
    getEffectiveTheme,
    getCSSVariables,
  };
};

// Types pour les composants
export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'success' | 'danger' | 'warning' | 'ghost';
export type CardVariant = 'default' | 'glass' | 'stat';
export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info';

// Interface pour les props de thème
export interface ThemeProps {
  theme?: EffectiveThemeName;
  className?: string;
}

// Fonction utilitaire pour récupérer une couleur spécifique
export const getThemeColor = (theme: EffectiveThemeName, colorKey: keyof ThemeColors): string => {
  return COLOR_THEMES[theme][colorKey];
};

// Fonction utilitaire pour récupérer une ombre spécifique
export const getThemeShadow = (theme: EffectiveThemeName, shadowKey: keyof ThemeShadows): string => {
  return SHADOW_THEMES[theme][shadowKey];
};
