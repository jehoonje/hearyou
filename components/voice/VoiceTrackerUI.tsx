"use client";

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
import { motion, AnimatePresence } from "framer-motion";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

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
    const [audioErrorMessage, setAudioErrorMessage] = useState<string | null>(
      null
    );
    const [matchErrorMessage, setMatchErrorMessage] = useState<string | null>(
      null
    );
    const [noMatchMessage, setNoMatchMessage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
      useState(false);
    const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
    const [deleteAccountError, setDeleteAccountError] = useState<string | null>(
      null
    );
    const [deleteConfirmText, setDeleteConfirmText] = useState(""); // 추가: 확인 텍스트

    const { user } = useAuth();
    const supabase = createClientComponentClient();

    useEffect(() => {
      setAudioErrorMessage(
        audioErrorProp ? `오디오 오류: ${audioErrorProp}` : null
      );
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
    }, [
      userEmail,
      fetchCurrentMatch,
      clearMatch,
      subscribeToMatchChanges,
      unsubscribeFromMatchChanges,
    ]);

    const hasMatchKeyword = keywordList.some(
      (keyword) => keyword.keyword === "매치"
    );

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
      if (listening) {
        toggleListening();
      }
      clearMatch();
      onLogout();
    }, [clearMatch, onLogout, listening, toggleListening]);

    const isMatchButtonDisabled =
      isMatchmakingRunning || !userEmail || !hasMatchKeyword;

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
      const email = "limjhoon8@gmail.com";
      const subject = encodeURIComponent("Univoice 피드백");
      const body = encodeURIComponent("Univoice에 대한 피드백을 작성해주세요.");
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      closeModal();
    }, []);

    // 회원 탈퇴 모달 열기/닫기
    const openDeleteAccountModal = useCallback(() => {
      setIsDeleteAccountModalOpen(true);
      setDeleteAccountError(null);
      closeModal(); // 도움말 모달 닫기
    }, []);

    const closeDeleteAccountModal = useCallback(() => {
      setIsDeleteAccountModalOpen(false);
      setDeleteAccountError(null);
    }, []);

    // 회원 탈퇴 처리 함수
    const handleDeleteAccount = useCallback(async () => {
      if (!user) return;
    
      // 확인 텍스트 검증
      if (deleteConfirmText !== '탈퇴하겠습니다') {
        setDeleteAccountError('확인 문구를 정확히 입력해주세요.');
        return;
      }
    
      setDeleteAccountLoading(true);
      setDeleteAccountError(null);
    
      try {
        // API Route 호출
        const response = await fetch('/api/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
    
        const data = await response.json();
    
        if (!response.ok) {
          throw new Error(data.error || '회원 탈퇴에 실패했습니다.');
        }
    
        // 성공 시 처리
        console.log('회원 탈퇴 성공:', data);
        
        // 로컬 스토리지 정리
        if (typeof window !== 'undefined') {
          localStorage.clear();
          sessionStorage.clear();
        }
    
        // 먼저 모달을 닫음
        closeDeleteAccountModal();
    
        // 성공 메시지 표시
        alert('회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.');
        
        // Supabase 클라이언트에서 로그아웃 (이미 서버에서 삭제되었으므로 에러 무시)
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.log('클라이언트 로그아웃 처리:', error);
        }
        
        // 로그아웃 핸들러 호출 (AuthContext의 상태를 업데이트)
        onLogout();
        
        // 약간의 딜레이 후 페이지 새로고침
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
    
      } catch (error: any) {
        console.error('회원 탈퇴 오류:', error);
        setDeleteAccountError(
          error.message || '회원 탈퇴 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        );
      } finally {
        setDeleteAccountLoading(false);
      }
    }, [user, deleteConfirmText, supabase, onLogout, closeDeleteAccountModal]);

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
              <div
                className="flex items-center space-x-1"
                data-tutorial-target="mic-button"
              >
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
                  className={`btn-aero-yellow ${
                    isMatchButtonDisabled ? "disabled" : ""
                  }`}
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
              onClick={closeModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white/20 w-full p-6 shadow-lg bottom-40"
                onClick={(e: any) => e.stopPropagation()}
              >
                <div className="flex flex-col space-y-4">
                  <button onClick={handleFeedback} className="btn-aero-yellow">
                    Email Feedback
                  </button>
                  <button
                    onClick={openBookmarkModal}
                    className="btn-aero-green"
                  >
                    Add Bookmark
                  </button>
                  <button
                    onClick={openDeleteAccountModal}
                    className="btn-aero-gray hover:bg-red-600 hover:border-red-600 transition-colors"
                  >
                    Delete Account
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
              onClick={closeBookmarkModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-effect p-6 shadow-lg max-w-sm w-full"
                onClick={(e: any) => e.stopPropagation()}
              >
                <h2 className="text-sm text-center font-mono font-semibold mb-4">
                  웹 이용 시 즐겨찾기 추가하는 방법
                </h2>
                <p className="text-sm font-mono text-gray-300 mb-4">
                  {navigator.userAgent.match(/Android|iPhone|iPad/i) ? (
                    <>
                      Univoice를 홈 화면에 추가하려면:
                      <br />
                      1. 브라우저 메뉴(⋮ 또는 공유 버튼)를 열고
                      <br />
                      2. <strong>"홈 화면에 추가"</strong>를 선택하세요.
                      <br />
                      이렇게 하면 앱처럼 바로 접근할 수 있습니다!
                    </>
                  ) : (
                    <>
                      Univoice를 즐겨찾기에 추가하려면:
                      <br />
                      1. 브라우저의 북마크 메뉴를 열거나
                      <br />
                      2. <strong>Ctrl+D</strong> (Windows) 또는{" "}
                      <strong>Cmd+D</strong> (Mac)를 누르세요.
                      <br />
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

        {/* 회원 탈퇴 확인 모달 */}
        <AnimatePresence>
          {isDeleteAccountModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
              onClick={closeDeleteAccountModal}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="glass-effect p-6 shadow-lg max-w-sm w-full"
                onClick={(e: any) => e.stopPropagation()}
              >
                <h2 className="text-lg text-center font-mono font-semibold mb-4 text-red-400">
                  회원 탈퇴
                </h2>

                <div className="text-sm font-mono text-gray-300 mb-4">
                  <p className="mb-2">회원 탈퇴 시 주의사항:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>모든 키워드 데이터가 삭제됩니다</li>
                    <li>모든 채팅 기록이 삭제됩니다</li>
                    <li>매칭 기록이 모두 삭제됩니다</li>
                    <li className="text-red-400 font-bold">
                      삭제된 데이터는 복구할 수 없습니다
                    </li>
                  </ul>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-mono text-gray-300 mb-2">
                    탈퇴를 원하시면 아래에{" "}
                    <span className="text-red-400 font-bold">
                      "탈퇴하겠습니다"
                    </span>
                    를 입력하세요:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="탈퇴하겠습니다"
                    className="w-full glass-effect px-3 py-2 text-black font-mono text-sm focus:outline-none focus:border-red-500"
                    disabled={deleteAccountLoading}
                  />
                </div>

                {deleteAccountError && (
                  <div className="mb-4 p-2 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm">
                    {deleteAccountError}
                  </div>
                )}

                <div className="flex space-x-2">
                  <button
                    onClick={closeDeleteAccountModal}
                    className="btn-aero-gray flex-1"
                    disabled={deleteAccountLoading}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="btn-aero-gray flex-1 bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      deleteAccountLoading ||
                      deleteConfirmText !== "탈퇴하겠습니다"
                    }
                  >
                    {deleteAccountLoading ? "처리중..." : "탈퇴하기"}
                  </button>
                </div>
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
