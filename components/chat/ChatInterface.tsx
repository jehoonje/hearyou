// src/components/chat/ChatInterface.tsx

import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useMatchStore } from '../../store/matchStore';
import { useAuth } from '../../hooks/useAuth';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { ChevronLeft } from 'lucide-react'; 

interface ChatInterfaceProps {
  onClose: () => void;
}

const ChatInterface = memo<ChatInterfaceProps>(({ onClose }) => {
  const { user } = useAuth();
  const { matchedUserProfile, matchStatusMessage, activeChatPartnerId, currentMatch } = useMatchStore();
  const { messages, subscribeToChatMessages, unsubscribeFromChatMessages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  const chatPartnerId = activeChatPartnerId;

  // Mount/Unmount 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // 닫기 핸들러 (애니메이션 포함)
  const handleClose = useCallback(() => {
    setShow(false);
    setTimeout(() => {
      onClose();
    }, 1000);
  }, [onClose]);

  // 채팅 메시지 구독/구독 해지
  useEffect(() => {
    if (chatPartnerId && currentMatch?.matchDate && user) {
      subscribeToChatMessages(user, chatPartnerId, currentMatch.matchDate);
    }
    return () => {
      unsubscribeFromChatMessages();
    };
  }, [user, chatPartnerId, currentMatch?.matchDate, subscribeToChatMessages, unsubscribeFromChatMessages]);

  // 메시지 목록 맨 아래로 스크롤
  useEffect(() => {
    if (show) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, show]);

  const isChatInvalid = !!matchStatusMessage;
  const partnerProfileToShow = (currentMatch?.partner?.userId === chatPartnerId) ? matchedUserProfile : null;
  const partnerName = partnerProfileToShow?.username || `상대`;

  return (
    <div className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm transition-opacity duration-1000 ease-in-out ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div
        className={`
          w-[375px] h-[648px] max-w-md flex flex-col overflow-hidden
          rounded-xl shadow-2xl shadow-black/40
          bg-transparent
          backdrop-filter backdrop-blur-lg -webkit-backdrop-filter backdrop-blur-lg
          border border-white/20
          box-shadow: inset 0 1.5px 1.5px rgba(255, 255, 255, 0.1)
          transition-all duration-1000 ease-in-out
          ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
      >
        {/* Header - 기존 스타일 유지 */}
        <div className="p-4 border-b border-white/10 flex items-center flex-shrink-0">
          <button
            onClick={handleClose}
            className="
              text-gray-300 hover:text-white hover:bg-white/10
              w-8 h-8 flex items-center justify-center rounded-full
              text-xl font-semibold
              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
              mr-3
            "
            aria-label="뒤로가기"
            title="뒤로가기"
          >
            <ChevronLeft size={20} />
          </button>
          
          <h2 className={`text-lg font-semibold text-white font-mono transition-colors ${isChatInvalid ? 'text-gray-400' : 'text-shadow'}`}>
            {isChatInvalid ? '대화 상태 변경됨' : `Chat with ${partnerName}`}
          </h2>
        </div>

        {/* Messages Area */}
        <div className="relative flex-grow overflow-hidden">
          {/* Message List */}
          <div className={`absolute inset-0 p-4 overflow-y-auto scrollbar-thin transition-opacity duration-300 ${isChatInvalid ? 'opacity-30 filter blur-[2px]' : 'opacity-100'}`}>
            {messages.length === 0 && !isChatInvalid && (
              <div className="text-center text-gray-400/60 text-sm mt-8">
                첫 메시지를 보내보세요
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isSender={msg.sender_id === user?.id}
                senderProfile={msg.sender_id === chatPartnerId ? partnerProfileToShow : null}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Status Message Overlay */}
          {isChatInvalid && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-10">
              <div className="text-center p-6 rounded-lg shadow-xl bg-yellow-900/60 backdrop-filter backdrop-blur-md -webkit-backdrop-filter backdrop-blur-md border border-yellow-500/80 box-shadow: inset 0 1px 1px rgba(255, 255, 180, 0.3), 0 2px 4px rgba(0,0,0,0.3)">
                <p className="text-yellow-300 font-semibold text-lg text-shadow">{matchStatusMessage}</p>
                <p className="text-gray-300/90 text-sm mt-3">이 채팅 창을 닫아주세요.</p>
                <button
                  onClick={handleClose}
                  className="mt-5 btn-aero btn-aero-yellow"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className={`flex-shrink-0 border-t border-white/10 ${isChatInvalid ? 'opacity-50' : ''}`}>
          <ChatInput isDisabled={isChatInvalid} />
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';
export default ChatInterface;