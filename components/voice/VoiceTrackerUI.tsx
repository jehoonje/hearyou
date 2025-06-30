"use client";

import { memo, useState, useEffect, useCallback } from "react";
import { useMatchStore } from "../../store/matchStore";
import { useAuth } from "../../app/contexts/AuthContext";
import { useLanguage } from "../../app/contexts/LanguageContext";
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

    const { user, isDemoUser } = useAuth();
    const { t, language } = useLanguage();

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

    const supabase = createClientComponentClient();
    const deleteConfirmationText =
      language === "ko" ? "탈퇴하겠습니다" : "DELETE MY ACCOUNT";

    useEffect(() => {
      setAudioErrorMessage(
        audioErrorProp ? `${t.voice.audioError} ${audioErrorProp}` : null
      );
    }, [audioErrorProp, t.voice.audioError]);

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
        alert(
          language === "ko"
            ? "현재 매칭된 상대가 없습니다."
            : "No current match found."
        );
      }
    }, [currentMatch?.partner, setActiveChatPartnerId, language]);

    const closeChat = useCallback(() => {
      setActiveChatPartnerId(null);
      setIsChatOpen(false);
    }, [setActiveChatPartnerId]);

    const runManualMatchmaking = useCallback(async () => {
      if (isMatchmakingRunning || !user) {
        alert(
          language === "ko"
            ? "로그인이 필요하거나 이미 매칭을 시도 중입니다."
            : "Login required or matchmaking already in progress."
        );
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
        alert(
          language === "ko"
            ? `매치메이킹 성공: ${data.message || "완료"}`
            : `Matchmaking success: ${data.message || "Complete"}`
        );
        if (user) {
          fetchCurrentMatch(user);
        }
      } catch (err: any) {
        alert(
          language === "ko"
            ? `매치메이킹 실패: ${err.message || "알 수 없는 오류"}`
            : `Matchmaking failed: ${err.message || "Unknown error"}`
        );
        console.error("매치메이킹 함수 호출 오류:", err);
      } finally {
        setIsMatchmakingRunning(false);
      }
    }, [isMatchmakingRunning, user, fetchCurrentMatch, language]);

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
      const subject = encodeURIComponent(
        language === "ko" ? "Univoice 피드백" : "Univoice Feedback"
      );
      const body = encodeURIComponent(
        language === "ko"
          ? "Univoice에 대한 피드백을 작성해주세요."
          : "Please write your feedback about Univoice."
      );
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
      closeModal();
    }, [closeModal, language]);

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
      if (deleteConfirmText !== deleteConfirmationText) {
        setDeleteAccountError(
          language === "ko"
            ? "확인 문구를 정확히 입력해주세요."
            : "Please enter the confirmation text correctly."
        );
        return;
      }

      setDeleteAccountLoading(true);
      setDeleteAccountError(null);

      try {
        // API Route 호출
        const response = await fetch("/api/delete-account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              (language === "ko"
                ? "회원 탈퇴에 실패했습니다."
                : "Account deletion failed.")
          );
        }

        // 성공 시 처리
        console.log("회원 탈퇴 성공:", data);

        // 로컬 스토리지 정리
        if (typeof window !== "undefined") {
          localStorage.clear();
          sessionStorage.clear();
        }

        // 먼저 모달을 닫음
        closeDeleteAccountModal();

        // 성공 메시지 표시
        alert(t.modal.deleteAccountSuccess);

        // Supabase 클라이언트에서 로그아웃 (이미 서버에서 삭제되었으므로 에러 무시)
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.log("클라이언트 로그아웃 처리:", error);
        }

        // 로그아웃 핸들러 호출 (AuthContext의 상태를 업데이트)
        onLogout();

        // 약간의 딜레이 후 페이지 새로고침
        setTimeout(() => {
          window.location.href = "/";
        }, 100);
      } catch (error: any) {
        console.error("회원 탈퇴 오류:", error);
        setDeleteAccountError(
          error.message ||
            (language === "ko"
              ? "회원 탈퇴 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
              : "An error occurred during account deletion. Please try again later.")
        );
      } finally {
        setDeleteAccountLoading(false);
      }
    }, [
      user,
      deleteConfirmText,
      deleteConfirmationText,
      supabase,
      onLogout,
      closeDeleteAccountModal,
      language,
      t.modal.deleteAccountSuccess,
    ]);

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
                {!isDemoUser && (
                  <>
                    <button
                      onClick={runManualMatchmaking}
                      className={`btn-aero-yellow ${
                        isMatchButtonDisabled ? "" : ""
                      }`}
                    >
                      {isMatchmakingRunning ? t.voice.matching : t.common.match}
                    </button>
                    {currentMatch && !isMatchLoading && (
                      <button onClick={openChat} className="btn-aero-green">
                        {t.common.chat}
                      </button>
                    )}
                  </>
                )}

                <button onClick={handleLogout} className="btn-aero-gray">
                  {isDemoUser ? t.common.mainPage : t.common.signOut}
                </button>
              </div>
            </div>

            {/* 데모 사용자 안내 메시지 */}
            {isDemoUser && (
              <div className="mb-2 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-200 text-xs font-mono">
                {t.voice.demoModeNotice}
              </div>
            )}

            <div className="min-h-[100px]">
              {listening && (
                <div className="transition-opacity duration-300 ease-in-out opacity-100">
                  <TranscriptDisplay transcript={transcript} />
                  {newKeywords.length > 0 && (
                    <div className="backdrop-blur-lg bg-blue-500/30 p-3 rounded-lg my-2 animate-pulse border border-blue-300">
                      <h2 className="text-base font-mono font-semibold text-shadow">
                        {t.voice.detectedKeywords}
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
                  {t.voice.audioError} {audioErrorProp}
                </div>
              )}
              {!listening && !audioErrorProp && userEmail && (
                <div className="text-gray-400 text-sm font-mono p-2 bg-gray-800/20 rounded">
                  {t.voice.speakInstruction}
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
                aria-label={t.common.help}
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
                    {t.common.feedback}
                  </button>
                  <button
                    onClick={openBookmarkModal}
                    className="btn-aero-green"
                  >
                    {t.common.bookmark}
                  </button>
                  {!isDemoUser && (
                    <button
                      onClick={openDeleteAccountModal}
                      className="btn-aero-gray hover:bg-red-600 hover:border-red-600 transition-colors"
                    >
                      {t.modal.deleteAccountTitle}
                    </button>
                  )}
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
                className="bg-white/80 p-6 shadow-lg w-full"
                onClick={(e: any) => e.stopPropagation()}
              >
                <h2 className="text-sm text-black text-center font-mono font-semibold mb-4">
                  {t.bookmark.title}
                </h2>
                <p className="text-sm font-mono text-black mb-4">
                  {navigator.userAgent.match(/Android|iPhone|iPad/i)
                    ? t.bookmark.mobileInstructions
                        .split("\n")
                        .map((line, i) => (
                          <span key={i}>
                            {line}
                            <br />
                          </span>
                        ))
                    : t.bookmark.desktopInstructions
                        .split("\n")
                        .map((line, i) => (
                          <span key={i}>
                            {line}
                            <br />
                          </span>
                        ))}
                </p>
                <button
                  onClick={closeBookmarkModal}
                  className="btn-aero-gray w-full"
                >
                  {t.common.close}
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
                className="bg-white/80 p-6 shadow-lg w-full"
                onClick={(e: any) => e.stopPropagation()}
              >
                {/* <h2 className="text-lg text-center font-mono font-semibold mb-4 text-red-400">
                  회원 탈퇴
                </h2> */}

                <div className="text-sm font-mono text-black mb-4">
                  <p className="mb-2">{t.modal.deleteAccountWarning}</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>{t.modal.deleteAccountWarnings.keywords}</li>
                    <li>{t.modal.deleteAccountWarnings.chats}</li>
                    <li>{t.modal.deleteAccountWarnings.matches}</li>
                    <li className="text-red-400 font-bold">
                      {t.modal.deleteAccountWarnings.irreversible}
                    </li>
                  </ul>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-mono text-black mb-2">
                    {t.modal.deleteAccountConfirm}
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
                    className="btn-aero-yellow text-black flex-1"
                    disabled={deleteAccountLoading}
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="btn-aero-gray flex-1 bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={
                      deleteAccountLoading ||
                      deleteConfirmText !== deleteConfirmationText
                    }
                  >
                    {deleteAccountLoading ? t.modal.deleteAccountProcessing : t.modal.deleteAccountButton}
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
