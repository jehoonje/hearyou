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
// import { Mic, MicOff } from "lucide-react"; // 더 이상 사용하지 않음
import MicToggleButton from "./MicToggleButton"; // *** 새로 만든 토글 버튼 임포트 ***

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

    // --- 에러 메시지 상태 업데이트 (변경 없음) ---
    useEffect(() => {
      setAudioErrorMessage(
        audioErrorProp ? `오디오 오류: ${audioErrorProp}` : null
      );
    }, [audioErrorProp]);

    // --- 매치 관련 useEffects (변경 없음) ---
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

    useEffect(() => {
      if (userEmail) {
        console.log(
          "Attempting match operations based on user presence (email check)"
        );
      } else {
        clearMatch();
      }
    }, [
      userEmail,
      fetchCurrentMatch,
      clearMatch,
      subscribeToMatchChanges,
      unsubscribeFromMatchChanges,
    ]);

    // --- UI 액션 함수들 (변경 없음) ---
    const openChat = useCallback(() => {
      /* ... 기존 코드 ... */
      if (currentMatch?.partner) {
        setActiveChatPartnerId(currentMatch.partner.userId);
        setIsChatOpen(true);
      } else {
        alert("현재 매칭된 상대가 없습니다.");
      }
    }, [currentMatch?.partner, setActiveChatPartnerId]);

    const closeChat = useCallback(() => {
      /* ... 기존 코드 ... */
      setActiveChatPartnerId(null);
      setIsChatOpen(false);
    }, [setActiveChatPartnerId]);

    const runManualMatchmaking = useCallback(async () => {
      /* ... 기존 코드 ... */
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
    }, [isMatchmakingRunning, user, fetchCurrentMatch]);

    const handleLogout = useCallback(() => {
      /* ... 기존 코드 ... */
      if (listening) {
        toggleListening();
      }
      clearMatch();
      onLogout();
    }, [clearMatch, onLogout, listening, toggleListening]);

    return (
      <>
        {/* 최상위 div: pointer-events-none 유지 또는 제거 후 테스트 */}
        <div className="absolute inset-0 flex flex-col w-full h-full pointer-events-none">
          {/* 알림 배너 */}
          <div className="absolute top-0 left-0 right-0 z-50 flex flex-col items-center space-y-1 pt-2">
            {/* 각 배너는 고유 key와 message가 있을 때만 렌더링되도록 개선 가능 */}
            <NotificationBanner
              key={`audio-${!!audioErrorMessage}`} // message 존재 여부로 key 변경
              message={audioErrorMessage}
              type="error"
              onDismiss={() => setMatchErrorMessage(null)}
            />
            <NotificationBanner
              key={`match-${!!matchError}`} // message 존재 여부로 key 변경
              message={matchError ? `매칭 오류: ${matchError}` : null} // Zustand 에러 사용
              type="error" // 매칭 오류는 error 타입으로
              onDismiss={() => setMatchErrorMessage(null)}
            />
            <NotificationBanner
              key={`noMatch-${!!noMatchMessage}`} // message 존재 여부로 key 변경
              message={noMatchMessage}
              type="warning"
              onDismiss={() => setMatchErrorMessage(null)}
            />
          </div>

          {/* 상단 영역: pointer-events-auto */}
          <div className="p-4 flex-shrink-0 pointer-events-auto">
            <div className="flex justify-between items-center mb-4">
              {/* 마이크 토글 */}
              <div className="flex items-center space-x-1">
                <MicToggleButton
                  listening={listening}
                  onClick={toggleListening}
                  disabled={!userEmail} // 이메일 없으면 비활성화
                />
              </div>
              {/* 액션 버튼들 */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={runManualMatchmaking}
                  disabled={isMatchmakingRunning || !userEmail} // 이메일 없어도 비활성화
                  className={`btn-aero-yellow ${
                    isMatchmakingRunning || !userEmail ? "disabled" : ""
                  }`}
                >
                  {isMatchmakingRunning ? "매칭중..." : "Match"}
                </button>
                {isMatchLoading && (
                  <span className="text-xs text-gray-400 animate-pulse"></span>
                )}
                {currentMatch && !isMatchLoading && (
                  <button
                    onClick={openChat}
                    className="btn-aero-green"
                  >
                    Chat
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="btn-aero-gray"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* 음성 관련 UI */}
            <div className="min-h-[100px]">
              {listening && (
                <div className="transition-opacity duration-300 ease-in-out opacity-100">
                  <TranscriptDisplay transcript={transcript} />
                  {newKeywords.length > 0 && (
                    <div className="backdrop-blur-lg bg-blue-500/30 p-3 rounded-lg my-2 animate-pulse border border-blue-300">
                      <h2 className="text-base font-mono font-semibold text-shadow">
                        감지된 키워드:
                      </h2>
                      <p className="text-sm font-mono font-bold">
                        {newKeywords.join(", ")}
                      </p>
                    </div>
                  )}
                  <VolumeIndicator volume={volume} />
                </div>
              )}
              {/* 오디오 오류 메시지 (녹음 중 아닐 때만 표시) */}
              {!listening && audioErrorProp && (
                 <div className="text-red-400 text-sm font-mono p-2 bg-red-900/30 rounded">
                   오디오 오류: {audioErrorProp}
                 </div>
               )}
               {/* 녹음 시작 안내 (오디오 오류 없을 때) */}
               {!listening && !audioErrorProp && userEmail && (
                 <div className="text-gray-400 text-sm font-mono p-2 bg-gray-800/30 rounded">
                   마이크 버튼을 눌러 시작하세요.
                 </div>
               )}
            </div>
          </div>

          {/* 중앙 여백 */}
          <div className="flex-grow pointer-events-none"></div> {/* 중앙 영역은 이벤트 통과 */}

          {/* 하단 영역: pointer-events-auto */}
          <div className="p-4 flex-shrink-0 pointer-events-auto">
             {/* KeywordList */}
             <div className="overflow-y-auto max-h-36 scrollbar-thin">
               <KeywordList keywordList={keywordList} />
             </div>
          </div>
        </div>

        {/* 채팅 모달 */}
        {isChatOpen && <ChatInterface onClose={closeChat} />}
      </>
    );
  }
);

VoiceTrackerUI.displayName = "VoiceTrackerUI";
export default VoiceTrackerUI;