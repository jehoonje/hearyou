// src/components/chat/ChatInterface.tsx

import { memo, useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useMatchStore } from '../../store/matchStore'; // useMatchStore 임포트
import { useAuth } from '../../hooks/useAuth';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput'; // 수정된 ChatInput 임포트

interface ChatInterfaceProps {
  onClose: () => void;
}

const ChatInterface = memo<ChatInterfaceProps>(({ onClose }) => {
  const { user } = useAuth();
  const { matchedUserProfile, matchStatusMessage, activeChatPartnerId, currentMatch } = useMatchStore();
  const { messages, subscribeToChatMessages, unsubscribeFromChatMessages, clearChat } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const chatPartnerId = activeChatPartnerId;

  useEffect(() => {
    if (chatPartnerId && currentMatch?.matchDate && user) {
      subscribeToChatMessages(user, chatPartnerId, currentMatch.matchDate);
    }
    return () => {
      unsubscribeFromChatMessages();
    };
  }, [user, chatPartnerId, currentMatch?.matchDate, subscribeToChatMessages, unsubscribeFromChatMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isChatInvalid = !!matchStatusMessage;

  const partnerProfileToShow = (currentMatch?.partner?.userId === chatPartnerId) ? matchedUserProfile : null;
  const partnerName = partnerProfileToShow?.username || `상대 (${chatPartnerId?.substring(0,6)}...)`;

  return (
    // --- 전체 오버레이: 배경 흐림 및 어둡게 ---
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-md">
      {/* --- 채팅 모달 컨테이너: 반투명 크리스탈 스타일 --- */}
      <div
        className="
          w-full max-w-md h-[80vh] flex flex-col overflow-hidden
          rounded-xl shadow-2xl shadow-black/40
          bg-gray-900/85 /* 반투명 배경 */
          backdrop-filter backdrop-blur-lg /* 배경 블러 */
          -webkit-backdrop-filter backdrop-blur-lg
          border border-white/20 border-b-black/30 /* 유리 테두리 */
          box-shadow: inset 0 1.5px 1.5px rgba(255, 255, 255, 0.1) /* 내부 상단 광택 */
        "
      >
        {/* --- Header --- */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0">
          <h2 className={`text-lg font-semibold text-white font-mono transition-colors ${isChatInvalid ? 'text-gray-400' : 'text-shadow'}`}>
            {isChatInvalid ? '대화 상태 변경됨' : `${partnerName} 와(과)의 대화`}
          </h2>
          {/* 닫기 버튼: 스타일 개선 */}
          <button
             onClick={onClose}
             className="
               text-gray-400 hover:text-white hover:bg-white/10
               w-7 h-7 flex items-center justify-center rounded-full
               text-2xl font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
             "
             aria-label="닫기"
             title="닫기"
           >
             &times;
           </button>
        </div>

        {/* --- Messages Area & Status Overlay --- */}
        <div className="relative flex-grow overflow-hidden"> {/* 내부에서 스크롤 처리 */}
            {/* Message List */}
            <div className={`absolute inset-0 p-4 overflow-y-auto scrollbar-thin transition-opacity duration-300 ${isChatInvalid ? 'opacity-30 filter blur-[2px]' : 'opacity-100'}`}>
                {messages.length === 0 && !isChatInvalid && (
                    <div className="text-center text-gray-400/80 text-sm mt-8"> 대화를 시작해보세요! </div>
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

            {/* --- Status Message Overlay --- */}
            {isChatInvalid && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-10">
                    {/* 경고 패널: 반투명 노란색 Aero 스타일 */}
                    <div
                       className="
                         text-center p-6 rounded-lg shadow-xl
                         bg-yellow-900/60 backdrop-filter backdrop-blur-md -webkit-backdrop-filter backdrop-blur-md
                         border border-yellow-500/80
                         box-shadow: inset 0 1px 1px rgba(255, 255, 180, 0.3), 0 2px 4px rgba(0,0,0,0.3)
                       "
                    >
                        <p className="text-yellow-300 font-semibold text-lg text-shadow">{matchStatusMessage}</p>
                        <p className="text-gray-300/90 text-sm mt-3">이 채팅 창을 닫아주세요.</p>
                         {/* 닫기 버튼: Aero Yellow 스타일 적용 */}
                         <button
                            onClick={onClose}
                            className="mt-5 btn-aero btn-aero-yellow" // Aero 스타일 적용
                         >
                            닫기
                         </button>
                    </div>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-white/10">
          <ChatInput isDisabled={isChatInvalid} />
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';
export default ChatInterface;