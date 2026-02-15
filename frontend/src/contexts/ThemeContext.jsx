import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'system',
  actualTheme: 'light',
  setTheme: () => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState('system');
  const [actualTheme, setActualTheme] = useState('light');

  // Get system preference
  const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // Load saved theme preference from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme-preference');
      if (savedTheme && ['light', 'dark', 'system']?.includes(savedTheme)) {
        setThemeState(savedTheme);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  }, []);

  // Apply theme to document and update actualTheme
  useEffect(() => {
    const root = window.document?.documentElement;
    const effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
    
    setActualTheme(effectiveTheme);
    
    // Remove both classes first
    root.classList?.remove('light', 'dark');
    
    // Add the effective theme class
    root.classList?.add(effectiveTheme);
  }, [theme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const newTheme = e?.matches ? 'dark' : 'light';
      setActualTheme(newTheme);
      const root = window.document?.documentElement;
      root.classList?.remove('light', 'dark');
      root.classList?.add(newTheme);
    };

    // Modern browsers
    if (mediaQuery?.addEventListener) {
      mediaQuery?.addEventListener('change', handleChange);
      return () => mediaQuery?.removeEventListener('change', handleChange);
    } else if (mediaQuery?.addListener) {
      // Legacy browsers
      mediaQuery?.addListener(handleChange);
      return () => mediaQuery?.removeListener(handleChange);
    }
  }, [theme]);

  // Set theme and persist to localStorage
  const setTheme = (newTheme) => {
    if (!['light', 'dark', 'system']?.includes(newTheme)) return;
    
    setThemeState(newTheme);
    
    try {
      localStorage.setItem('theme-preference', newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const value = {
    theme,
    actualTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;