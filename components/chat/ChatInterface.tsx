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
  // --- 스토어에서 상태 가져오기 ---
  const { matchedUserProfile, matchStatusMessage, activeChatPartnerId, currentMatch } = useMatchStore();
  const { messages, subscribeToChatMessages, unsubscribeFromChatMessages, clearChat } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 현재 채팅 인터페이스의 파트너 ID
  const chatPartnerId = activeChatPartnerId;

  // 메시지 구독 로직 (chatPartnerId 기반)
  useEffect(() => {
    if (chatPartnerId && currentMatch?.matchDate && user) {
      subscribeToChatMessages(user, chatPartnerId, currentMatch.matchDate);
    }
    // 컴포넌트 언마운트 시 정리
    return () => {
      unsubscribeFromChatMessages();
      // clearChat(); // 닫을 때 메시지 비울지는 선택사항
    };
  }, [user, chatPartnerId, currentMatch?.matchDate, subscribeToChatMessages, unsubscribeFromChatMessages]); // clearChat 제거 (optional)

  // 스크롤 처리 (변경 없음)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- 매치 상태 확인 ---
  const isChatInvalid = !!matchStatusMessage;

  // 표시할 파트너 이름 결정
  // currentMatch가 아니라, 이 채팅창이 열릴 때의 파트너(chatPartnerId) 기준 프로필이 필요할 수 있음
  // 여기서는 현재 유효한 매치 상대의 프로필을 우선 사용
  const partnerProfileToShow = (currentMatch?.partner?.userId === chatPartnerId) ? matchedUserProfile : null;
  const partnerName = partnerProfileToShow?.username || `상대 (${chatPartnerId?.substring(0,6)}...)`; // ID 앞부분 또는 기본값

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-md h-[80vh] flex flex-col overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
          <h2 className={`text-lg font-semibold text-white font-mono transition-colors ${isChatInvalid ? 'text-gray-500' : ''}`}>
            {/* 상태 메시지가 있으면 '대화 상태 변경됨' 표시 */}
            {isChatInvalid ? '대화 상태 변경됨' : `${partnerName} 와(과)의 대화`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold" aria-label="닫기">&times;</button>
        </div>

        {/* Messages Area & Status Overlay */}
        <div className="relative flex-grow">
            {/* Message List */}
            <div className={`absolute inset-0 p-4 overflow-y-auto scrollbar-thin ${isChatInvalid ? 'opacity-50' : ''}`}> {/* 비활성 시 약간 흐리게 */}
                {messages.length === 0 && !isChatInvalid && (
                    <div className="text-center text-gray-500 text-sm mt-8"> 대화를 시작해보세요! </div>
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
                <div className="absolute inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-6 z-10">
                    <div className="text-center p-6 bg-black bg-opacity-90 rounded-lg border border-yellow-500 shadow-lg">
                        <p className="text-yellow-400 font-semibold text-lg">{matchStatusMessage}</p>
                        <p className="text-gray-300 text-sm mt-3">이 채팅 창을 닫아주세요.</p>
                         <button
                            onClick={onClose}
                            className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-1 rounded text-sm"
                         >
                            닫기
                         </button>
                    </div>
                </div>
            )}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0">
          {/* isDisabled prop 전달 */}
          <ChatInput isDisabled={isChatInvalid} />
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = 'ChatInterface';
export default ChatInterface;