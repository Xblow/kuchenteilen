import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'theme_preference';

export const LIGHT = {
  bg: '#F8F9FA',
  card: '#FFFFFF',
  primary: '#5B6EF5',
  primaryLight: '#EEF0FE',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  success: '#22C55E',
  text: '#1A1A2E',
  sub: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

export const DARK = {
  bg: '#0F1117',
  card: '#1A1D27',
  primary: '#5B6EF5',
  primaryLight: '#1E2240',
  danger: '#EF4444',
  dangerLight: '#3D1515',
  success: '#22C55E',
  text: '#F0F0F8',
  sub: '#9BA3B4',
  border: '#2A2D3E',
  white: '#FFFFFF',
};

export type Colors = typeof LIGHT;

interface ThemeContextValue {
  isDark: boolean;
  colors: Colors;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: LIGHT,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'dark') setIsDark(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, colors: isDark ? DARK : LIGHT, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
