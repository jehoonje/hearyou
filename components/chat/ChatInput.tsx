import { memo, useState, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuth } from '../../hooks/useAuth';
import { useMatchStore } from '../../store/matchStore';

// --- isDisabled prop 인터페이스 추가 ---
interface ChatInputProps {
  isDisabled?: boolean;
}

const ChatInput = memo<ChatInputProps>(({ isDisabled = false }) => { // 기본값 false
  const { user } = useAuth();
  // --- activeChatPartnerId 와 currentMatch.matchDate 사용 ---
  const { activeChatPartnerId, currentMatch } = useMatchStore();
  const { currentMessage, setCurrentMessage, sendMessage, isSending, error: chatError } = useChatStore(); // chatStore 에러 별도 관리

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // 비활성화 상태거나, 메시지 없거나, 상대 ID 없거나, 매치 날짜 없으면 전송 불가
    if (isDisabled || !currentMessage.trim() || !activeChatPartnerId || !currentMatch?.matchDate) return;
    // sendMessage 호출 시 user 객체, activeChatPartnerId, matchDate 전달
    await sendMessage(user, activeChatPartnerId, currentMatch.matchDate);
  }, [isDisabled, currentMessage, user, activeChatPartnerId, currentMatch?.matchDate, sendMessage]);

  return (
    <form onSubmit={handleSend} className="p-4 border-t border-gray-700">
      {/* isDisabled 아닐 때만 chatStore 에러 표시 */}
      {chatError && !isDisabled && <p className="text-red-500 text-xs mb-2">{chatError}</p>}
      <div className="flex items-center bg-gray-800 rounded-lg px-3 py-2">
        <input
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder={isDisabled ? "대화 상태가 변경되었습니다." : "메시지를 입력하세요..."}
          className="flex-grow bg-transparent text-white placeholder-gray-500 focus:outline-none text-sm"
          // --- disabled 조건 수정 ---
          disabled={isSending || isDisabled || !activeChatPartnerId}
        />
        <button
          type="submit"
          // --- disabled 조건 수정 ---
          disabled={isSending || !currentMessage.trim() || isDisabled || !activeChatPartnerId}
          className={`ml-2 px-4 py-1 rounded text-sm font-semibold transition-colors ${
            !currentMessage.trim() || isSending || isDisabled || !activeChatPartnerId
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSending ? '전송중...' : '전송'}
        </button>
      </div>
    </form>
  );
});

ChatInput.displayName = 'ChatInput';
export default ChatInput;