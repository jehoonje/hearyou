import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useMatchStore } from '../../store/matchStore';
import { useAuth } from '../../hooks/useAuth';
import ChatInterface from '../chat/ChatInterface';
import NotificationBanner from '../../components/NotificationBanner'; // 경로 확인
import VolumeIndicator from './VolumeIndicator';
import TranscriptDisplay from './TranscriptDisplay';
import KeywordList from './KeywordList';
import { Keyword } from '../../types'; // 경로 확인
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis'; // useAudioAnalysis 임포트
import { Mic, MicOff } from 'lucide-react'; // 아이콘 임포트

interface VoiceTrackerUIProps {
  keywordList: Keyword[];
  userEmail: string;
  onLogout: () => void;
  // 외부 콜백은 필요 시 prop으로 받거나 context 사용
  // onKeywordSavedProp?: (keyword: Keyword) => void;
}

const VoiceTrackerUI = memo<VoiceTrackerUIProps>(({
  keywordList,
  userEmail,
  onLogout,
  // onKeywordSavedProp
}) => {
  const { user } = useAuth();
  const {
      currentMatch,
      isLoading: isMatchLoading,
      error: matchError,
      fetchCurrentMatch,
      setActiveChatPartnerId,
      subscribeToMatchChanges,
      unsubscribeFromMatchChanges,
      clearMatch
  } = useMatchStore();

  // --- Keyword Saved 콜백 메모이제이션 ---
  const handleKeywordSaved = useCallback((savedKeyword: Keyword) => {
       console.log("Keyword saved callback received in UI:", savedKeyword);
       // 상위 컴포넌트 콜백 호출 또는 상태 업데이트 로직
       // if (onKeywordSavedProp) {
       //   onKeywordSavedProp(savedKeyword);
       // }
   }, [/* onKeywordSavedProp 등 외부 의존성이 있다면 추가 */]); // 의존성 배열 중요!


  // --- useAudioAnalysis 훅 사용 ---
  const {
    volume,
    transcript,
    listening,
    newKeywords,
    error: audioError,
    toggleListening
   } = useAudioAnalysis(user, handleKeywordSaved); // 메모이제이션된 콜백 전달

   console.log('%%% [Parent] volume state:', volume);
  // --- 나머지 상태 및 로직 (이전과 거의 동일) ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMatchmakingRunning, setIsMatchmakingRunning] = useState(false);
  const [audioErrorMessage, setAudioErrorMessage] = useState<string | null>(null);
  const [matchErrorMessage, setMatchErrorMessage] = useState<string | null>(null);
  const [noMatchMessage, setNoMatchMessage] = useState<string | null>(null);

  useEffect(() => { setAudioErrorMessage(audioError ? `오디오 오류: ${audioError}` : null); }, [audioError]);
  useEffect(() => { setMatchErrorMessage(matchError && !isMatchLoading ? `매칭 오류: ${matchError}` : null); }, [matchError, isMatchLoading]);
  useEffect(() => { setNoMatchMessage(!isMatchLoading && !currentMatch && !matchError && user ? "아직 대화상대가 준비되지 않았습니다." : null); }, [isMatchLoading, currentMatch, matchError, user]); // user 조건 추가

  useEffect(() => { if (user) { fetchCurrentMatch(user); } else { clearMatch(); } }, [user, fetchCurrentMatch, clearMatch]);
  useEffect(() => { if (user) { subscribeToMatchChanges(user); } return () => { unsubscribeFromMatchChanges(); }; }, [user, subscribeToMatchChanges, unsubscribeFromMatchChanges]);

  const openChat = useCallback(() => { if (currentMatch?.partner) { setActiveChatPartnerId(currentMatch.partner.userId); setIsChatOpen(true); } else { alert("현재 매칭된 상대가 없습니다."); } }, [currentMatch?.partner, setActiveChatPartnerId]);
  const closeChat = useCallback(() => { setActiveChatPartnerId(null); setIsChatOpen(false); }, [setActiveChatPartnerId]);

  const runManualMatchmaking = useCallback(async () => { /* ... 이전 로직 ... */ }, [isMatchmakingRunning, user, fetchCurrentMatch]);

  // 로그아웃 시 오디오 중지 (선택적이지만 권장)
  const handleLogout = useCallback(() => {
    if (listening) { // 로그아웃 시 듣고 있었다면
        toggleListening(); // 중지 요청
    }
    clearMatch();
    onLogout();
  }, [clearMatch, onLogout, listening, toggleListening]); // listening, toggleListening 추가

  // --- UI 렌더링 ---
  return (
    <>
      <div className="absolute inset-0 flex flex-col w-full h-full pointer-events-none">
        {/* 알림 컨테이너 */}
        <div className="absolute top-0 left-0 right-0 z-50 flex flex-col items-center space-y-1 pt-2">
             {/* key를 추가하여 메시지 변경 시 애니메이션 효과를 줄 수 있음 */}
             <NotificationBanner key={`audio-${audioErrorMessage}`} message={audioErrorMessage} type="error" onDismiss={() => setAudioErrorMessage(null)} />
             <NotificationBanner key={`match-${matchErrorMessage}`} message={matchErrorMessage} type="info" onDismiss={() => setMatchErrorMessage(null)} />
             <NotificationBanner key={`noMatch-${noMatchMessage}`} message={noMatchMessage} type="warning" onDismiss={() => setNoMatchMessage(null)} />
         </div>

        {/* 상단 영역 */}
        <div className="p-4 flex-shrink-0 pointer-events-auto">
          <div className="flex justify-between items-center mb-4">
            {/* 타이틀과 녹음 버튼 */}
            <div className="flex items-center space-x-2">
                <h1 className="text-xl font-mono font-bold flex items-center text-shadow"> Univoice </h1>
                <button
                     onClick={toggleListening}
                     disabled={!user} // 로그인 상태 확인
                     className={`p-1.5 rounded-full transition-colors duration-200 ease-in-out ${
                         !user
                           ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                           : listening
                             ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                             : 'bg-green-600 hover:bg-green-500 text-white'
                     }`}
                     title={!user ? '로그인 필요' : listening ? '음성 인식 중지' : '음성 인식 시작'}
                     aria-label={listening ? 'Stop recording' : 'Start recording'}
                 >
                     {listening ? <MicOff size={16} strokeWidth={2.5} /> : <Mic size={16} strokeWidth={2.5} />}
                 </button>
                 {/* 디버깅용 listening 상태 표시 */}
                 {/* <span className={`ml-2 text-xs ${listening ? 'text-green-400' : 'text-red-400'}`}>{listening ? 'Listening' : 'Stopped'}</span> */}
            </div>
            {/* 사용자 정보/로그아웃 */}
            <div className='flex items-center space-x-2'>
              {userEmail && <span className="text-xs font-mono text-gray-400 hidden sm:inline"> {userEmail.split("@")[0]} </span>}
              <button onClick={handleLogout} className="text-xs bg-gray-800 hover:bg-gray-700 cursor-pointer text-white font-mono py-2 px-4 rounded"> Sign Out </button>
            </div>
          </div>

          {/* --- 음성 관련 UI: 깜박임 현상 확인 --- */}
          {/*
             깜박임의 주 원인이 잦은 리렌더링이라면, 이 블록 자체를 memo로 감싸거나,
             VolumeIndicator처럼 내부적으로 최적화된 컴포넌트를 사용하는 것이 도움이 될 수 있습니다.
             하지만 근본 원인인 useEffect 재실행이나 상태 불안정 문제를 먼저 해결해야 합니다.
             아래 구조는 유지하되, useAudioAnalysis 훅의 안정화가 중요합니다.
          */}
          <div className="min-h-[100px]"> {/* 컨텐츠가 없을 때도 높이 유지하여 레이아웃 흔들림 방지 */}
              {listening && (
                // Optional: Add transition effects for smoother appearance/disappearance
                <div className="transition-opacity duration-300 ease-in-out opacity-100">
                  <TranscriptDisplay transcript={transcript} />
                  {newKeywords.length > 0 && (
                    <div className="backdrop-blur-lg bg-blue-500/30 p-3 rounded-lg my-2 animate-pulse border border-blue-300"> {/* mb-4 대신 my-2로 변경 */}
                      <h2 className="text-base font-mono font-semibold text-shadow"> 감지된 키워드: </h2>
                      <p className="text-sm font-mono font-bold"> {newKeywords.join(', ')} </p>
                    </div>
                  )}
                  <VolumeIndicator volume={volume} />
                </div>
              )}
              {!listening && audioError && ( // 에러 메시지를 이 위치에 표시할 수도 있음
                 <div className="text-red-400 text-sm font-mono p-2 bg-red-900/30 rounded">
                     오디오 오류: {audioError}
                 </div>
              )}
         </div>
        </div>

        {/* 중앙 여백 */}
        <div className="flex-grow"></div>

        {/* 하단 영역 */}
        <div className="p-4 flex-shrink-0 pointer-events-auto">
           {/* ... (이전과 동일) ... */}
           <div className="flex items-center space-x-2 mb-4">
                <button onClick={runManualMatchmaking} disabled={isMatchmakingRunning || !user} className={`text-xs font-mono py-1 px-2 rounded transition-colors ${isMatchmakingRunning || !user ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`} > {isMatchmakingRunning ? '매칭중...' : 'Test Match'} </button>
                {isMatchLoading && <span className="text-xs text-gray-400">확인중..</span>}
                {currentMatch && !isMatchLoading && ( <button onClick={openChat} className="text-xs bg-green-600 hover:bg-green-500 text-white font-mono py-1 px-2 rounded"> Chat </button> )}
           </div>
           <div className="overflow-y-auto max-h-36 scrollbar-thin">
               <KeywordList keywordList={keywordList} />
           </div>
        </div>
      </div>

      {/* 채팅 모달 */}
      {isChatOpen && <ChatInterface onClose={closeChat} />}
    </>
  );
});

VoiceTrackerUI.displayName = 'VoiceTrackerUI';
export default VoiceTrackerUI;