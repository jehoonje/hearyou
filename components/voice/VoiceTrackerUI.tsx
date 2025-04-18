// src/components/voice/VoiceTrackerUI.tsx 또는 유사 경로

import { memo, useState, useEffect, useCallback, useRef } from "react";
import { useMatchStore } from "../../store/matchStore"; // 경로 확인
import { useAuth } from "../../hooks/useAuth"; // 더 이상 직접 사용하지 않음
import ChatInterface from "../chat/ChatInterface"; // 경로 확인
import NotificationBanner from "../../components/NotificationBanner"; // 경로 확인
import VolumeIndicator from "./VolumeIndicator";
import TranscriptDisplay from "./TranscriptDisplay";
import KeywordList from "./KeywordList";
import { Keyword } from "../../types"; // 경로 확인
// import { useAudioAnalysis } from '../../hooks/useAudioAnalysis'; // !!! 이 훅 호출 제거 !!!
import { Mic, MicOff } from "lucide-react";

interface VoiceTrackerUIProps {
  // --- 상위 컴포넌트(MainContent)로부터 받을 Props 정의 ---
  volume: number;
  transcript: string | null;
  listening: boolean;
  newKeywords: string[];
  error: string | null; // 상위에서 audioError로 전달된 값
  toggleListening: () => void; // 녹음 시작/중지 함수

  // --- 기존 Props ---
  keywordList: Keyword[];
  userEmail: string;
  onLogout: () => void;
  // user?: User | null; // 만약 user 객체가 필요하다면 추가
}

