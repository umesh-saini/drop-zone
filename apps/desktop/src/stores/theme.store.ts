import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: (localStorage.getItem('dropzone_theme') as Theme) || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('dropzone_theme', theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));

/** Apply theme CSS variables to the document */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.style.setProperty('--color-background', '#fafafa');
    root.style.setProperty('--color-foreground', '#09090b');
    root.style.setProperty('--color-card', '#ffffff');
    root.style.setProperty('--color-card-foreground', '#09090b');
    root.style.setProperty('--color-popover', '#ffffff');
    root.style.setProperty('--color-popover-foreground', '#09090b');
    root.style.setProperty('--color-secondary', '#f4f4f5');
    root.style.setProperty('--color-secondary-foreground', '#18181b');
    root.style.setProperty('--color-muted', '#f4f4f5');
    root.style.setProperty('--color-muted-foreground', '#71717a');
    root.style.setProperty('--color-border', '#e4e4e7');
    root.style.setProperty('--color-input', '#e4e4e7');
  } else {
    root.style.setProperty('--color-background', '#09090b');
    root.style.setProperty('--color-foreground', '#fafafa');
    root.style.setProperty('--color-card', '#0a0a0c');
    root.style.setProperty('--color-card-foreground', '#fafafa');
    root.style.setProperty('--color-popover', '#09090b');
    root.style.setProperty('--color-popover-foreground', '#fafafa');
    root.style.setProperty('--color-secondary', '#1e1e2e');
    root.style.setProperty('--color-secondary-foreground', '#fafafa');
    root.style.setProperty('--color-muted', '#1c1c28');
    root.style.setProperty('--color-muted-foreground', '#a1a1aa');
    root.style.setProperty('--color-border', '#27272a');
    root.style.setProperty('--color-input', '#27272a');
  }
}

// Apply on load
applyTheme((localStorage.getItem('dropzone_theme') as Theme) || 'dark');
