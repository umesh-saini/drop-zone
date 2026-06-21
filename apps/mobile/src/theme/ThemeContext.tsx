import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'dark' | 'light';

export const darkColors = {
  background: '#09090b',
  foreground: '#fafafa',
  card: '#0a0a0c',
  cardElevated: '#141418',
  primary: '#6366f1',
  primaryForeground: '#ffffff',
  secondary: '#1e1e2e',
  secondaryForeground: '#fafafa',
  muted: '#1c1c28',
  mutedForeground: '#a1a1aa',
  destructive: '#ef4444',
  border: '#27272a',
  success: '#22c55e',
  warning: '#f59e0b',
};

export const lightColors = {
  background: '#fafafa',
  foreground: '#09090b',
  card: '#ffffff',
  cardElevated: '#f4f4f5',
  primary: '#6366f1',
  primaryForeground: '#ffffff',
  secondary: '#f4f4f5',
  secondaryForeground: '#18181b',
  muted: '#f4f4f5',
  mutedForeground: '#71717a',
  destructive: '#ef4444',
  border: '#e4e4e7',
  success: '#22c55e',
  warning: '#f59e0b',
};

interface ThemeState {
  theme: ThemeMode;
  colors: typeof darkColors;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
}

const THEME_KEY = 'dropzone_theme_mode';

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  colors: darkColors,
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next, colors: next === 'dark' ? darkColors : lightColors });
    SecureStore.setItemAsync(THEME_KEY, next).catch(() => {});
  },
  loadTheme: async () => {
    try {
      const saved = await SecureStore.getItemAsync(THEME_KEY);
      if (saved === 'light') {
        set({ theme: 'light', colors: lightColors });
      }
    } catch {}
  },
}));

// Re-export individual selectors (stable references, no infinite loops)
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  return { theme, toggleTheme };
}