const VoiceTrackerUI = memo<VoiceTrackerUIProps>(
  ({
    // --- Props 구조 분해 ---
    volume,
    transcript,
    listening,
    newKeywords,
    error: audioErrorProp, // 받은 error prop의 이름을 audioErrorProp으로 변경
    toggleListening,
    keywordList,
    userEmail,
    onLogout,
    // user // 만약 user prop을 받는다면 추가
  }) => {
    // --- !!! 내부 useAudioAnalysis 호출 완전 제거 !!! ---
    /*
  const { user } = useAuth(); // 제거
  const handleKeywordSaved = useCallback((savedKeyword: Keyword) => { ... }, []); // 제거
  const { volume, transcript, listening, ... } = useAudioAnalysis(user, handleKeywordSaved); // 제거
  */
    console.log("%%% [VoiceTrackerUI] Received volume via prop:", volume); // Props로 받은 volume 확인
    console.log(
      "%%% [VoiceTrackerUI] Received listening state via prop:",
      listening
    ); // Props로 받은 listening 상태 확인

    // --- 매치 관련 상태 (변경 없음) ---
    const {
      currentMatch,
      isLoading: isMatchLoading,
      error: matchError,
      fetchCurrentMatch,
      setActiveChatPartnerId,
      subscribeToMatchChanges,
      unsubscribeFromMatchChanges,
      clearMatch,
    } = useMatchStore();

    // --- 로컬 UI 상태 (변경 없음) ---
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isMatchmakingRunning, setIsMatchmakingRunning] = useState(false);
    const [audioErrorMessage, setAudioErrorMessage] = useState<string | null>(
      null
    );
    const [matchErrorMessage, setMatchErrorMessage] = useState<string | null>(
      null
    );
    const [noMatchMessage, setNoMatchMessage] = useState<string | null>(null);

    const { user } = useAuth();

    // --- 에러 메시지 상태 업데이트: Props로 받은 audioErrorProp 사용 ---
    useEffect(() => {
      setAudioErrorMessage(
        audioErrorProp ? `오디오 오류: ${audioErrorProp}` : null
      );
    }, [audioErrorProp]); // props 변경 시 업데이트

    // --- 매치 관련 useEffects (userEmail 또는 user.id 기반으로 동작 확인 필요) ---
    useEffect(() => {
      if (user) {
        fetchCurrentMatch(user);
      } else {
        clearMatch();
      }
    }, [user, fetchCurrentMatch, clearMatch]);

    useEffect(() => {
      if (user) {
        subscribeToMatchChanges(user);
      }

      return () => {
        unsubscribeFromMatchChanges();
      };
    }, [user, subscribeToMatchChanges, unsubscribeFromMatchChanges]);

    // **주의:** useMatchStore가 user 객체를 요구하는 경우, userEmail 대신 user prop을 받아 사용해야 합니다.
    // 아래 로직은 userEmail 기반으로 수정했지만, 실제로는 user 객체가 필요할 수 있습니다.
    useEffect(() => {
      // if (user) { // user prop을 받는 경우
      if (userEmail) {
        // 현재 코드 (userEmail 사용)
        // fetchCurrentMatch(user); // user 객체 전달 필요
        // subscribeToMatchChanges(user); // user 객체 전달 필요
        console.log(
          "Attempting match operations based on user presence (email check)"
        ); // 임시 로그
      } else {
        clearMatch();
      }
      // return () => { unsubscribeFromMatchChanges(); };
    }, [
      userEmail,
      fetchCurrentMatch,
      clearMatch,
      subscribeToMatchChanges,
      unsubscribeFromMatchChanges,
    ]); // 의존성 확인 (user 또는 userEmail)

    // --- UI 액션 함수들 ---
    const openChat = useCallback(() => {
      if (currentMatch?.partner) {
        setActiveChatPartnerId(currentMatch.partner.userId);
        setIsChatOpen(true);
      } else {
        alert("현재 매칭된 상대가 없습니다.");
      }
    }, [currentMatch?.partner, setActiveChatPartnerId]);
    const closeChat = useCallback(() => {
      setActiveChatPartnerId(null);
      setIsChatOpen(false);
    }, [setActiveChatPartnerId]);
    const runManualMatchmaking = useCallback(async () => {
      /* ... 이전 코드와 동일 ... */
      if (isMatchmakingRunning) return;
      setIsMatchmakingRunning(true);
      const { createClientComponentClient } = await import(
        "@supabase/auth-helpers-nextjs"
      );
      const supabaseClient = createClientComponentClient();
      try {
        const { data, error: invokeError } =
          await supabaseClient.functions.invoke("matchmaking", {
            method: "POST",
          });
        if (invokeError) throw invokeError;
        alert(`매치메이킹 성공: ${data.message || "완료"}`);
        if (user) {
          fetchCurrentMatch(user);
        }
      } catch (err: any) {
        alert(`매치메이킹 실패: ${err.message || "알 수 없는 오류"}`);
        console.error("매치메이킹 함수 호출 오류:", err);
      } finally {
        setIsMatchmakingRunning(false);
      }
    }, [isMatchmakingRunning, user, fetchCurrentMatch]); // useCallback 의존성 배열 업데이트

    // 로그아웃 핸들러: Props로 받은 listening, toggleListening 사용
    const handleLogout = useCallback(() => {
      if (listening) {
        // 상위에서 받은 listening 상태 확인
        toggleListening(); // 상위에서 받은 함수 호출
      }
      clearMatch();
      onLogout();
    }, [clearMatch, onLogout, listening, toggleListening]); // 의존성 업데이트

    return (
      <>
        <div className="absolute inset-0 flex flex-col w-full h-full pointer-events-none">
          {/* 알림 배너 (audioErrorMessage 상태 사용) */}
          <div className="absolute top-0 left-0 right-0 z-50 flex flex-col items-center space-y-1 pt-2">
            <NotificationBanner
              key={`audio-${audioErrorMessage}`}
              message={audioErrorMessage}
              type="error"
              onDismiss={() => setAudioErrorMessage(null)}
            />
            <NotificationBanner
              key={`match-${matchErrorMessage}`}
              message={matchErrorMessage}
              type="info"
              onDismiss={() => setMatchErrorMessage(null)}
            />
            <NotificationBanner
              key={`noMatch-${noMatchMessage}`}
              message={noMatchMessage}
              type="warning"
              onDismiss={() => setNoMatchMessage(null)}
            />
          </div>

          {/* 상단 영역 */}
          <div className="p-4 flex-shrink-0 pointer-events-auto">
            <div className="flex justify-between items-center mb-4">
              {/* 타이틀과 녹음 버튼 */}
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-mono font-bold flex items-center text-shadow">
                  {" "}
                  Univoice{" "}
                </h1>
                {/* 녹음 버튼: Props의 toggleListening 함수와 listening 상태 사용 */}
                <button
                  onClick={toggleListening} // 상위 컴포넌트에서 전달받은 함수 호출
                  disabled={!userEmail} // 로그인 상태 확인 (userEmail 또는 user prop 사용)
                  className={`p-1.5 rounded-full transition-colors duration-200 ease-in-out ${
                    !userEmail // 로그인 상태 확인
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : listening // 상위에서 받은 listening 상태 사용
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "bg-green-600 hover:bg-green-500 text-white"
                  }`}
                  title={
                    !userEmail
                      ? "로그인 필요"
                      : listening
                      ? "음성 인식 중지"
                      : "음성 인식 시작"
                  }
                  aria-label={listening ? "Stop recording" : "Start recording"}
                >
                  {/* 아이콘: Props의 listening 상태에 따라 변경 */}
                  {listening ? (
                    <MicOff size={16} strokeWidth={2.5} />
                  ) : (
                    <Mic size={16} strokeWidth={2.5} />
                  )}
                </button>
                {/* 디버깅용 상태 표시 (선택 사항) */}
                {/* <span className={`ml-2 text-xs ${listening ? 'text-green-400' : 'text-red-400'}`}>{listening ? 'Listening (from Prop)' : 'Stopped (from Prop)'}</span> */}
              </div>
              {/* 사용자 정보/로그아웃 */}
              <div className="flex items-center space-x-2">
                {userEmail && (
                  <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                    {" "}
                    {userEmail.split("@")[0]}{" "}
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-xs bg-gray-800 hover:bg-gray-700 cursor-pointer text-white font-mono py-2 px-4 rounded"
                >
                  {" "}
                  Sign Out{" "}
                </button>
              </div>
            </div>

            {/* 음성 관련 UI: Props로 받은 상태 사용 */}
            <div className="min-h-[100px]">
              {listening && ( // props의 listening 상태 확인
                <div className="transition-opacity duration-300 ease-in-out opacity-100">
                  <TranscriptDisplay transcript={transcript} />{" "}
                  {/* props의 transcript 사용 */}
                  {newKeywords.length > 0 && ( // props의 newKeywords 사용
                    <div className="backdrop-blur-lg bg-blue-500/30 p-3 rounded-lg my-2 animate-pulse border border-blue-300">
                      <h2 className="text-base font-mono font-semibold text-shadow">
                        {" "}
                        감지된 키워드:{" "}
                      </h2>
                      <p className="text-sm font-mono font-bold">
                        {" "}
                        {newKeywords.join(", ")}{" "}
                      </p>
                    </div>
                  )}
                  {/* VolumeIndicator에 props의 volume 전달 */}
                  <VolumeIndicator volume={volume} />
                </div>
              )}
              {!listening &&
                audioErrorProp && ( // props의 listening 및 audioErrorProp 사용
                  <div className="text-red-400 text-sm font-mono p-2 bg-red-900/30 rounded">
                    오디오 오류: {audioErrorProp}
                  </div>
                )}
            </div>
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

        {/* 채팅 모달 (변경 없음) */}
        {isChatOpen && <ChatInterface onClose={closeChat} />}
      </>
    );
  }
);

VoiceTrackerUI.displayName = "VoiceTrackerUI";
export default VoiceTrackerUI;
