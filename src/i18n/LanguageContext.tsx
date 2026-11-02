import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SupportedLocale, LanguageDefinition, SUPPORTED_LANGUAGES } from './types';
import { translate } from './locales';
import { useApp } from '../context/AppContext';

export const STORAGE_KEY = 'property_studio_preferred_language';

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (newLocale: SupportedLocale) => Promise<void>;
  currentLanguage: LanguageDefinition;
  supportedLanguages: LanguageDefinition[];
  isRtl: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function getInitialLocale(): SupportedLocale {
  // 1. Check localStorage first (guest or previous session)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
      if (saved && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  // 2. Default is English
  return 'en';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoggedIn } = useApp();
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);

  // Sync authenticated user's preferred language when logging in or when profile loads
  useEffect(() => {
    if (isLoggedIn && currentUser?.preferredLanguage) {
      const userLang = currentUser.preferredLanguage as SupportedLocale;
      if (SUPPORTED_LANGUAGES.some(l => l.code === userLang) && userLang !== locale) {
        setLocaleState(userLang);
        try {
          localStorage.setItem(STORAGE_KEY, userLang);
        } catch {
          // ignore
        }
      }
    }
  }, [isLoggedIn, currentUser?.id, currentUser?.preferredLanguage]);

  // Handle document direction (RTL for Urdu) and lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isRtl = locale === 'ur';
      document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', locale);
      if (isRtl) {
        document.body.classList.add('rtl-layout');
      } else {
        document.body.classList.remove('rtl-layout');
      }
    }
  }, [locale]);

  // Set language function (updates state, localStorage, and if logged in, syncs to backend)
  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    if (!SUPPORTED_LANGUAGES.some(l => l.code === newLocale)) return;

    setLocaleState(newLocale);

    // Save to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }

    // Synchronize with backend profile if authenticated
    if (isLoggedIn && currentUser?.id && currentUser.id !== 'guest') {
      try {
        await fetch('/api/me/language', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: newLocale })
        });
      } catch (err) {
        // Non-blocking sync failure
        console.error('Failed to sync language preference to profile', err);
      }
    }
  }, [isLoggedIn, currentUser?.id]);

  const currentLanguage = useMemo(
    () => SUPPORTED_LANGUAGES.find(l => l.code === locale) || SUPPORTED_LANGUAGES[0],
    [locale]
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(locale, key, params);
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      currentLanguage,
      supportedLanguages: SUPPORTED_LANGUAGES,
      isRtl: locale === 'ur',
      t
    }),
    [locale, setLocale, currentLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
