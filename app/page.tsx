'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import ThreeScene from '../components/ThreeScene';
import { startAudioAnalysis } from '../utils/audioAnalyzer';
import { useAudioStore } from '../store/useAudioStore';
import { fetchKeywords, Keyword } from '../utils/fetchKeywords';

export default function Home() {
  const { 
    volume, transcript, keywords, 
    setVolume, setTranscript, setKeywords, clearKeywords
  } = useAudioStore();
  
  // 로딩 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);
  
  const [keywordList, setKeywordList] = useState<Keyword[]>([]);
  const [stopAnalysis, setStopAnalysis] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState<boolean>(false);
  const [lastSoundTime, setLastSoundTime] = useState<number>(Date.now());
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 새로 감지된 키워드 표시용
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [keywordTimerId, setKeywordTimerId] = useState<NodeJS.Timeout | null>(null);

  // 시뮬레이션된 로딩 진행 처리
  useEffect(() => {
    // 점진적인 로딩 진행 시뮬레이션
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress > 100) {
        currentProgress = 100;
        clearInterval(interval);
        
        // 로딩 완료 후 약간의 지연 시간 추가 (UI/UX 개선)
        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          
          // 콘텐츠 페이드인 효과를 위한 지연
          setTimeout(() => {
            setContentVisible(true);
          }, 300);
        }, 500);
      }
      setLoadingProgress(Math.min(currentProgress, 100));
    }, 400);
    
    return () => {
      clearInterval(interval);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // 키워드 감지 시 이펙트 표시
  useEffect(() => {
    if (keywordTimerId) {
      clearTimeout(keywordTimerId);
      setKeywordTimerId(null);
    }
    
    if (keywords.length > 0) {
      console.log('키워드 감지됨, UI 표시:', keywords);
      setNewKeywords([...keywords]);
      
      const timerId = setTimeout(() => {
        console.log('키워드 표시 시간 만료, 초기화');
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

  // 음성 활동 감지 효과
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
    if (!isLoading) { // 로딩이 완료된 후에만 오디오 분석 시작
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
          const errorMessage = err.message || '마이크 접근에 실패했습니다. 권한과 연결 상태를 확인해주세요.';
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
  }, [isLoading, setVolume, setTranscript, setKeywords]);

  // 키워드 목록 조회
  const loadKeywords = useCallback(async () => {
    const keywords = await fetchKeywords();
    if (keywords) {
      setKeywordList(keywords);
    }
  }, []);

  // 주기적으로 키워드 목록 갱신
  useEffect(() => {
    if (!isLoading) { // 로딩이 완료된 후에만 키워드 조회 시작
      loadKeywords();
      const interval = setInterval(loadKeywords, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoading, loadKeywords]);

  // 로딩 화면 컴포넌트
  const LoadingScreen = () => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700">
      <div className="w-[200px] text-center">
        <h1 className="text-3xl font-mono font-bold mb-6 text-white tracking-wider">
          VOICE TRACKER
        </h1>
        
        <div className="mb-6 flex flex-col items-center">
          {/* 로딩 아이콘 (파동 효과) */}
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500 opacity-75 animate-ping"></div>
            <div className="absolute inset-[25%] rounded-full bg-blue-500"></div>
          </div>
          
          {/* 로딩 텍스트 */}
          <p className="text-sm font-mono text-gray-400 mb-2">
            시스템 초기화 중...
          </p>
        </div>
        
        {/* 로딩 진행바 */}
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
        
        {/* 진행 퍼센트 */}
        <p className="text-xs font-mono text-gray-500">
          {Math.round(loadingProgress)}%
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-[375px] h-[808px] bg-black text-white mx-auto overflow-hidden relative">
      {/* 로딩 화면 */}
      {isLoading && <LoadingScreen />}
      
      {/* 메인 콘텐츠 영역 - 전체 스택 구조로 배치 */}
      <div className={`w-full h-full relative transition-opacity duration-1000 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}>
        {/* ThreeScene 배경 - 절대 포지션으로 전체 영역 차지 */}
        <div className="absolute inset-0 w-full h-full">
          <ThreeScene volume={volume} />
        </div>
        
        {/* UI 오버레이 - 포인터 이벤트 없음 (드래깅 허용) */}
        <div className="absolute inset-0 flex flex-col w-full h-full pointer-events-none">
          {/* 에러 메시지 - 포인터 이벤트 허용 */}
          {error && (
            <div className="sticky top-0 w-full bg-red-500 text-white p-2 text-center z-50 font-mono pointer-events-auto">
              {error}
            </div>
          )}
          
          {/* 상단 영역 - 포인터 이벤트 허용 */}
          <div className="p-4 flex-shrink-0 pointer-events-auto">
            <h1 className="text-xl font-mono font-bold mb-4 flex items-center text-shadow">
              Voice Tracker
              {listening && (
                <span className="ml-2 inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse" 
                      title="음성 감지 중"></span>
              )}
            </h1>
            
            {/* 인식된 음성 텍스트 */}
            <div className={`backdrop-blur-sm p-3 rounded-lg mb-4 transition-all duration-300 
                          ${transcript ? 'border-blue-500 border' : 'border border-gray-700/50'}`}>
              <h2 className="text-base font-mono font-semibold mb-1 text-shadow">인식된 음성:</h2>
              <p className={`text-sm font-mono min-h-[40px] rounded p-2 bg-black/20
                          ${transcript ? 'text-white' : 'text-gray-400 italic'}`}>
                {transcript || '음성 대기 중... (말씀해 보세요)'}
              </p>
            </div>
            
            {/* 감지된 키워드 알림 */}
            {newKeywords.length > 0 && (
              <div className="backdrop-blur-lg bg-blue-500/30 p-3 rounded-lg mb-4 animate-pulse border border-blue-300">
                <h2 className="text-base font-mono font-semibold text-shadow">감지된 키워드:</h2>
                <p className="text-sm font-mono font-bold">{newKeywords.join(', ')}</p>
              </div>
            )}
            
            {/* 볼륨 레벨 표시 */}
            <div className="mt-4 text-xs flex items-center justify-between">
              <div className="text-gray-300 font-mono text-shadow">
                볼륨 레벨: <span className={volume > 30 ? 'text-green-400' : 'text-gray-300'}>
                  {Math.round(volume)}
                </span>
              </div>
              <div className="w-24 h-2 bg-gray-800/70 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-100"
                  style={{ width: `${Math.min(100, volume * 2)}%` }}></div>
              </div>
            </div>
          </div>
          
          {/* 중앙 여백 - 드래깅을 위한 영역 */}
          <div className="flex-grow"></div>
          
          {/* 하단 영역 - 포인터 이벤트 허용 */}
          <div className="p-4 flex-shrink-0 pointer-events-auto">
            <div className="bg-transparent p-3 rounded-lg border border-gray-700/50">
              <h2 className="text-base font-mono font-semibold mb-1 text-shadow">기록된 키워드:</h2>
              {keywordList.length > 0 ? (
                <ul className="mt-1 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
                  {keywordList.map((k) => (
                    <li key={k.id} className="text-sm font-mono flex justify-between items-center py-1 border-b border-gray-700/50">
                      <span className="text-shadow">{k.keyword}</span>
                      <span className="bg-blue-500/70 px-2 py-1 rounded-full text-xs">
                        {k.count}회
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm font-mono text-gray-400">아직 기록된 키워드가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
