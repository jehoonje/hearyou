// src/components/chat/ChatInput.tsx
import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuth } from '../../hooks/useAuth';
import { useMatchStore } from '../../store/matchStore';
import { ArrowUp } from 'lucide-react'; // Send 아이콘 임포트

interface ChatInputProps {
  isDisabled?: boolean;
}

const ChatInput = memo<ChatInputProps>(({ isDisabled = false }) => {
  const { user } = useAuth();
  const { activeChatPartnerId, currentMatch } = useMatchStore();
  const { currentMessage, setCurrentMessage, sendMessage, isSending, error: chatError } = useChatStore();
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 모바일 줌 방지를 위한 useEffect
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0');
    }
    
    // 컴포넌트 언마운트 시 원래대로 복구
    return () => {
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
      }
    };
  }, []);

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (isDisabled || !currentMessage.trim() || !activeChatPartnerId || !currentMatch?.matchDate || !user) {
      console.warn("메시지 전송 조건 미충족");
      return;
    }

    try {
      await sendMessage(user, activeChatPartnerId, currentMatch.matchDate);
      
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      console.error("메시지 전송 중 오류 발생:", error);
    }
  }, [
    isDisabled,
    currentMessage,
    user,
    activeChatPartnerId,
    currentMatch?.matchDate,
    sendMessage,
  ]);

  const isSendDisabled = isSending || !currentMessage.trim() || isDisabled || !activeChatPartnerId;
  const showSendButton = currentMessage.trim().length > 0; // 메시지가 있을 때만 버튼 표시

  return (
    <form onSubmit={handleSend} className="p-3 bg-black/10">
      {chatError && !isDisabled && (
        <p className="text-red-400 text-xs mb-2 px-1">{chatError}</p>
      )}
      
      <div className="flex items-center gap-2">
        {/* Apple 스타일 입력 필드 - 내부에 send 버튼 포함 */}
        <div className="flex-1 relative flex items-center bg-[#222] backdrop-filter backdrop-blur-sm -webkit-backdrop-filter backdrop-blur-sm border border-black/20 border-t-white/10 rounded-full px-1 py-1">
          <input
            ref={inputRef}
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder={isDisabled ? "대화 상태가 변경되었습니다." : "type message..."}
            className="
              flex-1 bg-transparent text-white placeholder-gray-400/70
              px-3 py-1.5 text-sm
              focus:outline-none
              transition-all duration-150
            "
            disabled={isSending || isDisabled || !activeChatPartnerId}
            aria-label="메시지 입력"
            style={{ fontSize: '16px' }} // iOS 줌 방지를 위해 16px 고정
          />
          
          {/* Apple 스타일 전송 버튼 - 입력 필드 내부, 메시지가 있을 때만 표시 */}
          {showSendButton && (
            <button
              type="submit"
              disabled={isSendDisabled}
              className={`
                w-7 h-7 rounded-full flex items-center justify-center mr-1
                transition-all duration-150 ease-in-out
                ${isSendDisabled
                  ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                  : 'bg-[#007AFF] hover:bg-[#0051D5] active:scale-95'
                }
              `}
              aria-label="메시지 전송"
            >
              <ArrowUp size={18} className="text-white" />
            </button>
          )}
        </div>
      </div>
    </form>
  );
});

ChatInput.displayName = 'ChatInput';
export default ChatInput;