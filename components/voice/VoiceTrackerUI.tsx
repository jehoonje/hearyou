import { memo, useState, useEffect, useCallback, useRef } from 'react'; // useRef 추가
import { useMatchStore } from '../../store/matchStore';
import { useAuth } from '../../hooks/useAuth';
import ChatInterface from '../chat/ChatInterface';
import NotificationBanner from '../../components/NotificationBanner';
import VolumeIndicator from './VolumeIndicator';
import TranscriptDisplay from './TranscriptDisplay';
import KeywordList from './KeywordList';
import { Keyword } from '../../types';
// import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'; // 필요 시 runManualMatchmaking 내부에서 임포트

interface VoiceTrackerUIProps {
  volume: number;
  transcript: string;
  listening: boolean;
  newKeywords: string[];
  keywordList: Keyword[];
  error: string | null; // 오디오 분석 관련 에러
  userEmail: string;
  onLogout: () => void;
}

const VoiceTrackerUI = memo<VoiceTrackerUIProps>(({
  volume,
  transcript,
  listening,
  newKeywords,
  keywordList,
  error: audioError,
  userEmail,
  onLogout
}) => {
  const { user } = useAuth();
  const {
      currentMatch,
      isLoading: isMatchLoading,
      error: matchError, // 매칭 스토어 관련 에러
      fetchCurrentMatch,
      setActiveChatPartnerId,
      subscribeToMatchChanges,
      unsubscribeFromMatchChanges,
      clearMatch
  } = useMatchStore();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMatchmakingRunning, setIsMatchmakingRunning] = useState(false);

  // --- 알림 메시지 상태 관리 ---
  // 각 알림 유형에 대한 메시지 상태 (null이면 표시 안 함)
  const [audioErrorMessage, setAudioErrorMessage] = useState<string | null>(null);
  const [matchErrorMessage, setMatchErrorMessage] = useState<string | null>(null);
  const [noMatchMessage, setNoMatchMessage] = useState<string | null>(null);

  // audioError prop 변경 감지
  useEffect(() => {
    setAudioErrorMessage(audioError ? `오디오 오류: ${audioError}` : null);
  }, [audioError]);

  // matchError 상태 변경 감지 (로딩 중 아닐 때만)
  useEffect(() => {
    setMatchErrorMessage(matchError && !isMatchLoading ? `매칭 오류: ${matchError}` : null);
  }, [matchError, isMatchLoading]);

  // 매칭 상대 없음 상태 감지
  useEffect(() => {
    if (!isMatchLoading && !currentMatch && !matchError) {
      setNoMatchMessage("아직 대화상대가 준비되지 않았습니다. (매칭 대기 중)");
    } else {
      setNoMatchMessage(null); // 매칭 상대 있거나, 로딩 중이거나, 에러 있으면 메시지 숨김
    }
  }, [isMatchLoading, currentMatch, matchError]);
  // --- 알림 메시지 상태 관리 끝 ---


  // 최초 마운트 및 사용자 변경 시 매치 정보 가져오기 (변경 없음)
  useEffect(() => {
    if (user) {
      fetchCurrentMatch(user);
    } else {
      clearMatch();
    }
  }, [user, fetchCurrentMatch, clearMatch]);

  // 매치 변경 구독 설정/해제 (변경 없음)
  useEffect(() => {
    if (user) {
      subscribeToMatchChanges(user);
    }
    return () => {
      unsubscribeFromMatchChanges();
    };
  }, [user, subscribeToMatchChanges, unsubscribeFromMatchChanges]);


  // 채팅 열기/닫기 (변경 없음)
  const openChat = useCallback(() => {
    // --- 로그 추가 ---
    console.log('Chat button clicked. currentMatch:', currentMatch);
    // --- 로그 추가 끝 ---

    if (currentMatch?.partner) {
        // --- 로그 추가 ---
        console.log('Match found, calling setActiveChatPartnerId and setIsChatOpen(true). Partner ID:', currentMatch.partner.userId);
        // --- 로그 추가 끝 ---
        setActiveChatPartnerId(currentMatch.partner.userId);
        setIsChatOpen(true); // 상태 변경 시도
    } else {
        console.warn("채팅 열기 실패: 현재 매치 정보 없음");
        alert("현재 매칭된 상대가 없습니다.");
    }
  }, [currentMatch, setActiveChatPartnerId]);

  const closeChat = useCallback(() => { /* ... 이전 코드와 동일 ... */
     setActiveChatPartnerId(null);
     setIsChatOpen(false);
  }, [setActiveChatPartnerId]);

  // 테스트 매치메이킹 함수 (변경 없음)
  const runManualMatchmaking = useCallback(async () => { /* ... 이전 코드와 동일 ... */
       if (isMatchmakingRunning) return;
      setIsMatchmakingRunning(true);
      const { createClientComponentClient } = await import('@supabase/auth-helpers-nextjs');
      const supabaseClient = createClientComponentClient();
      try {
          const { data, error: invokeError } = await supabaseClient.functions.invoke('matchmaking', { method: 'POST' });
          if (invokeError) throw invokeError;
          alert(`매치메이킹 성공: ${data.message || '완료'}`);
          if (user) { fetchCurrentMatch(user); }
      } catch (err: any) {
          alert(`매치메이킹 실패: ${err.message || '알 수 없는 오류'}`);
          console.error("매치메이킹 함수 호출 오류:", err);
      } finally {
          setIsMatchmakingRunning(false);
      }
  }, [isMatchmakingRunning, user, fetchCurrentMatch]); // useCallback 의존성 배열 업데이트

  // 로그아웃 처리 (변경 없음)
  const handleLogout = useCallback(() => { /* ... 이전 코드와 동일 ... */
      clearMatch();
      onLogout();
  }, [clearMatch, onLogout]); // useCallback 의존성 배열 업데이트


  return (
    <>
      <div className="absolute inset-0 flex flex-col w-full h-full pointer-events-none">
        {/* --- 알림 컨테이너 (변경 없음) --- */}
        <div className="absolute top-0 left-0 right-0 z-50 flex flex-col items-center space-y-1 pt-2">
             <NotificationBanner message={audioErrorMessage} type="error" onDismiss={() => setAudioErrorMessage(null)} />
             <NotificationBanner message={matchErrorMessage} type="info" onDismiss={() => setMatchErrorMessage(null)} />
             <NotificationBanner message={noMatchMessage} type="warning" onDismiss={() => setNoMatchMessage(null)} />
         </div>
         {/* --- 알림 컨테이너 끝 --- */}

        {/* 상단 영역 */}
        <div className="p-4 flex-shrink-0 pointer-events-auto">
          <div className="flex justify-between items-center mb-4">
            {/* 타이틀 */}
            <h1 className="text-xl font-mono font-bold flex items-center text-shadow"> Univoice {listening && <span className="ml-2 inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>} </h1>
            {/* 버튼 영역 */}
            <div className="flex items-center space-x-2">
              {/* 이메일, 로그아웃 */}
              <span className="text-xs font-mono text-gray-400 hidden sm:inline"> {userEmail?.split("@")[0]} </span>
              <button onClick={handleLogout} className="text-xs bg-gray-800 hover:bg-gray-700 pointer text-white font-mono py-1 px-2 rounded"> Sign Out </button>
            </div>
          </div>
          <TranscriptDisplay transcript={transcript} />
           {newKeywords.length > 0 && (
             <div className="backdrop-blur-lg bg-blue-500/30 p-3 rounded-lg mb-4 animate-pulse border border-blue-300">
               <h2 className="text-base font-mono font-semibold text-shadow"> 감지된 키워드: </h2>
               <p className="text-sm font-mono font-bold"> {newKeywords.join(', ')} </p>
             </div>
           )}
          <VolumeIndicator volume={volume} />
        </div>

        {/* 중앙 여백 */}
        <div className="flex-grow"></div>

        {/* === 하단 영역 === */}
        <div className="p-4 flex-shrink-0 pointer-events-auto">
            {/* --- 채팅 관련 버튼 (KeywordList 위) --- */}
            <div className="flex items-center space-x-2 mb-4">
                 <button onClick={runManualMatchmaking} disabled={isMatchmakingRunning} className={`text-xs font-mono py-1 px-2 rounded transition-colors ${isMatchmakingRunning ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 text-black'}`} > {isMatchmakingRunning ? '매칭중...' : 'Test Match'} </button>
                 {isMatchLoading && <span className="text-xs text-gray-400"></span>}
                 {currentMatch && !isMatchLoading && ( <button onClick={openChat} className="text-xs bg-green-600 hover:bg-green-700 text-white font-mono py-1 px-2 rounded"> Chat </button> )}
            </div>
            {/* --- 채팅 관련 버튼 끝 --- */}

          {/* === KeywordList 래퍼 추가 === */}
          {/* 최대 높이를 지정하고 내용이 넘치면 스크롤 생성 */}
          <div className="overflow-y-auto max-h-36 scrollbar-thin"> {/* 예시: 최대 높이 144px (max-h-36), 필요시 조절 */}
            <KeywordList keywordList={keywordList} />
          </div>
          {/* === KeywordList 래퍼 끝 === */}
        </div>
        {/* === 하단 영역 끝 === */}

      </div>
      {isChatOpen && (
              <ChatInterface onClose={closeChat} />
      )}
    </>
  );
});

VoiceTrackerUI.displayName = 'VoiceTrackerUI';
export default VoiceTrackerUI;