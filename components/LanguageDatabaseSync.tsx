// components/LanguageDatabaseSync.tsx - 타입 안전성 강화 버전
'use client';
import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../app/contexts/AuthContext';
import { detectLanguage } from '../lib/i18n';

// 언어 변경 이벤트 타입 정의
interface LanguageChangeEventDetail {
  language: string;
}

interface LanguageChangeEvent extends CustomEvent<LanguageChangeEventDetail> {
  type: 'languagechange';
}

// Window 인터페이스 확장 (네이티브 언어 정보)
declare global {
  interface Window {
    __EXPO_LANGUAGE__?: string;
  }
}

export function LanguageDatabaseSync() {
  const { user } = useAuth();
  const lastSavedLanguage = useRef<string | null>(null);
  const syncInProgress = useRef(false);

  // DB에 언어 저장 함수
  const saveLanguageToDatabase = async (language: string, userId: string): Promise<void> => {
    if (syncInProgress.current) {
      console.log('[LanguageSync] 이미 동기화 중, 건너뜀');
      return;
    }

    syncInProgress.current = true;
    
    try {
      console.log(`[LanguageSync] DB 저장 시도: ${language} (user: ${userId})`);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          language: language,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('[LanguageSync] DB 저장 실패:', error);
      } else {
        console.log(`[LanguageSync] DB 저장 성공: ${language}`);
        lastSavedLanguage.current = language;
      }
    } catch (error) {
      console.error('[LanguageSync] DB 저장 중 오류:', error);
    } finally {
      syncInProgress.current = false;
    }
  };

  // 현재 언어 감지 및 동기화
  const syncCurrentLanguage = async (): Promise<void> => {
    if (!user?.id) return;

    const currentLanguage = detectLanguage();
    
    if (currentLanguage !== lastSavedLanguage.current) {
      console.log(`[LanguageSync] 언어 변경 감지: ${lastSavedLanguage.current} → ${currentLanguage}`);
      await saveLanguageToDatabase(currentLanguage, user.id);
    }
  };

  // 초기 언어 동기화 (로그인 시)
  useEffect(() => {
    if (user?.id) {
      console.log('[LanguageSync] 사용자 로그인 감지, 언어 동기화 시작');
      
      const timer = setTimeout(() => {
        syncCurrentLanguage();
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      lastSavedLanguage.current = null;
    }
  }, [user?.id]);

  // 네이티브 언어 변경 이벤트 감지 (타입 안전)
  useEffect(() => {
    if (!user?.id) return;

    const handleLanguageChange = async (event: Event): Promise<void> => {
      // CustomEvent 타입 가드 및 detail 검증
      if (
        event instanceof CustomEvent && 
        event.type === 'languagechange' &&
        event.detail &&
        typeof event.detail === 'object' &&
        'language' in event.detail &&
        typeof event.detail.language === 'string'
      ) {
        const newLanguage = event.detail.language;
        console.log('[LanguageSync] 언어 변경 이벤트 수신:', newLanguage);
        
        if (newLanguage && newLanguage !== lastSavedLanguage.current) {
          await saveLanguageToDatabase(newLanguage, user.id);
        }
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('languagechange', handleLanguageChange);

    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, [user?.id]);

  // 주기적 언어 확인 (타입 안전)
  useEffect(() => {
    if (!user?.id) return;

    const intervalCheck = (): void => {
      try {
        const currentLanguage = detectLanguage();
        if (currentLanguage !== lastSavedLanguage.current) {
          console.log('[LanguageSync] 주기적 체크에서 언어 변경 감지');
          saveLanguageToDatabase(currentLanguage, user.id);
        }
      } catch (error) {
        console.error('[LanguageSync] 주기적 체크 중 오류:', error);
      }
    };

    const interval = setInterval(intervalCheck, 5000);

    return () => clearInterval(interval);
  }, [user?.id]);

  // 네이티브 언어 직접 확인 (폴백)
  useEffect(() => {
    if (!user?.id) return;

    const checkNativeLanguage = (): void => {
      try {
        const nativeLanguage = window.__EXPO_LANGUAGE__;
        if (
          nativeLanguage && 
          typeof nativeLanguage === 'string' &&
          nativeLanguage !== lastSavedLanguage.current
        ) {
          console.log('[LanguageSync] 네이티브 언어 직접 확인:', nativeLanguage);
          saveLanguageToDatabase(nativeLanguage, user.id);
        }
      } catch (error) {
        console.error('[LanguageSync] 네이티브 언어 확인 중 오류:', error);
      }
    };

    // 2초 후 한 번 더 확인 (이벤트를 놓쳤을 경우 대비)
    const timer = setTimeout(checkNativeLanguage, 2000);

    return () => clearTimeout(timer);
  }, [user?.id]);

  return null;
}

// 🎯 사용법 - App.tsx에서 간단히 추가
export default LanguageDatabaseSync;