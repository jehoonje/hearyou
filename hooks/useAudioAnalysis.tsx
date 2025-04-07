import { useState, useEffect, useCallback } from 'react';
import { startAudioAnalysis } from "../utils/audioAnalyzer";
import { useAudioStore } from "../store/useAudioStore";

export function useAudioAnalysis(isLoggedIn: boolean, isLoading: boolean) {
  const { 
    volume, 
    transcript, 
    keywords, 
    setVolume, 
    setTranscript, 
    setKeywords,
    clearKeywords
  } = useAudioStore();

  const [stopAnalysis, setStopAnalysis] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [lastSoundTime, setLastSoundTime] = useState(Date.now());
  
  // 새로 감지된 키워드 표시용
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [keywordTimerId, setKeywordTimerId] = useState<NodeJS.Timeout | null>(null);

  // 키워드 감지 시 이펙트 표시 - 디바운싱 적용
  useEffect(() => {
    if (keywordTimerId) {
      clearTimeout(keywordTimerId);
      setKeywordTimerId(null);
    }

    if (keywords.length > 0) {
      setNewKeywords([...keywords]);

      const timerId = setTimeout(() => {
        setNewKeywords([]);
        clearKeywords();
      }, 1000);

      setKeywordTimerId(timerId);
    }

    return () => {
      if (keywordTimerId) {
        clearTimeout(keywordTimerId);
      }
    };
  }, [keywords, clearKeywords]);

  // 음성 활동 감지 효과 - 스로틀링 적용
  useEffect(() => {
    if (volume > 15) {
      setListening(true);
      setLastSoundTime(Date.now());
    } else if (Date.now() - lastSoundTime > 1500) {
      setListening(false);
    }
  }, [volume]);

  // 오디오 분석 시작
  useEffect(() => {
    if (!isLoading && isLoggedIn) {
      const startAnalysis = async () => {
        try {
          const stop = await startAudioAnalysis(
            (volume) => setVolume(volume),
            (transcript) => setTranscript(transcript),
            (keywords) => setKeywords(keywords)
          );

          if (stop) {
            setStopAnalysis(() => stop);
            setListening(true);
            if (error) setError(null);
          }
        } catch (err: any) {
          const errorMessage =
            err.message ||
            "마이크 접근에 실패했습니다. 권한과 연결 상태를 확인해주세요.";
          setError(errorMessage);
          console.error(err);
        }
      };

      startAnalysis();
    }

    return () => {
      if (stopAnalysis) {
        stopAnalysis();
      }
    };
  }, [isLoading, isLoggedIn, setVolume, setTranscript, setKeywords, error]);

  return {
    volume,
    transcript,
    listening,
    newKeywords,
    error
  };
}
