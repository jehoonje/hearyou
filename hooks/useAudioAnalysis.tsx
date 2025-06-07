// useAudioAnalysis.ts - 키워드 표시 로직 개선

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
  useEffect(() => {
    isAnalysisActiveRef.current = isAnalysisActive;
  }, [isAnalysisActive]);

  const toggleListening = useCallback(() => {
    console.log('[useAudioAnalysis] toggleListening 호출');
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
      // 키워드 표시 시간을 5초로 조정
      keywordTimeoutRef.current = setTimeout(() => {
        console.log('[useAudioAnalysis] 키워드 표시 타임아웃');
        setNewKeywords([]);
        keywordTimeoutRef.current = null;
      }, 5000); // 5초
    };

    const startAnalysis = async (userId: string) => {
      try {
        if (listening || cleanupRef.current) {
          console.log('[useAudioAnalysis] 이미 분석 중');
          return;
        }
        
        console.log('[useAudioAnalysis] 분석 시작');
        setError(null);
        setListening(true);
        setNewKeywords([]); // 시작할 때 키워드 초기화

        cleanupRef.current = await startAudioAnalysis(
          userId,
          (vol) => { 
            setVolume(vol); 
          },
          (newTranscript) => {
            if (isAnalysisActiveRef.current) {
              setTranscript(newTranscript);
            }
          },
          (keywords) => {
            if (isAnalysisActiveRef.current && keywords && keywords.length > 0) {
              console.log('[useAudioAnalysis] 새 키워드 수신:', keywords);
              
              // 새로 확정된 키워드만 표시 (누적하지 않음)
              setNewKeywords(keywords);
              startKeywordTimeout();
            }
          },
          onKeywordSaved
        );

      } catch (err) {
        console.error('[useAudioAnalysis] 분석 시작 오류:', err);
        setError(err instanceof Error ? err.message : '오디오 분석 시작 중 오류');
        setListening(false);
        setIsAnalysisActive(false);
        cleanupRef.current = null;
        clearKeywordTimeout();
      }
    };

    const stopAnalysis = () => {
      console.log('[useAudioAnalysis] 분석 중지');
      clearKeywordTimeout();

      if (cleanupRef.current) {
        try {
          cleanupRef.current();
        } catch (cleanupError) {
          console.error('[useAudioAnalysis] cleanup 오류:', cleanupError);
        } finally {
          cleanupRef.current = null;
          if (listening) {
            setListening(false);
            setVolume(0);
            setTranscript('');
            setNewKeywords([]);
          }
        }
      } else {
        if (listening) {
          setListening(false);
          setVolume(0);
          setTranscript('');
          setNewKeywords([]);
        }
      }
    };

    // 분석 시작/중지 로직
    if (isAnalysisActive) {
      if (user?.id) {
        if (!listening && !cleanupRef.current) {
          console.log('[useAudioAnalysis] 사용자 있음, 분석 시작');
          startAnalysis(user.id);
        }
      } else {
        console.log('[useAudioAnalysis] 사용자 없음');
        if (listening || cleanupRef.current) {
          stopAnalysis();
        }
      }
    } else {
      if (listening || cleanupRef.current) {
        stopAnalysis();
      }
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      console.log('[useAudioAnalysis] 컴포넌트 언마운트');
      stopAnalysis();
    };
  }, [isAnalysisActive, user, onKeywordSaved]);

  // 디버깅용 상태 로깅
  useEffect(() => {
    console.log('[useAudioAnalysis] 상태 변경:', {
      listening,
      isAnalysisActive,
      newKeywords,
      transcript: transcript.substring(0, 50) + '...'
    });
  }, [listening, isAnalysisActive, newKeywords, transcript]);

  return {
    volume,
    transcript,
    listening,
    newKeywords,
    error,
    toggleListening,
    isAnalysisActive
  };
};