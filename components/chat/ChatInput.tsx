// src/components/chat/ChatInput.tsx
import { memo, useState, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuth } from '../../hooks/useAuth';
import { useMatchStore } from '../../store/matchStore';

interface ChatInputProps {
  isDisabled?: boolean;
}

const ChatInput = memo<ChatInputProps>(({ isDisabled = false }) => {
  const { user } = useAuth();
  const { activeChatPartnerId, currentMatch } = useMatchStore();
  const { currentMessage, setCurrentMessage, sendMessage, isSending, error: chatError } = useChatStore();

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isDisabled || !currentMessage.trim() || !activeChatPartnerId || !currentMatch?.matchDate) return;
    await sendMessage(user, activeChatPartnerId, currentMatch.matchDate);
  }, [isDisabled, currentMessage, user, activeChatPartnerId, currentMatch?.matchDate, sendMessage]);

  const isSendDisabled = isSending || !currentMessage.trim() || isDisabled || !activeChatPartnerId;

  return (
    // --- 입력 영역 컨테이너 ---
    <form onSubmit={handleSend} className="p-3 bg-black/10">
      {chatError && !isDisabled && <p className="text-red-400 text-xs mb-2 px-1">{chatError}</p>}
      {/* --- 입력 필드 + 버튼 래퍼: Aero 스타일 --- */}
      <div
        className="
          flex items-center rounded-lg px-1 py-1
          bg-gray-800/70 backdrop-filter backdrop-blur-sm -webkit-backdrop-filter backdrop-blur-sm
          border border-black/20 border-t-white/10 /* 안쪽 테두리 */
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.4) /* 내부 그림자 (눌린 효과) */
        "
      >
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder={isDisabled ? "대화 상태가 변경되었습니다." : "메시지를 입력하세요..."}
          className="
            flex-grow bg-transparent text-white placeholder-gray-400/70
            focus:outline-none text-sm px-3 py-1.5 /* 내부 패딩 추가 */
          "
          disabled={isSending || isDisabled || !activeChatPartnerId}
        />
        {/* --- 전송 버튼: Aero 스타일 적용 --- */}
        <button
          type="submit"
          disabled={isSendDisabled}
          // 조건부 클래스: 활성(Aero Green), 비활성(Aero Gray + disabled 스타일)
          className={`
            ml-1 flex-shrink-0 btn-aero text-xs px-3 py-0.5 /* 크기 약간 줄임 */
            ${isSendDisabled
              ? 'btn-aero-gray opacity-60 cursor-not-allowed filter grayscale-[30%]' // 비활성 스타일
              : 'btn-aero-green' // 활성 스타일
            }
          `}
        >
          {isSending ? '전송중...' : '전송'}
        </button>
      </div>
    </form>
  );
});

ChatInput.displayName = 'ChatInput';
export default ChatInput;