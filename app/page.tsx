'use client';

import { useEffect, useState, useCallback } from 'react';
import ThreeScene from '../components/ThreeScene';
import { startAudioAnalysis } from '../utils/audioAnalyzer';
import { useAudioStore } from '../store/useAudioStore';
import { fetchKeywords, Keyword } from '../utils/fetchKeywords';

export default function Home() {
  const { setAudioData, clearKeywords, volume, transcript, keywords } = useAudioStore();
  const [keywordList, setKeywordList] = useState<Keyword[]>([]);
  const [stopAnalysis, setStopAnalysis] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState<boolean>(false);
  const [lastSoundTime, setLastSoundTime] = useState<number>(Date.now());

  // 새로 감지된 키워드 표시용
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  
  // 키워드 감지 시 이펙트 표시
  useEffect(() => {
    if (keywords.length > 0) {
      setNewKeywords(keywords);
      // 5초 후 새 키워드 표시 제거 (더 오래 표시)
      const timer = setTimeout(() => {
        setNewKeywords([]);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [keywords]);

  // 음성 활동 감지 효과
  useEffect(() => {
    if (volume > 20) { // 볼륨 임계값 더 낮게 설정
      setListening(true);
      setLastSoundTime(Date.now());
    } else if (Date.now() - lastSoundTime > 1500) { // 1.5초 침묵 후 비활성화
      setListening(false);
    }
  }, [volume]);

  // 오디오 분석 시작
  useEffect(() => {
    const startAnalysis = async () => {
      try {
        const stop = await startAudioAnalysis((volume, transcript, detectedKeywords) => {
          setAudioData(volume, transcript, detectedKeywords);
        });
        
        if (stop) {
          setStopAnalysis(() => stop);
          setListening(true);
          // Clear error if successful
          if (error) setError(null);
        }
      } catch (err: any) {
        // More descriptive error message
        const errorMessage = err.message || '마이크 접근에 실패했습니다. 권한과 연결 상태를 확인해주세요.';
        setError(errorMessage);
        console.error(err);
      }
    };
    
    startAnalysis();
    
    return () => {
      if (stopAnalysis) {
        stopAnalysis();
      }
    };
  }, [setAudioData]);

  // 키워드 목록 조회 - 더 자주 갱신
  const loadKeywords = useCallback(async () => {
    const keywords = await fetchKeywords();
    if (keywords) {
      setKeywordList(keywords);
    }
  }, []);

  // 주기적으로 키워드 목록 갱신 (더 자주)
  useEffect(() => {
    loadKeywords();
    const interval = setInterval(loadKeywords, 2000); // 2초마다 갱신
    return () => clearInterval(interval);
  }, [loadKeywords]);

  return (
    <div className="relative w-[375px] h-[667px] bg-black text-white flex flex-col items-center justify-center mx-auto">
      <div className="w-full h-full relative">
        <ThreeScene volume={volume} />
        
        {error && (
          <div className="absolute top-0 left-0 w-full bg-red-500 text-white p-2 text-center">
            {error}
          </div>
        )}
        
        <div className="absolute top-4 left-4 w-[90%] z-10">
          <h1 className="text-xl font-bold mb-4 flex items-center">
            음성 인식
            {listening && (
              <span className="ml-2 inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse" 
                    title="음성 감지 중"></span>
            )}
          </h1>
          
          <div className={`bg-black/50 p-3 rounded-lg mb-4 transition-all duration-300 
                          ${transcript ? 'border-blue-500 border' : 'border border-gray-700'}`}>
            <h2 className="text-base font-semibold mb-1">인식된 음성:</h2>
            <p className={`text-sm min-h-[40px] rounded p-2 bg-black/30
                          ${transcript ? 'text-white' : 'text-gray-400 italic'}`}>
              {transcript || '음성 대기 중... (말씀해 보세요)'}
            </p>
            {volume > 10 && !transcript && (
              <p className="text-xs text-yellow-400 mt-1 animate-pulse">
                소리가 감지되었지만 아직 음성으로 인식되지 않았습니다. 조금 더 크게 말씀해 보세요.
              </p>
            )}
          </div>
          
          {newKeywords.length > 0 && (
            <div className="bg-blue-500/50 p-3 rounded-lg mb-4 animate-pulse border border-blue-300">
              <h2 className="text-base font-semibold">감지된 키워드:</h2>
              <p className="text-sm font-bold">{newKeywords.join(', ')}</p>
            </div>
          )}
          
          <div className="bg-black/50 p-3 rounded-lg">
            <h2 className="text-base font-semibold mb-1">기록된 키워드:</h2>
            {keywordList.length > 0 ? (
              <ul className="mt-1 max-h-[200px] overflow-y-auto">
                {keywordList.map((k) => (
                  <li key={k.id} className="text-sm flex justify-between items-center py-1 border-b border-gray-700">
                    <span>{k.keyword}</span>
                    <span className="bg-blue-500 px-2 py-1 rounded-full text-xs">
                      {k.count}회
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">아직 기록된 키워드가 없습니다.</p>
            )}
          </div>
          
          <div className="mt-4 text-xs flex items-center justify-between">
            <div className="text-gray-400">
              볼륨 레벨: <span className={volume > 30 ? 'text-green-400' : 'text-gray-400'}>
                {Math.round(volume)}
              </span>
            </div>
            <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-100"
                style={{ width: `${Math.min(100, volume * 2)}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
