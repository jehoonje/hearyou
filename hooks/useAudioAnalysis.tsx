import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { startAudioAnalysis } from '../utils/audioAnalyzer'; // 경로 확인 필요
import { Keyword } from '../types'; // 경로 확인 필요

// (Window 타입 확장 - 필요한 경우 파일 상단 또는 별도 d.ts 파일에 추가)
// declare global {
//   interface Window {
//     _lastVolumeLogTime?: number;
//   }
// }

export const useAudioAnalysis = (
  user: User | null,
  onKeywordSaved?: (keyword: Keyword) => void
) => {
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false); // 실제 분석 진행 상태
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisActive, setIsAnalysisActive] = useState(false); // 사용자의 분석 시작/중지 요청 상태

  const cleanupRef = useRef<(() => void) | null>(null);

  // isAnalysisActive 상태를 ref로 관리 (콜백 내 최신 값 참조용)
  const isAnalysisActiveRef = useRef(isAnalysisActive);
  useEffect(() => {
    isAnalysisActiveRef.current = isAnalysisActive;
    // console.log(`[Ref Update Effect] isAnalysisActiveRef updated to: ${isAnalysisActive}`); // 상세 로그 필요시 활성화
  }, [isAnalysisActive]);

  // 분석 시작/중지 토글 함수
  const toggleListening = useCallback(() => {
    console.log(`%ctoggleListening 호출: 현재 isAnalysisActive=${isAnalysisActiveRef.current}, 요청 상태=${!isAnalysisActiveRef.current}`, 'color: purple; font-weight: bold;');
    setIsAnalysisActive(prev => !prev);
  }, []); // 의존성 없음

  // 메인 useEffect: 오디오 분석 시작/중지 로직
  useEffect(() => {
    console.log(
      `%c[useAudioAnalysis Effect] 실행됨 - isAnalysisActive: ${isAnalysisActive}, user: ${user?.id}`, // 로그에서 listening, onKeywordSaved 제거
      'color: blue; font-weight: bold;'
    );

    // 분석 시작 함수
    const startAnalysis = async (userId: string) => {
      console.log(`%c[useAudioAnalysis Effect] ---> startAnalysis 호출 (User: ${userId})`, 'color: green;');
      try {
        if (listening || cleanupRef.current) {
            console.warn("[useAudioAnalysis Effect] ---> startAnalysis: 이미 리스닝 중 또는 정리 대기 중");
            return;
        }
        setError(null);
        setListening(true);
        console.log(`%c[useAudioAnalysis Effect] ---> setListening(true) 호출됨`, 'color: green;');

        cleanupRef.current = await startAudioAnalysis(
          userId,
          (vol) => { setVolume(vol); },
          (newTranscript) => { if(isAnalysisActiveRef.current) setTranscript(newTranscript); },
          (keywords) => { if(isAnalysisActiveRef.current) setNewKeywords(keywords); },
          onKeywordSaved
        );
        console.log(`%c[useAudioAnalysis Effect] ---> startAnalysis 완료, cleanupRef 할당됨: ${!!cleanupRef.current}`, 'color: green;');

      } catch (err) {
        console.error('[useAudioAnalysis Effect] ---> startAnalysis 오류:', err);
        setError(err instanceof Error ? err.message : '오디오 분석 시작 중 오류');
        setListening(false);
        setIsAnalysisActive(false);
        cleanupRef.current = null;
        console.log(`%c[useAudioAnalysis Effect] ---> 오류로 setListening(false), setIsAnalysisActive(false) 호출됨`, 'color: red;');
      }
    };

    // 분석 중지 및 정리 함수
    const stopAnalysis = () => {
      console.log(`%c[useAudioAnalysis Effect] ---> stopAnalysis 호출됨. cleanupRef 존재?: ${!!cleanupRef.current}`, 'color: red;');
       if (cleanupRef.current) {
         console.log(`%c[useAudioAnalysis Effect] ------> cleanupRef.current() 실행 시도`, 'color: red; font-style: italic;');
         try {
             cleanupRef.current();
             console.log(`%c[useAudioAnalysis Effect] ------> cleanupRef.current() 실행 완료`, 'color: red; font-style: italic;');
         } catch(cleanupError){
             console.error("[useAudioAnalysis Effect] ------> cleanupRef.current() 실행 중 오류:", cleanupError);
         } finally {
             cleanupRef.current = null;
             if (listening) {
                console.log(`%c[useAudioAnalysis Effect] ------> 정리 후 setListening(false) 및 상태 초기화 호출`, 'color: orange;');
                setListening(false);
                setVolume(0);
                setTranscript('');
                setNewKeywords([]);
             }
         }
       } else {
           console.log(`%c[useAudioAnalysis Effect] ------> 실행할 cleanupRef 없음`, 'color: orange;');
           if (listening) {
              console.log(`%c[useAudioAnalysis Effect] ------> cleanupRef 없지만 setListening(false) 및 상태 초기화 호출`, 'color: orange;');
              setListening(false);
              setVolume(0);
              setTranscript('');
              setNewKeywords([]);
           }
       }
    };

    // --- 로직 실행 (isAnalysisActive로만 제어 - 테스트용) ---
    if (isAnalysisActive) {
      if (user?.id) {
          console.log(`%c[useAudioAnalysis Effect] ---> 조건: 시작 요청 (isAnalysisActive=${isAnalysisActive})`, 'color: blue;');
          if (!listening && !cleanupRef.current) {
              startAnalysis(user.id);
          } else {
              console.log(`%c[useAudioAnalysis Effect] ---> 시작 조건 맞지만 이미 리스닝 중(${listening}) 또는 정리 대기 중(${!!cleanupRef.current}). 시작 안 함.`, 'color: gray;');
          }
      } else {
           console.log(`%c[useAudioAnalysis Effect] ---> 시작 요청 상태지만 사용자 없음. 시작 안 함.`, 'color: orange;');
           if (listening || cleanupRef.current) {
               stopAnalysis();
           }
      }
    } else {
      console.log(`%c[useAudioAnalysis Effect] ---> 조건: 중지 요청 (isAnalysisActive=${isAnalysisActive})`, 'color: blue;');
      if (listening || cleanupRef.current) {
         stopAnalysis();
      }
    }

    // --- 컴포넌트 언마운트 시 최종 정리 ---
    return () => {
        console.log(`%c[useAudioAnalysis Effect Cleanup] 언마운트 또는 의존성 변경. 최종 정리 시도. isAnalysisActive=${isAnalysisActive}`, 'color: magenta; font-weight: bold;');
        stopAnalysis();
    };
  // <<<--- 의존성 배열 단순화 (테스트용) --->>>
  }, [isAnalysisActive]); // user, onKeywordSaved 제거됨!

  return {
    volume,
    transcript,
    listening,
    newKeywords,
    error,
    toggleListening,
  };
};