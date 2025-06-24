// 3. hooks/useTranslation.ts - 번역 훅
import { useState, useEffect } from 'react';
import { translations, detectLanguage } from '../lib/i18n';
import { Translations } from '../types/i18n';

export function useTranslation() {
  const [language, setLanguage] = useState<string>('en');
  const [t, setT] = useState<Translations>(translations.en);

  useEffect(() => {
    const detectedLang = detectLanguage();
    setLanguage(detectedLang);
    setT(translations[detectedLang] || translations.en);
  }, []);

  // 언어 변경 함수 (필요시 사용)
  const changeLanguage = (lang: string) => {
    if (translations[lang]) {
      setLanguage(lang);
      setT(translations[lang]);
    }
  };

  return { t, language, changeLanguage };
}