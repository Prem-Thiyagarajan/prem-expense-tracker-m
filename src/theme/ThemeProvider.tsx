import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import {
  border,
  candy,
  candyText,
  categoryFallback,
  categoryStyle,
  darkColors,
  fontFamily,
  lightColors,
  motion,
  Palette,
  radius,
  semantic,
  Semantic,
  shadowOffset,
  spacing,
} from './tokens';

export type ColorMode = 'light' | 'dark';
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'pft.theme-preference';

/** The resolved token bundle handed to components via useTheme(). */
export type Theme = {
  mode: ColorMode;
  colors: Palette;
  candy: typeof candy;
  candyText: string;
  semantic: Semantic;
  categoryStyle: typeof categoryStyle;
  categoryFallback: typeof categoryFallback;
  font: typeof fontFamily;
  radius: typeof radius;
  border: typeof border;
  shadowOffset: typeof shadowOffset;
  spacing: typeof spacing;
  motion: typeof motion;
};

function buildTheme(mode: ColorMode): Theme {
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    candy,
    candyText,
    semantic: mode === 'dark' ? semantic.dark : semantic.light,
    categoryStyle,
    categoryFallback,
    font: fontFamily,
    radius,
    border,
    shadowOffset,
    spacing,
    motion,
  };
}

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  // Restore persisted preference on mount.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const mode: ColorMode =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const toggle = useCallback(() => {
    setPreference(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setPreference]);

  const theme = useMemo(() => buildTheme(mode), [mode]);

  const value = useMemo(
    () => ({ theme, preference, setPreference, toggle }),
    [theme, preference, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx.theme;
}

export function useThemeControls() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeControls must be used within <ThemeProvider>');
  return { preference: ctx.preference, setPreference: ctx.setPreference, toggle: ctx.toggle };
}
