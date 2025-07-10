// src/components/chat/ChatInterface.tsx

import { memo, useEffect, useRef, useState, useCallback } from "react";
import { useChatStore } from "../../store/chatStore";
import { useMatchStore } from "../../store/matchStore";
import { useAuth } from "../../hooks/useAuth";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  MoreVertical,
  Flag,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useLanguage } from "../../app/contexts/LanguageContext";

interface ChatInterfaceProps {
  onClose: () => void;
}

const ChatInterface = memo<ChatInterfaceProps>(({ onClose }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    matchedUserProfile,
    matchStatusMessage,
    activeChatPartnerId,
    currentMatch,
  } = useMatchStore();
  const { messages, subscribeToChatMessages, unsubscribeFromChatMessages } =
    useChatStore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [blockSubscription, setBlockSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 키보드 상태 관리를 위한 state 추가
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const supabase = createClientComponentClient();
  const chatPartnerId = activeChatPartnerId;

  // 차단된 사용자 목록 불러오기
  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("blocked_users")
      .select("blocked_user_id")
      .eq("user_id", user.id);

    if (data) {
      setBlockedUsers(data.map((item) => item.blocked_user_id));
    }
  }, [user, supabase]);

  // 🆕 읽음 상태 즉시 전파 함수 추가
const notifyReadStatusToPartner = useCallback(async (messageIds: string[]) => {
  if (!user || !chatPartnerId || messageIds.length === 0) return;
  
  try {
    console.log('[ChatInterface] 📤 상대방에게 읽음 상태 즉시 전파:', messageIds.length, '개');
    
    // 현재 채팅 채널로 읽음 상태 즉시 브로드캐스트
    const chatChannel = useChatStore.getState().chatChannel;
    if (chatChannel) {
      await chatChannel.send({
        type: 'broadcast',
        event: 'messages_read',
        payload: {
          readByUserId: user.id,
          messageIds: messageIds,
          timestamp: new Date().toISOString()
        }
      });
      console.log('[ChatInterface] ✅ 읽음 상태 브로드캐스트 전송 완료');
    }
  } catch (error) {
    console.error('[ChatInterface] ❌ 읽음 상태 브로드캐스트 실패:', error);
  }
}, [user?.id, chatPartnerId]);

  useEffect(() => {
    if (!user) return;

    loadBlockedUsers();

    const subscription = supabase
      .channel(`blocked_users_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "blocked_users",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newBlockedUserId = payload.new.blocked_user_id;
            setBlockedUsers((prev) => [...prev, newBlockedUserId]);
          } else if (payload.eventType === "DELETE") {
            const unblockedUserId = payload.old.blocked_user_id;
            setBlockedUsers((prev) =>
              prev.filter((id) => id !== unblockedUserId)
            );
          }
        }
      )
      .subscribe();

    setBlockSubscription(subscription);

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user?.id, supabase, loadBlockedUsers]);

  // Mount/Unmount 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // 키보드 및 viewport 감지를 위한 useEffect
  useEffect(() => {
    const initialViewportHeight = window.innerHeight;
    setViewportHeight(initialViewportHeight);

    const handleResize = () => {
      const currentViewportHeight =
        window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentViewportHeight;

      // 키보드가 열렸는지 판단 (높이 차이가 150px 이상이면 키보드로 간주)
      const keyboardIsOpen = heightDifference > 150;

      setViewportHeight(currentViewportHeight);
      setKeyboardHeight(keyboardIsOpen ? heightDifference : 0);
      setIsKeyboardOpen(keyboardIsOpen);

      // 키보드가 열렸을 때 메시지 끝으로 스크롤
      if (keyboardIsOpen) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };

    // visualViewport API 사용 (모던 브라우저)
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      return () => {
        window.visualViewport?.removeEventListener("resize", handleResize);
      };
    } else {
      // 폴백: window resize 이벤트 사용
      window.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }
  }, []);

  const handleClose = useCallback(() => {
    setShow(false);
    setTimeout(() => {
      onClose();
    }, 1000);
  }, [onClose]);

  // 채팅 구독 관리 (안정화)
  useEffect(() => {
    console.log('[ChatInterface] 채팅 구독 useEffect 실행', {
      user: !!user,
      chatPartnerId,
      matchDate: currentMatch?.matchDate,
      blockedUsersCount: blockedUsers.length,
      show
    });

    // 필수 조건 체크
    if (!user || !chatPartnerId || !currentMatch?.matchDate || !show) {
      console.log('[ChatInterface] 채팅 구독 조건 미충족, 구독 해제');
      unsubscribeFromChatMessages();
      return;
    }

    // 차단된 사용자 체크
    if (blockedUsers.includes(chatPartnerId)) {
      console.log('[ChatInterface] 차단된 사용자, 구독 해제');
      unsubscribeFromChatMessages();
      return;
    }

    console.log('[ChatInterface] 채팅 구독 시작');
    subscribeToChatMessages(user, chatPartnerId, currentMatch.matchDate);

    // 클린업
    return () => {
      console.log('[ChatInterface] 채팅 구독 클린업');
      unsubscribeFromChatMessages();
    };
  }, [
    user?.id, // user 객체 대신 user.id만 의존성으로
    chatPartnerId,
    currentMatch?.matchDate,
    show,
    blockedUsers.join(',') // 배열을 문자열로 변환하여 안정적인 비교
  ]);

  const toggleMenu = useCallback(() => {
    setShowMenu(!showMenu);
  }, [showMenu]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMenu && !(e.target as HTMLElement).closest(".menu-container")) {
        setShowMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showMenu]);

  // 신고 제출
  const handleReport = useCallback(async () => {
    if (!user || !chatPartnerId || !reportReason) return;

    if (user.id === chatPartnerId) {
      alert(t.chat.alert.selfReport);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: existingReports, error: checkError } = await supabase
        .from("reports")
        .select("id")
        .eq("reporter_id", user.id)
        .eq("reported_user_id", chatPartnerId)
        .eq("report_type", "user");

      if (checkError) {
        console.error("중복 신고 확인 오류:", checkError);
      } else if (existingReports && existingReports.length > 0) {
        alert(t.chat.alert.alreadyReportedUser);
        setShowReportModal(false);
        return;
      }

      const reportData = {
        reporter_id: user.id,
        reported_user_id: chatPartnerId,
        report_type: "user" as const,
        reason: reportReason,
        description: reportDescription || null,
        status: "pending" as const,
      };

      const { error } = await supabase.from("reports").insert(reportData);

      if (error) {
        console.error("Supabase 사용자 신고 오류:", error);
        if (error.code === "42501") {
          alert(t.chat.alert.permissionError);
        } else if (error.code === "23505") {
          alert(t.chat.alert.alreadyReportedUser);
        } else {
          alert(t.chat.alert.reportError.replace("{message}", error.message));
        }
        return;
      }

      alert(t.chat.alert.reportSuccess);
      setShowReportModal(false);
      setReportReason("");
      setReportDescription("");
    } catch (error) {
      console.error("사용자 신고 예외:", error);
      alert(t.chat.alert.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, chatPartnerId, reportReason, reportDescription, supabase, t]);

  // 사용자 차단
  const handleBlock = useCallback(async () => {
    if (!user || !chatPartnerId) return;

    if (user.id === chatPartnerId) {
      alert(t.chat.alert.selfBlock);
      return;
    }

    setIsSubmitting(true);
    try {
      if (blockedUsers.includes(chatPartnerId)) {
        alert(t.chat.alert.alreadyBlocked);
        setShowBlockModal(false);
        return;
      }

      const { error } = await supabase
        .from("blocked_users")
        .insert({ user_id: user.id, blocked_user_id: chatPartnerId });

      if (error) {
        console.error("Supabase 차단 오류:", error);
        if (error.code === "42501") {
          alert(t.chat.alert.permissionError);
        } else if (error.code === "23505") {
          alert(t.chat.alert.alreadyBlocked);
        } else {
          alert(t.chat.alert.blockError.replace("{message}", error.message));
        }
        return;
      }

      alert(t.chat.alert.blockSuccess);
      setShowBlockModal(false);
      handleClose();
    } catch (error) {
      console.error("차단 예외:", error);
      alert(t.chat.alert.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, chatPartnerId, blockedUsers, supabase, handleClose, t]);

  const isChatInvalid =
    !!matchStatusMessage || blockedUsers.includes(chatPartnerId || "");
  const partnerName = matchedUserProfile?.username || t.chat.partner;

  // 채팅창이 열릴 때 배지 제거
  useEffect(() => {
    if (show && window.ReactNativeWebView) {
      // 네이티브 앱에서 실행 중일 때 배지 제거
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "CLEAR_BADGE",
        })
      );
    }
  }, [show]);

  // 메시지 읽음 처리 (간소화)
  useEffect(() => {
    if (!user || !show || isChatInvalid || messages.length === 0) return;
  
    const unreadMessages = messages.filter(
      msg => msg.receiver_id === user.id && !msg.is_read
    );
    
    if (unreadMessages.length === 0) return;
  
    const unreadIds = unreadMessages.map(msg => msg.id);
    console.log('[ChatInterface] 📖 읽지 않은 메시지 읽음 처리:', unreadIds.length, '개');
    
    const timer = setTimeout(async () => {
      try {
        // 1. DB에 읽음 상태 저장
        await useChatStore.getState().markMessagesAsRead(unreadIds, user.id);
        
        // 2. 즉시 상대방에게 읽음 상태 전파
        await notifyReadStatusToPartner(unreadIds);
        
        console.log('[ChatInterface] ✅ 읽음 처리 및 전파 완료');
      } catch (error) {
        console.error('[ChatInterface] ❌ 메시지 읽음 처리 실패:', error);
      }
    }, 300);
  
    return () => clearTimeout(timer);
  }, [messages, user?.id, show, isChatInvalid, notifyReadStatusToPartner]);

  // 디바운싱된 읽음 상태 체크 (메시지 변경 시)
  useEffect(() => {
    if (!user || !show || isChatInvalid) return;

    console.log("[ChatInterface] 메시지 변경 감지 - 읽음 상태 체크 예약");

    // 디바운싱: 1초 내에 연속된 메시지 변경이 있으면 마지막 것만 실행
    const debouncedRefresh = setTimeout(() => {
      console.log("[ChatInterface] 디바운싱된 읽음 상태 체크 실행");
      useChatStore.getState().refreshReadStatus();
    }, 1000);

    return () => clearTimeout(debouncedRefresh);
  }, [messages.length, user?.id, show, isChatInvalid]);

  // 주기적 읽음 상태 체크 (최소화)
  useEffect(() => {
    if (!user || !show || isChatInvalid) return;

    console.log('[ChatInterface] 주기적 읽음 상태 체크 설정');

    // 초기 체크 (3초 후)
    const initialTimer = setTimeout(() => {
      console.log('[ChatInterface] 초기 읽음 상태 체크');
      useChatStore.getState().refreshReadStatus();
    }, 3000);

    // 주기적 체크 (15초마다)
    // const interval = setInterval(() => {
    //   console.log('[ChatInterface] 주기적 읽음 상태 체크');
    //   useChatStore.getState().refreshReadStatus();
    // }, 15000);

    return () => {
      clearTimeout(initialTimer);
      // clearInterval(interval);
    };
  }, [user?.id, show, isChatInvalid]);

  // 채팅창 포커스 관리
  useEffect(() => {
    if (!show) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[ChatInterface] 앱 포커스 복귀 - 읽음 상태 체크');
        setTimeout(() => {
          useChatStore.getState().refreshReadStatus();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [show]);

  // 스크롤 관리 (분리)
  useEffect(() => {
    if (show && messages.length > 0) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, show]);

  return (
    <div
      className={`fixed inset-0 bg-black/40 z-50 pointer-events-auto backdrop-blur-sm transition-opacity duration-1000 ease-in-out ${
        show ? "opacity-100" : "opacity-0"
      }`}
      style={{
        display: "flex",
        alignItems: isKeyboardOpen ? "flex-start" : "center",
        justifyContent: "center",
        paddingTop: isKeyboardOpen ? "20px" : "0",
      }}
    >
      <div
        ref={chatContainerRef}
        className={`
          w-[375px] max-w-md flex flex-col overflow-hidden
          rounded-xl shadow-2xl shadow-black/40 bg-transparent
          backdrop-filter backdrop-blur-lg -webkit-backdrop-filter backdrop-blur-lg
          border border-white/20
          transition-all duration-300 ease-in-out
          ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        `}
        style={{
          height: isKeyboardOpen ? `${viewportHeight - 40}px` : "648px",
          maxHeight: isKeyboardOpen ? `${viewportHeight - 40}px` : "648px",
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center flex-shrink-0">
          <button
            onClick={handleClose}
            className="text-gray-300 hover:text-white hover:bg-white/10 w-8 h-8 flex items-center justify-center rounded-full text-xl font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 mr-3"
            aria-label={t.common.back}
            title={t.common.back}
          >
            <ChevronLeft size={20} />
          </button>

          <h2
            className={`flex-1 text-lg font-semibold text-white font-mono transition-colors ${
              isChatInvalid ? "text-gray-400" : "text-shadow"
            }`}
          >
            {isChatInvalid
              ? t.chat.headerStatusChanged
              : t.chat.headerTitle.replace("{name}", partnerName)}
          </h2>

          {!isChatInvalid && (
            <div className="relative menu-container">
              <button
                onClick={toggleMenu}
                className="text-gray-300 hover:text-white hover:bg-white/10 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                aria-label={t.chat.menuTooltip}
              >
                <MoreVertical size={20} />
              </button>

              {showMenu && (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute right-[-14px] top-12 w-48 bg-gray-800/50 backdrop-blur-md shadow-lg border border-white/10 overflow-hidden z-10"
                  >
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowReportModal(true);
                      }}
                      className="w-full px-4 py-3 text-left text-yellow-400 hover:bg-white/10 flex items-center gap-3 transition-colors"
                    >
                      <Flag size={16} />
                      <span>{t.chat.reportUser}</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowBlockModal(true);
                      }}
                      className="w-full px-4 py-3 text-left text-red-400 hover:bg-white/10 flex items-center gap-3 transition-colors"
                    >
                      <Ban size={16} />
                      <span>{t.chat.blockUser}</span>
                    </button>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="relative flex-grow overflow-hidden min-h-0">
          <div
            className={`absolute inset-0 p-4 overflow-y-auto scrollbar-thin transition-opacity duration-300 ${
              isChatInvalid ? "opacity-30 filter blur-[2px]" : "opacity-100"
            }`}
            style={{
              paddingBottom: isKeyboardOpen ? "20px" : "16px",
            }}
          >
            {messages.length === 0 && !isChatInvalid && (
              <div className="text-center text-gray-400/60 text-sm mt-8">
                {t.chat.firstMessagePrompt}
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isSender={msg.sender_id === user?.id}
                senderProfile={
                  msg.sender_id === chatPartnerId ? matchedUserProfile : null
                }
              />
            ))}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {isChatInvalid && (
            <div className="absolute inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center p-6 z-20">
              <div className="text-center p-6 rounded-lg shadow-xl backdrop-blur-md">
                <p className="text-yellow-300 font-semibold text-lg">
                  {blockedUsers.includes(chatPartnerId || "")
                    ? t.chat.blockedUserMessage
                    : matchStatusMessage}
                </p>
                <p className="text-gray-300/90 text-sm mt-3">
                  {t.chat.closeChatInfo}
                </p>
                <button
                  onClick={handleClose}
                  className="mt-5 px-6 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div
          className={`flex-shrink-0 border-t border-white/10 ${
            isChatInvalid ? "opacity-50" : ""
          }`}
          style={{
            paddingBottom: isKeyboardOpen
              ? "env(safe-area-inset-bottom, 0px)"
              : "0px",
          }}
        >
          <ChatInput isDisabled={isChatInvalid} />
        </div>
      </div>

      {/* 신고 모달 */}
      {showReportModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
        >
          <div className="bg-gray-900/20 backdrop-blur-md rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="text-yellow-500" size={24} />
              <h3 className="text-lg font-semibold text-white">
                {t.chat.reportModalTitle}
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  {t.chat.reportReasonLabel}
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-gray-800/50 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="">{t.chat.reportReasons.select}</option>
                  <option value="inappropriate_content">
                    {t.chat.reportReasons.inappropriateContent}
                  </option>
                  <option value="harassment">
                    {t.chat.reportReasons.harassment}
                  </option>
                  <option value="spam">{t.chat.reportReasons.spam}</option>
                  <option value="impersonation">
                    {t.chat.reportReasons.impersonation}
                  </option>
                  <option value="other">{t.chat.reportReasons.other}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  {t.chat.reportDescriptionLabel}
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  className="w-full bg-gray-800/50 text-white border border-gray-700 rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:border-blue-500"
                  placeholder={t.chat.reportPlaceholder}
                />
              </div>
              <div className="text-xs text-gray-400">{t.chat.reportNotice}</div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportReason("");
                    setReportDescription("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={isSubmitting}
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleReport}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  disabled={!reportReason || isSubmitting}
                >
                  {isSubmitting ? t.chat.submitting : t.chat.reportUser}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 차단 확인 모달 */}
      {showBlockModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
        >
          <div className="bg-gray-900/20 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <Ban className="text-red-500" size={24} />
              <h3 className="text-lg font-semibold text-white">
                {t.chat.blockModalTitle}
              </h3>
            </div>

            <p className="text-gray-300 mb-6">
              {t.chat.blockConfirm.replace("{name}", partnerName)}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleBlock}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? t.chat.processing : t.chat.blockUser}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
export default ChatInterface;