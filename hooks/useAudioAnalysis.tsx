import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { startAudioAnalysis } from '../utils/audioAnalyzer';
import { Keyword } from '../types';

export const useAudioAnalysis = (
  isAuthenticated: boolean,
  isLoading: boolean,
  currentUser: User | null,
  onKeywordSaved?: (keyword: Keyword) => void // 저장된 키워드 콜백 추가
) => {
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const startAnalysis = async () => {
      try {
        if (isAuthenticated && !isLoading && currentUser?.id) {
          console.log(`오디오 분석 시작 (사용자 ID: ${currentUser.id})`);
          setListening(true);
          setError(null);
          
          // 사용자 ID 및 키워드 저장 콜백 전달
          cleanup = await startAudioAnalysis(
            currentUser.id,
            setVolume,
            setTranscript,
            setNewKeywords,
            onKeywordSaved // 키워드 저장 콜백 전달
          );
        }
      } catch (err) {
        setListening(false);
        setError(err instanceof Error ? err.message : '오디오 분석 시작 중 오류가 발생했습니다.');
        console.error('오디오 분석 시작 오류:', err);
      }
    };

    // 인증된 사용자이고 로딩이 끝났을 때만 분석 시작
    if (isAuthenticated && !isLoading && currentUser?.id) {
      startAnalysis();
    } else {
      setListening(false);
      setVolume(0);
    }

    return () => {
      if (cleanup) {
        console.log('오디오 분석 정리');
        cleanup();
        setListening(false);
      }
    };
  }, [isAuthenticated, isLoading, currentUser, onKeywordSaved]);

  return {
    volume,
    transcript,
    listening,
    newKeywords,
    error
  };
};
