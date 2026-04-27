import React, { createContext, useContext, useState, useCallback } from 'react';
import { LANGUAGES, THEMES } from '../config/languages';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState('dark');

  const t = useCallback((key) => {
    return LANGUAGES[language]?.translations?.[key] || key;
  }, [language]);

  const getTheme = useCallback(() => {
    return THEMES[theme] || THEMES.dark;
  }, [theme]);

  const changeLanguage = useCallback((lang) => {
    if (LANGUAGES[lang]) {
      setLanguage(lang);
      localStorage.setItem('preferred_language', lang);
    }
  }, []);

  const changeTheme = useCallback((themeName) => {
    if (THEMES[themeName]) {
      setTheme(themeName);
      localStorage.setItem('preferred_theme', themeName);
    }
  }, []);

  const value = {
    language,
    theme,
    t,
    getTheme,
    changeLanguage,
    changeTheme,
    availableLanguages: Object.keys(LANGUAGES),
    availableThemes: Object.keys(THEMES),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
