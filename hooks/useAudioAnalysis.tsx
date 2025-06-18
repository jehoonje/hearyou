import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { startAudioAnalysis } from '../utils/audioAnalyzer';
import { Keyword } from '../types';
import { useAuth } from '../app/contexts/AuthContext';

export const useAudioAnalysis = (
  user: User | null,
  onKeywordSaved?: (keyword: Keyword | string) => void
) => {
  const [volume, setVolume] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisActive, setIsAnalysisActive] = useState(false);

  const { isDemoUser } = useAuth(); 

  const cleanupRef = useRef<(() => void) | null>(null);
  const keywordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 데모 사용자용 상태 추적
  const processedDemoKeywordsRef = useRef<Set<string>>(new Set());
  const lastProcessedTranscriptRef = useRef<string>('');
  const transcriptBufferRef = useRef<string>('');

  const isAnalysisActiveRef = useRef(isAnalysisActive);
  useEffect(() => {
    isAnalysisActiveRef.current = isAnalysisActive;
  }, [isAnalysisActive]);

  const toggleListening = useCallback(() => {
    console.log('[useAudioAnalysis] toggleListening 호출');
    setIsAnalysisActive(prev => !prev);
  }, []);

  // 데모 사용자용 간단한 키워드 추출
  const extractDemoKeywords = useCallback((text: string): string[] => {
    const words = text.toLowerCase()
      .split(/[\s,.\!?]+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'that', 'this', 'with', '그리고', '그런데', '하지만', '그래서'].includes(word));
    
    return Array.from(new Set(words));
  }, []);

  // 데모 사용자용 키워드 처리 (디바운싱 적용)
  const processDemoKeywords = useCallback((transcript: string) => {
    // 이전과 같은 transcript면 무시
    if (transcript === lastProcessedTranscriptRef.current) {
      return;
    }

    // transcript가 이전보다 짧아졌으면 새로운 문장 시작
    if (transcript.length < transcriptBufferRef.current.length) {
      // 이전 버퍼의 내용을 처리
      const previousTranscript = transcriptBufferRef.current;
      if (previousTranscript && previousTranscript !== lastProcessedTranscriptRef.current) {
        const demoKeywords = extractDemoKeywords(previousTranscript);
        
        // 아직 처리되지 않은 키워드만 필터링
        const newUniqueKeywords = demoKeywords.filter(keyword => 
          !processedDemoKeywordsRef.current.has(keyword)
        );
        
        if (newUniqueKeywords.length > 0) {
          setNewKeywords(newUniqueKeywords);
          
          // 키워드 표시 타임아웃 설정
          if (keywordTimeoutRef.current) {
            clearTimeout(keywordTimeoutRef.current);
          }
          keywordTimeoutRef.current = setTimeout(() => {
            setNewKeywords([]);
          }, 5000);
          
          // 새로운 키워드만 저장
          newUniqueKeywords.forEach(keyword => {
            processedDemoKeywordsRef.current.add(keyword);
            if (onKeywordSaved) {
              onKeywordSaved(keyword);
            }
          });
        }
        
        lastProcessedTranscriptRef.current = previousTranscript;
      }
    }
    
    // 현재 transcript 버퍼에 저장
    transcriptBufferRef.current = transcript;
  }, [extractDemoKeywords, onKeywordSaved]);

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
        console.log('[useAudioAnalysis] 키워드 표시 타임아웃');
        setNewKeywords([]);
        keywordTimeoutRef.current = null;
      }, 5000);
    };

    const startAnalysis = async (userId: string) => {
      try {
        if (listening || cleanupRef.current) {
          console.log('[useAudioAnalysis] 이미 분석 중');
          return;
        }
        
        console.log('[useAudioAnalysis] 분석 시작 - 데모 모드:', isDemoUser);
        setError(null);
        setListening(true);
        setNewKeywords([]);
        
        // 데모 사용자 시작 시 초기화
        if (isDemoUser) {
          processedDemoKeywordsRef.current.clear();
          lastProcessedTranscriptRef.current = '';
          transcriptBufferRef.current = '';
        }

        // 데모 사용자용 처리
        if (isDemoUser) {
          cleanupRef.current = await startAudioAnalysis(
            userId,
            (vol) => setVolume(vol),
            (newTranscript) => {
              if (isAnalysisActiveRef.current) {
                setTranscript(newTranscript);
                processDemoKeywords(newTranscript);
              }
            },
            () => {}, // 서버 키워드 처리 스킵
            () => {}  // 서버 저장 스킵
          );
        } else {
          // 일반 사용자: 기존 로직
          cleanupRef.current = await startAudioAnalysis(
            userId,
            (vol) => setVolume(vol),
            (newTranscript) => {
              if (isAnalysisActiveRef.current) {
                setTranscript(newTranscript);
              }
            },
            (keywords) => {
              if (isAnalysisActiveRef.current && keywords && keywords.length > 0) {
                console.log('[useAudioAnalysis] 새 키워드 수신:', keywords);
                setNewKeywords(keywords);
                startKeywordTimeout();
              }
            },
            onKeywordSaved
          );
        }

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
      
      // 데모 사용자: 마지막 버퍼 처리
      if (isDemoUser && transcriptBufferRef.current && 
          transcriptBufferRef.current !== lastProcessedTranscriptRef.current) {
        processDemoKeywords(''); // 빈 문자열로 호출하여 마지막 버퍼 처리
      }
      
      // 데모 사용자 정리
      if (isDemoUser) {
        processedDemoKeywordsRef.current.clear();
        lastProcessedTranscriptRef.current = '';
        transcriptBufferRef.current = '';
      }

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

    return () => {
      console.log('[useAudioAnalysis] 컴포넌트 언마운트');
      stopAnalysis();
    };
  }, [isAnalysisActive, user, onKeywordSaved, isDemoUser, processDemoKeywords]);

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