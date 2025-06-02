// src/hooks/useAudioAnalysis.ts

declare global {
  interface Window {
    resetSpeechState?: () => void;
    clearTranscript?: () => void;
    isNativeApp?: boolean;
  }
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { startAudioAnalysis } from '../utils/audioAnalyzer';
import { Keyword } from '../types';

export const useAudioAnalysis = (
  user: User | null,
  onKeywordSaved?: (keyword: Keyword) => void
) => {
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisActive, setIsAnalysisActive] = useState(false);

  const cleanupRef = useRef<(() => void) | null>(null);
  const keywordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAnalysisActiveRef = useRef(isAnalysisActive);

  // 🔥 네이티브 앱 환경 감지
  const isNativeApp = useRef(typeof window !== 'undefined' && window.isNativeApp === true);

  useEffect(() => {
    isAnalysisActiveRef.current = isAnalysisActive;
  }, [isAnalysisActive]);

  // 🔥 강제 상태 초기화 함수 추가
  const forceResetState = useCallback(() => {
    console.log('[AudioAnalysis] 강제 상태 초기화 실행');
    setTranscript('');
    setNewKeywords([]);
    setVolume(0);
    if (keywordTimeoutRef.current) {
      clearTimeout(keywordTimeoutRef.current);
      keywordTimeoutRef.current = null;
    }
  }, []);

  // 🔥 네이티브 앱용 상태 초기화 함수를 window에 등록
  useEffect(() => {
    if (isNativeApp.current && typeof window !== 'undefined') {
      // 네이티브에서 호출할 수 있는 초기화 함수 등록
      window.resetSpeechState = forceResetState;
      window.clearTranscript = () => {
        console.log('[AudioAnalysis] clearTranscript 호출됨');
        setTranscript('');
        setNewKeywords([]);
      };

      return () => {
        // 정리
        if (window.resetSpeechState) delete window.resetSpeechState;
        if (window.clearTranscript) delete window.clearTranscript;
      };
    }
  }, [forceResetState]);

  const toggleListening = useCallback(() => {
    setIsAnalysisActive(prev => !prev);
  }, []);

  useEffect(() => {
    const clearKeywordTimeout = () => {
      if (keywordTimeoutRef.current) {
        clearTimeout(keywordTimeoutRef.current);
        keywordTimeoutRef.current = null;
      }
    };

    const startKeywordTimeout = () => {
      clearKeywordTimeout();
      keywordTimeoutRef.current = setTimeout(() => {
        setNewKeywords([]);
        keywordTimeoutRef.current = null;
      }, 4000);
    };

    const startAnalysis = async (userId: string) => {
      try {
        if (listening || cleanupRef.current) {
          return;
        }
        setError(null);
        
        // 🔥 분석 시작 시 상태 초기화
        forceResetState();
        
        setListening(true);

        cleanupRef.current = await startAudioAnalysis(
          userId,
          (vol) => { 
            if (isAnalysisActiveRef.current) setVolume(vol); 
          },
          (newTranscript) => {
            if (isAnalysisActiveRef.current) {
              console.log('[AudioAnalysis] 트랜스크립트 업데이트:', newTranscript);
              setTranscript(newTranscript);
            }
          },
          (keywords) => {
            if (isAnalysisActiveRef.current) {
              console.log('[AudioAnalysis] 키워드 업데이트:', keywords);
              
              // 🔥 네이티브 앱에서 빈 키워드 배열이 오면 명시적 초기화
              if (isNativeApp.current && (!keywords || keywords.length === 0)) {
                console.log('[AudioAnalysis] 네이티브 앱: 빈 키워드로 인한 초기화');
                setNewKeywords([]);
                clearKeywordTimeout();
                return;
              }
              
              if (keywords && keywords.length > 0) {
                // 🔥 이전 키워드와 다른 경우에만 업데이트
                setNewKeywords(prevKeywords => {
                  const isDifferent = JSON.stringify(prevKeywords) !== JSON.stringify(keywords);
                  if (isDifferent) {
                    console.log('[AudioAnalysis] 새로운 키워드 감지:', keywords);
                    return keywords;
                  }
                  return prevKeywords;
                });
                startKeywordTimeout();
              }
            }
          },
          onKeywordSaved
        );

      } catch (err) {
        setError(err instanceof Error ? err.message : '오디오 분석 시작 중 오류');
        setListening(false);
        setIsAnalysisActive(false);
        cleanupRef.current = null;
        clearKeywordTimeout();
        // 🔥 에러 시에도 상태 초기화
        forceResetState();
      }
    };

    const stopAnalysis = () => {
      console.log('[AudioAnalysis] 분석 중지');
      clearKeywordTimeout();

      if (cleanupRef.current) {
        try {
          cleanupRef.current();
        } catch (cleanupError) {
          console.error('[AudioAnalysis] cleanup 에러:', cleanupError);
        } finally {
          cleanupRef.current = null;
        }
      }
      
      if (listening) {
        setListening(false);
        // 🔥 중지 시 즉시 상태 초기화
        forceResetState();
      }
    };

    // 로직 실행
    if (isAnalysisActive) {
      if (user?.id) {
        if (!listening && !cleanupRef.current) {
          console.log('[AudioAnalysis] 분석 시작 요청');
          startAnalysis(user.id);
        }
      } else {
        if (listening || cleanupRef.current) {
          stopAnalysis();
        }
      }
    } else {
      if (listening || cleanupRef.current) {
        stopAnalysis();
      }
    }

    return () => {
      stopAnalysis();
    };
  }, [isAnalysisActive, user, forceResetState]);

  // 🔥 네이티브 앱 환경에서 추가 초기화 이벤트 리스너
  useEffect(() => {
    if (isNativeApp.current && typeof window !== 'undefined') {
      const handleNativeInitialization = () => {
        console.log('[AudioAnalysis] 네이티브 초기화 이벤트 수신');
        forceResetState();
      };

      // 커스텀 이벤트 리스너 등록
      window.addEventListener('nativeSpeechInitialization', handleNativeInitialization);
      
      return () => {
        window.removeEventListener('nativeSpeechInitialization', handleNativeInitialization);
      };
    }
  }, [forceResetState]);

  return {
    volume,
    transcript,
    listening,
    newKeywords,
    error,
    toggleListening,
    // 🔥 디버깅용 함수도 노출
    resetState: forceResetState,
  };
};