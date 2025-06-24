"use client";
// 4. contexts/LanguageContext.tsx - 언어 컨텍스트
import React, { createContext, useContext, ReactNode } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Translations } from '../../types/i18n';

interface LanguageContextType {
  t: Translations;
  language: string;
  changeLanguage: (lang: string) => void;
}


const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t, language, changeLanguage } = useTranslation();

  return (
    <LanguageContext.Provider value={{ t, language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}