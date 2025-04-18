import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { useMatchStore } from '../../store/matchStore';
import { useAuth } from '../../hooks/useAuth';
import ChatInterface from '../chat/ChatInterface';
import NotificationBanner from '../../components/NotificationBanner';
import VolumeIndicator from './VolumeIndicator';
import TranscriptDisplay from './TranscriptDisplay';
import KeywordList from './KeywordList';
import { Keyword } from '../../types';
// import { useAudioAnalysis } from '../../hooks/useAudioAnalysis'; // <--- 이 줄 삭제!
import { Mic, MicOff } from 'lucide-react';

interface VoiceTrackerUIProps {
  // --- 시작: 필요한 Props 추가 ---
  volume: number;
  transcript: string;
  listening: boolean;
  newKeywords: string[];
  error: string | null; // audioError 대신 범용 error prop 사용 또는 audioError 명시
  toggleListening: () => void;
  // --- 끝: 필요한 Props 추가 ---
  keywordList: Keyword[];
  userEmail: string;
  onLogout: () => void;
}

const VoiceTrackerUI = memo<VoiceTrackerUIProps>(({
  // Props 받기
  volume,
  transcript,
  listening,
  newKeywords,
  error: audioErrorProp, // prop 이름 변경 (선택 사항)
  toggleListening,
  // 기존 props
  keywordList,
  userEmail,
  onLogout,
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

  // --- useAudioAnalysis 훅 호출 삭제 ---
  // const {
  //   volume, // 이제 props로 받음
  //   transcript, // 이제 props로 받음
  //   listening, // 이제 props로 받음
  //   newKeywords, // 이제 props로 받음
  //   error: audioError, // 이제 props로 받음
  //   toggleListening // 이제 props로 받음
  //  } = useAudioAnalysis(user, handleKeywordSaved); // <--- 이 블록 전체 삭제!

  // --- Keyword Saved 콜백 (변경 없음) ---
  const handleKeywordSaved = useCallback((savedKeyword: Keyword) => {
       console.log("Keyword saved callback received in UI:", savedKeyword);
   }, []);

  // --- 상태 및 로직 (audioError 상태는 prop으로 대체) ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMatchmakingRunning, setIsMatchmakingRunning] = useState(false);
  const [isaudioErrorMessage, setAudioErrorMessage] = useState<string | null>(null); // 직접 상태 관리 대신 prop 사용
  const [matchErrorMessage, setMatchErrorMessage] = useState<string | null>(null);
  const [noMatchMessage, setNoMatchMessage] = useState<string | null>(null);

  // 오디오 에러 메시지는 prop으로 직접 사용
  const audioErrorMessage = audioErrorProp ? `오디오 오류: ${audioErrorProp}` : null;

  // useEffect(() => { setAudioErrorMessage(audioError ? `오디오 오류: ${audioError}` : null); }, [audioError]); // <--- 삭제
  useEffect(() => { setMatchErrorMessage(matchError && !isMatchLoading ? `매칭 오류: ${matchError}` : null); }, [matchError, isMatchLoading]);
  useEffect(() => { setNoMatchMessage(!isMatchLoading && !currentMatch && !matchError && user ? "아직 대화상대가 준비되지 않았습니다." : null); }, [isMatchLoading, currentMatch, matchError, user]);

  useEffect(() => { if (user) { fetchCurrentMatch(user); } else { clearMatch(); } }, [user, fetchCurrentMatch, clearMatch]);
  useEffect(() => { if (user) { subscribeToMatchChanges(user); } return () => { unsubscribeFromMatchChanges(); }; }, [user, subscribeToMatchChanges, unsubscribeFromMatchChanges]);

  const openChat = useCallback(() => { if (currentMatch?.partner) { setActiveChatPartnerId(currentMatch.partner.userId); setIsChatOpen(true); } else { alert("현재 매칭된 상대가 없습니다."); } }, [currentMatch?.partner, setActiveChatPartnerId]);
  const closeChat = useCallback(() => { setActiveChatPartnerId(null); setIsChatOpen(false); }, [setActiveChatPartnerId]);

  const runManualMatchmaking = useCallback(async () => { /* ... 이전 로직 ... */ }, [isMatchmakingRunning, user, fetchCurrentMatch]);

  // 로그아웃 핸들러에서 prop으로 받은 listening, toggleListening 사용
  const handleLogout = useCallback(() => {
    if (listening) { // prop 사용
        toggleListening(); // prop 사용
    }
    clearMatch();
    onLogout();
  }, [clearMatch, onLogout, listening, toggleListening]); // listening, toggleListening prop 의존성 추가

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
            {/* 타이틀과 녹음 버튼 (listening, toggleListening props 사용) */}
            <div className="flex items-center space-x-2">
                <h1 className="text-xl font-mono font-bold flex items-center text-shadow"> Univoice </h1>
                <button
                     onClick={toggleListening} // prop 사용
                     disabled={!user}
                     className={`p-1.5 rounded-full transition-colors duration-200 ease-in-out ${
                         !user
                           ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                           : listening // prop 사용
                             ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                             : 'bg-green-600 hover:bg-green-500 text-white'
                     }`}
                     title={!user ? '로그인 필요' : listening ? '음성 인식 중지' : '음성 인식 시작'}
                     aria-label={listening ? 'Stop recording' : 'Start recording'}
                 >
                     {listening ? <MicOff size={16} strokeWidth={2.5} /> : <Mic size={16} strokeWidth={2.5} />}
                 </button>
            </div>
            {/* 사용자 정보/로그아웃 (handleLogout은 위에서 수정됨) */}
            <div className='flex items-center space-x-2'>
              {userEmail && <span className="text-xs font-mono text-gray-400 hidden sm:inline"> {userEmail.split("@")[0]} </span>}
              <button onClick={handleLogout} className="text-xs bg-gray-800 hover:bg-gray-700 cursor-pointer text-white font-mono py-2 px-4 rounded"> Sign Out </button>
            </div>
          </div>

          {/* 음성 관련 UI (transcript, newKeywords, volume props 사용) */}
          <div className="min-h-[100px]">
              {listening && ( // prop 사용
                <div className="transition-opacity duration-300 ease-in-out opacity-100">
                  <TranscriptDisplay transcript={transcript} /> {/* prop 사용 */}
                  {newKeywords.length > 0 && ( // prop 사용
                    <div className="backdrop-blur-lg bg-blue-500/30 p-3 rounded-lg my-2 animate-pulse border border-blue-300">
                      <h2 className="text-base font-mono font-semibold text-shadow"> 감지된 키워드: </h2>
                      <p className="text-sm font-mono font-bold"> {newKeywords.join(', ')} </p> {/* prop 사용 */}
                    </div>
                  )}
                  <VolumeIndicator volume={volume} /> {/* prop 사용 */}
                </div>
              )}
              {!listening && audioErrorProp && ( // prop 사용
                 <div className="text-red-400 text-sm font-mono p-2 bg-red-900/30 rounded">
                     오디오 오류: {audioErrorProp} {/* prop 사용 */}
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