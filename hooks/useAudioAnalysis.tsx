// src/hooks/useAudioAnalysis.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { startAudioAnalysis } from '../utils/audioAnalyzer'; // 경로 확인 필요
import { Keyword } from '../types'; // 경로 확인 필요
// import { analyzeKeywords } from '../utils/keywordAnalyzer'; // analyzeKeywords는 audioAnalyzer 내부에서 호출될 것으로 가정

// (Window 타입 확장 - 필요한 경우)
// declare global { ... }

export const useAudioAnalysis = (
  user: User | null,
  onKeywordSaved?: (keyword: Keyword) => void
) => {
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false); // 실제 분석 진행 상태
  const [newKeywords, setNewKeywords] = useState<string[]>([]); // UI에 표시될 키워드
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisActive, setIsAnalysisActive] = useState(false); // 사용자의 분석 시작/중지 요청 상태

  const cleanupRef = useRef<(() => void) | null>(null);
  const keywordTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 키워드 표시 타임아웃 ref

  const isAnalysisActiveRef = useRef(isAnalysisActive);
  useEffect(() => {
    isAnalysisActiveRef.current = isAnalysisActive;
  }, [isAnalysisActive]);

  const toggleListening = useCallback(() => {
    setIsAnalysisActive(prev => !prev);
  }, []);

  useEffect(() => {
    // --- Timeout 관리 함수 ---
    const clearKeywordTimeout = () => {
        if (keywordTimeoutRef.current) {
            clearTimeout(keywordTimeoutRef.current);
            keywordTimeoutRef.current = null;
        }
    };

    const startKeywordTimeout = () => {
        clearKeywordTimeout(); // 기존 것 취소
        keywordTimeoutRef.current = setTimeout(() => {
            setNewKeywords([]); // 시간 지나면 빈 배열로 설정
            keywordTimeoutRef.current = null;
        }, 4000); // 4초 후 사라짐 (시간 조절 가능)
    };
    // --- Timeout 관리 함수 끝 ---


    const startAnalysis = async (userId: string) => {
      try {
        if (listening || cleanupRef.current) {
          return;
        }
        setError(null);
        setListening(true); // 실제 분석 시작 시점

        cleanupRef.current = await startAudioAnalysis(
          userId,
          (vol) => { setVolume(vol); }, // 볼륨 콜백
          (newTranscript) => { // 트랜스크립트 콜백
            if (isAnalysisActiveRef.current) setTranscript(newTranscript);
          },
          (keywords) => { // 키워드 콜백 <--- 여기가 중요!
            if (isAnalysisActiveRef.current) {
                // 새로운 키워드가 감지되었는지 확인
                if (keywords && keywords.length > 0) {
                    setNewKeywords(keywords); // UI 상태 업데이트
                    startKeywordTimeout();   // 타임아웃 시작 (또는 재시작)
                }
                // else {
                    // keywords가 빈 배열이면 타임아웃을 건드리지 않음
                    // 이전 키워드가 표시 중이었다면 설정된 시간만큼 유지됨
                // }
            }
          },
          onKeywordSaved // 키워드 저장 콜백 (옵션)
        );

      } catch (err) {
        setError(err instanceof Error ? err.message : '오디오 분석 시작 중 오류');
        setListening(false);
        setIsAnalysisActive(false); // 오류 발생 시 활성 상태도 해제
        cleanupRef.current = null;
        clearKeywordTimeout(); // 오류 시 타임아웃도 정리
      }
    };

    const stopAnalysis = () => {
      clearKeywordTimeout(); // 분석 중지 시 키워드 표시 타임아웃도 즉시 정리

      if (cleanupRef.current) {
        try {
          cleanupRef.current();
        } catch (cleanupError) {
        } finally {
          cleanupRef.current = null;
          if (listening) { // listening 상태일 때만 상태 초기화
             setListening(false);
             setVolume(0);
             setTranscript('');
             setNewKeywords([]); // 중지 시 키워드 즉시 초기화
          }
        }
      } else {
         // cleanupRef가 없더라도 listening 상태면 초기화 필요
         if (listening) {
            setListening(false);
            setVolume(0);
            setTranscript('');
            setNewKeywords([]); // 중지 시 키워드 즉시 초기화
         }
      }
    };

    // --- 로직 실행 (isAnalysisActive 상태에 따라) ---
    if (isAnalysisActive) {
      // 분석 시작 요청
      if (user?.id) {
        if (!listening && !cleanupRef.current) {
          startAnalysis(user.id);
        } else {
        }
      } else {
        // 사용자는 없는데 시작 요청 상태인 경우 (예: 로그인 직후 바로 토글 눌렀다가 로그아웃)
        if (listening || cleanupRef.current) { // 혹시 이전 사용자 분석이 남아있었다면 중지
            stopAnalysis();
        }
        // 사용자 없으면 isAnalysisActive를 false로 되돌리는 것이 좋을 수 있음
        // setIsAnalysisActive(false); // 필요시 추가
      }
    } else {
      // 분석 중지 요청
      if (listening || cleanupRef.current) { // 리스닝 중이거나 정리 함수가 남아있다면 중지
        stopAnalysis();
      } else {
      }
    }

    // --- 컴포넌트 언마운트 시 최종 정리 ---
    return () => {
      stopAnalysis(); // stopAnalysis가 내부적으로 타임아웃 정리 포함
    };
  // <<<--- 의존성 배열: isAnalysisActive와 user 객체 모두 필요 --->>>
  }, [isAnalysisActive, user]); // user 의존성 복원! (로그인/로그아웃 시 재실행 필요)
  // onKeywordSaved도 의존성에 추가하는 것이 좋지만, 함수가 안정적(useCallback 등)이라는 가정 하에 일단 제외

  return {
    volume,
    transcript,
    listening, // 실제 분석 중인지 여부
    newKeywords, // UI에 표시될 키워드 (시간 지나면 사라짐)
    error,
    toggleListening, // 분석 시작/중지 요청 토글
    // isAnalysisActive // 필요하다면 이 상태도 반환하여 UI에서 로딩 인디케이터 등에 활용 가능
  };
};