'use client';

import { memo, useState, useEffect, useCallback } from "react";
import { useMatchStore } from "../../store/matchStore";
import { useAuth } from "../../hooks/useAuth";
import ChatInterface from "../chat/ChatInterface";
import NotificationBanner from "../../components/NotificationBanner";
import VolumeIndicator from "./VolumeIndicator";
import TranscriptDisplay from "./TranscriptDisplay";
import KeywordList from "./KeywordList";
import { Keyword } from "../../types";
import MicToggleButton from "./MicToggleButton";
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceTrackerUIProps {
  volume: number;
  transcript: string | null;
  listening: boolean;
  newKeywords: string[];
  error: string | null;
  toggleListening: () => void;
  keywordList: Keyword[];
  userEmail: string;
  onLogout: () => void;
}

const VoiceTrackerUI = memo<VoiceTrackerUIProps>(
  ({
    volume,
    transcript,
    listening,
    newKeywords,
    error: audioErrorProp,
    toggleListening,
    keywordList,
    userEmail,
    onLogout,
  }) => {
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

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isMatchmakingRunning, setIsMatchmakingRunning] = useState(false);
    const [audioErrorMessage, setAudioErrorMessage] = useState<string | null>(null);
    const [matchErrorMessage, setMatchErrorMessage] = useState<string | null>(null);
    const [noMatchMessage, setNoMatchMessage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false); // 즐겨찾기 안내 모달 상태 추가

    const { user } = useAuth();

    useEffect(() => {
      setAudioErrorMessage(audioErrorProp ? `오디오 오류: ${audioErrorProp}` : null);
    }, [audioErrorProp]);

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
      if (!userEmail) {
        clearMatch();
      }
    }, [userEmail, fetchCurrentMatch, clearMatch, subscribeToMatchChanges, unsubscribeFromMatchChanges]);

    const hasMatchKeyword = keywordList.some(keyword => keyword.keyword === '매치');

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
      if (isMatchmakingRunning || !user) {
        alert("로그인이 필요하거나 이미 매칭을 시도 중입니다.");
        return;
      }
      setIsMatchmakingRunning(true);
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs");
      const supabaseClient = createClientComponentClient();
      try {
        const { data, error: invokeError } = await supabaseClient.functions.invoke("matchmaking", {
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
      if (listening) {
        toggleListening();
      }
      clearMatch();
      onLogout();
    }, [clearMatch, onLogout, listening, toggleListening]);

    const isMatchButtonDisabled = isMatchmakingRunning || !userEmail || !hasMatchKeyword;

    // 도움말 모달 열기/닫기
    const openModal = useCallback(() => {
      setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
      setIsModalOpen(false);
    }, []);

    // 즐겨찾기 안내 모달 열기/닫기
    const openBookmarkModal = useCallback(() => {
      setIsBookmarkModalOpen(true);
      closeModal(); // 도움말 모달 닫기
    }, []);

    const closeBookmarkModal = useCallback(() => {
      setIsBookmarkModalOpen(false);
    }, []);

    // 피드백 이메일 연결
    const handleFeedback = useCallback(() => {
      const email = 'limjhoon8@gmail.com';
      const subject = encodeURIComponent('Univoice 피드백');
      const body = encodeURIComponent('Univoice에 대한 피드백을 작성해주세요.');
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      closeModal();
    }, []);

    return (
      <>
        <div className="absolute inset-0 flex flex-col w-full h-full pointer-events-none">
          <div className="absolute top-0 left-0 right-0 z-50 flex flex-col items-center space-y-1 pt-2">
            <NotificationBanner
              key={`audio-${!!audioErrorMessage}`}
              message={audioErrorMessage}
              type="error"
              onDismiss={() => setMatchErrorMessage(null)}
            />
            <NotificationBanner
              key={`match-${!!matchError}`}
              message={matchError ? `${matchError}` : null}
              type="warning"
              onDismiss={() => setMatchErrorMessage(null)}
            />
            <NotificationBanner
              key={`noMatch-${!!noMatchMessage}`}
              message={noMatchMessage}
              type="warning"
              onDismiss={() => setMatchErrorMessage(null)}
            />
          </div>

          <div className="p-4 flex-shrink-0 pointer-events-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-1" data-tutorial-target="mic-button">
                <MicToggleButton
                  listening={listening}
                  onClick={toggleListening}
                  disabled={!userEmail}
                />
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={runManualMatchmaking}
                  disabled={isMatchButtonDisabled}
                  data-tutorial-target="match-button-area"
                  className={`btn-aero-yellow ${isMatchButtonDisabled ? "disabled" : ""}`}
                >
                  {isMatchmakingRunning ? "매칭중..." : "Match"}
                </button>
                {isMatchLoading && (
                  <span className="text-xs text-gray-400 animate-pulse"></span>
                )}
                {currentMatch && !isMatchLoading && (
                  <button onClick={openChat} className="btn-aero-green">
                    Chat
                  </button>
                )}
                <button onClick={handleLogout} className="btn-aero-gray">
                  Sign Out
                </button>
              </div>
            </div>

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
              {!listening && audioErrorProp && (
                <div className="text-red-400 text-sm font-mono p-2 bg-red-900/30 rounded">
                  오디오 오류: {audioErrorProp}
                </div>
              )}
              {!listening && !audioErrorProp && userEmail && (
                <div className="text-gray-400 text-sm font-mono p-2 bg-gray-800/30 rounded">
                  마이크 버튼을 눌러 시작하세요.
                </div>
              )}
            </div>
          </div>

          <div className="flex-grow pointer-events-none"></div>

          <div className="p-4 flex-shrink-0 pointer-events-auto">
            <div className="flex justify-end mb-1">
              <button
                onClick={openModal}
                className="btn-aero-gray w-8 h-8 flex items-center justify-center"
                aria-label="도움말"
              >
                ?
              </button>
            </div>
            <div className="overflow-y-auto max-h-36 scrollbar-thin">
              <KeywordList keywordList={keywordList} />
            </div>
          </div>
        </div>

        {isChatOpen && <ChatInterface onClose={closeChat} />}

        {/* 도움말 모달 */}
        <AnimatePresence>
          {isModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed bottom-40 inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-800 p-6 rounded-lg shadow-lg bottom-40"
                onClick={(e:any) => e.stopPropagation()}
              >
                <div className="flex flex-col space-y-4">
                  <button
                    onClick={handleFeedback}
                    className="btn-aero-yellow"
                  >
                    Email Feedback
                  </button>
                  <button
                    onClick={openBookmarkModal}
                    className="btn-aero-green"
                  >
                    Add Bookmark
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 즐겨찾기 안내 모달 */}
        <AnimatePresence>
          {isBookmarkModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed bottom-40 inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
              onClick={closeBookmarkModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm w-full"
                onClick={(e:any) => e.stopPropagation()}
              >
                <h2 className="text-lg font-mono font-semibold mb-4">즐겨찾기 추가</h2>
                <p className="text-sm font-mono text-gray-300 mb-4">
                  {navigator.userAgent.match(/Android|iPhone|iPad/i) ? (
                    <>
                      Univoice를 홈 화면에 추가하려면:<br />
                      1. 브라우저 메뉴(⋮ 또는 공유 버튼)를 열고<br />
                      2. <strong>"홈 화면에 추가"</strong>를 선택하세요.<br />
                      이렇게 하면 앱처럼 바로 접근할 수 있습니다!
                    </>
                  ) : (
                    <>
                      Univoice를 즐겨찾기에 추가하려면:<br />
                      1. 브라우저의 북마크 메뉴를 열거나<br />
                      2. <strong>Ctrl+D</strong> (Windows) 또는 <strong>Cmd+D</strong> (Mac)를 누르세요.<br />
                      즐겨찾기 폴더에 저장해 쉽게 방문하세요!
                    </>
                  )}
                </p>
                <button
                  onClick={closeBookmarkModal}
                  className="btn-aero-gray w-full"
                >
                  닫기
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }
);

VoiceTrackerUI.displayName = "VoiceTrackerUI";
export default VoiceTrackerUI;