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
    console.log(`%ctoggleListening 호출: 현재 isAnalysisActive=${isAnalysisActiveRef.current}, 요청 상태=${!isAnalysisActiveRef.current}`, 'color: purple; font-weight: bold;');
    setIsAnalysisActive(prev => !prev);
  }, []);

  useEffect(() => {
    console.log(
      `%c[useAudioAnalysis Effect] 실행됨 - isAnalysisActive: ${isAnalysisActive}, user: ${user?.id}`,
      'color: blue; font-weight: bold;'
    );

    // --- Timeout 관리 함수 ---
    const clearKeywordTimeout = () => {
        if (keywordTimeoutRef.current) {
            clearTimeout(keywordTimeoutRef.current);
            keywordTimeoutRef.current = null;
            // console.log("[Keyword Timeout] Cleared existing timeout."); // 상세 로그
        }
    };

    const startKeywordTimeout = () => {
        clearKeywordTimeout(); // 기존 것 취소
        keywordTimeoutRef.current = setTimeout(() => {
            console.log("[Keyword Timeout] Timeout finished. Clearing keywords."); // 로그 추가
            setNewKeywords([]); // 시간 지나면 빈 배열로 설정
            keywordTimeoutRef.current = null;
        }, 4000); // 4초 후 사라짐 (시간 조절 가능)
        // console.log("[Keyword Timeout] Started new timeout."); // 상세 로그
    };
    // --- Timeout 관리 함수 끝 ---


    const startAnalysis = async (userId: string) => {
      console.log(`%c[useAudioAnalysis Effect] ---> startAnalysis 호출 (User: ${userId})`, 'color: green;');
      try {
        if (listening || cleanupRef.current) {
          console.warn("[useAudioAnalysis Effect] ---> startAnalysis: 이미 리스닝 중 또는 정리 대기 중");
          return;
        }
        setError(null);
        setListening(true); // 실제 분석 시작 시점
        console.log(`%c[useAudioAnalysis Effect] ---> setListening(true) 호출됨`, 'color: green;');

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
                    console.log(`[Keyword Callback] Received keywords: ${keywords.join(', ')}. Starting timeout.`); // 로그 추가
                    setNewKeywords(keywords); // UI 상태 업데이트
                    startKeywordTimeout();   // 타임아웃 시작 (또는 재시작)
                }
                // else {
                    // keywords가 빈 배열이면 타임아웃을 건드리지 않음
                    // 이전 키워드가 표시 중이었다면 설정된 시간만큼 유지됨
                    // console.log("[Keyword Callback] Received empty keywords."); // 상세 로그
                // }
            }
          },
          onKeywordSaved // 키워드 저장 콜백 (옵션)
        );
        console.log(`%c[useAudioAnalysis Effect] ---> startAnalysis 완료, cleanupRef 할당됨: ${!!cleanupRef.current}`, 'color: green;');

      } catch (err) {
        console.error('[useAudioAnalysis Effect] ---> startAnalysis 오류:', err);
        setError(err instanceof Error ? err.message : '오디오 분석 시작 중 오류');
        setListening(false);
        setIsAnalysisActive(false); // 오류 발생 시 활성 상태도 해제
        cleanupRef.current = null;
        clearKeywordTimeout(); // 오류 시 타임아웃도 정리
        console.log(`%c[useAudioAnalysis Effect] ---> 오류로 setListening(false), setIsAnalysisActive(false) 호출됨`, 'color: red;');
      }
    };

    const stopAnalysis = () => {
      console.log(`%c[useAudioAnalysis Effect] ---> stopAnalysis 호출됨. cleanupRef 존재?: ${!!cleanupRef.current}`, 'color: red;');
      clearKeywordTimeout(); // 분석 중지 시 키워드 표시 타임아웃도 즉시 정리

      if (cleanupRef.current) {
        console.log(`%c[useAudioAnalysis Effect] ------> cleanupRef.current() 실행 시도`, 'color: red; font-style: italic;');
        try {
          cleanupRef.current();
          console.log(`%c[useAudioAnalysis Effect] ------> cleanupRef.current() 실행 완료`, 'color: red; font-style: italic;');
        } catch (cleanupError) {
          console.error("[useAudioAnalysis Effect] ------> cleanupRef.current() 실행 중 오류:", cleanupError);
        } finally {
          cleanupRef.current = null;
          if (listening) { // listening 상태일 때만 상태 초기화
             console.log(`%c[useAudioAnalysis Effect] ------> 정리 후 setListening(false) 및 상태 초기화 호출`, 'color: orange;');
             setListening(false);
             setVolume(0);
             setTranscript('');
             setNewKeywords([]); // 중지 시 키워드 즉시 초기화
          }
        }
      } else {
         console.log(`%c[useAudioAnalysis Effect] ------> 실행할 cleanupRef 없음`, 'color: orange;');
         // cleanupRef가 없더라도 listening 상태면 초기화 필요
         if (listening) {
            console.log(`%c[useAudioAnalysis Effect] ------> cleanupRef 없지만 setListening(false) 및 상태 초기화 호출`, 'color: orange;');
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
          console.log(`%c[useAudioAnalysis Effect] ---> 조건: 시작 요청 (isAnalysisActive=${isAnalysisActive}) -> startAnalysis 실행`, 'color: blue;');
          startAnalysis(user.id);
        } else {
          console.log(`%c[useAudioAnalysis Effect] ---> 시작 조건 맞지만 이미 리스닝 중(${listening}) 또는 정리 대기 중(${!!cleanupRef.current}). 시작 안 함.`, 'color: gray;');
        }
      } else {
        // 사용자는 없는데 시작 요청 상태인 경우 (예: 로그인 직후 바로 토글 눌렀다가 로그아웃)
        console.log(`%c[useAudioAnalysis Effect] ---> 시작 요청 상태지만 사용자 없음. 시작 안 함.`, 'color: orange;');
        if (listening || cleanupRef.current) { // 혹시 이전 사용자 분석이 남아있었다면 중지
            stopAnalysis();
        }
        // 사용자 없으면 isAnalysisActive를 false로 되돌리는 것이 좋을 수 있음
        // setIsAnalysisActive(false); // 필요시 추가
      }
    } else {
      // 분석 중지 요청
      console.log(`%c[useAudioAnalysis Effect] ---> 조건: 중지 요청 (isAnalysisActive=${isAnalysisActive})`, 'color: blue;');
      if (listening || cleanupRef.current) { // 리스닝 중이거나 정리 함수가 남아있다면 중지
        stopAnalysis();
      } else {
        console.log(`%c[useAudioAnalysis Effect] ---> 중지 요청이지만 이미 중지된 상태.`, 'color: gray;');
      }
    }

    // --- 컴포넌트 언마운트 시 최종 정리 ---
    return () => {
      console.log(`%c[useAudioAnalysis Effect Cleanup] 언마운트 또는 의존성 변경. 최종 정리 시도. isAnalysisActive=${isAnalysisActive}`, 'color: magenta; font-weight: bold;');
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