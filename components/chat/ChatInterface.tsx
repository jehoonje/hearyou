// src/components/chat/ChatInterface.tsx

import { memo, useEffect, useRef, useState, useCallback } from 'react'; // useState, useCallback 임포트
import { useChatStore } from '../../store/chatStore';
import { useMatchStore } from '../../store/matchStore';
import { useAuth } from '../../hooks/useAuth';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { ChevronLeft } from 'lucide-react'; 

interface ChatInterfaceProps {
  onClose: () => void; // 부모로부터 받은 닫기 함수
}

const ChatInterface = memo<ChatInterfaceProps>(({ onClose }) => {
  const { user } = useAuth();
  const { matchedUserProfile, matchStatusMessage, activeChatPartnerId, currentMatch } = useMatchStore();
  const { messages, subscribeToChatMessages, unsubscribeFromChatMessages } = useChatStore(); // clearChat 제거됨
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false); // 애니메이션 상태 추가

  const chatPartnerId = activeChatPartnerId;

  // --- Mount/Unmount 애니메이션 ---
  useEffect(() => {
    // Mount: 약간의 딜레이 후 show 상태를 true로 변경 (Fade-in 시작)
    const timer = setTimeout(() => {
      setShow(true);
    }, 10); // 10ms 딜레이 (브라우저가 초기 opacity-0 상태를 인지할 시간)
    return () => clearTimeout(timer); // 언마운트 시 타이머 클리어
  }, []);

  // --- 닫기 핸들러 (애니메이션 포함) ---
  const handleClose = useCallback(() => {
    setShow(false); // Fade-out 시작
    // 애니메이션 시간(300ms) 후 부모의 onClose 함수 호출
    setTimeout(() => {
      onClose();
    }, 1000); // CSS transition duration과 일치시킴
  }, [onClose]);
  // ----------------------------------

  // 채팅 메시지 구독/구독 해지
  useEffect(() => {
    if (chatPartnerId && currentMatch?.matchDate && user) {
      //console.log(`[ChatInterface] Subscribing to chat: user=${user.id}, partner=${chatPartnerId}, matchDate=${currentMatch.matchDate}`);
      subscribeToChatMessages(user, chatPartnerId, currentMatch.matchDate);
    } else {
      //console.log("[ChatInterface] Unsubscribing (no partner, match date, or user)");
    }
    return () => {
      //console.log("[ChatInterface] Cleaning up chat subscription.");
      unsubscribeFromChatMessages();
    };
  }, [user, chatPartnerId, currentMatch?.matchDate, subscribeToChatMessages, unsubscribeFromChatMessages]);

  // 메시지 목록 맨 아래로 스크롤
  useEffect(() => {
    if (show) { // 채팅창이 완전히 나타난 후에 스크롤
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, show]); // show 상태도 의존성에 추가

  const isChatInvalid = !!matchStatusMessage;
  const partnerProfileToShow = (currentMatch?.partner?.userId === chatPartnerId) ? matchedUserProfile : null;
  const partnerName = partnerProfileToShow?.username || `상대 (${chatPartnerId?.substring(0,6)}...)`;

  return (
    // --- 전체 오버레이: 애니메이션 클래스 추가 ---
    <div className={`fixed inset-0 bg-black/40 flex items-center justify-center z-50 pointer-events-auto backdrop-blur-sm transition-opacity duration-1000 ease-in-out ${show ? 'opacity-100' : 'opacity-0'}`}>
                                                                                                {/* ↑↑↑ 트랜지션 및 동적 opacity 추가 */}
      {/* --- 채팅 모달 컨테이너: 애니메이션 클래스 추가 (선택적 scale 효과 포함) --- */}
      <div
        className={`
          w-[375px] h-[658px] max-w-md flex flex-col overflow-hidden
          rounded-xl shadow-2xl shadow-black/40
          bg-transparent
          backdrop-filter backdrop-blur-lg -webkit-backdrop-filter backdrop-blur-lg
          border border-white/20 border-b-black/30
          box-shadow: inset 0 1.5px 1.5px rgba(255, 255, 255, 0.1)
          transition-all duration-1000 ease-in-out /* 모든 속성에 트랜지션 적용 */
          ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} /* 동적 opacity 및 scale 추가 */
        `}
      >
        {/* --- Header: 버튼 위치 및 모양 변경 --- */}
        <div className="p-4 border-b border-white/10 flex items-center flex-shrink-0">
          {/* 뒤로가기 버튼 */}
          <button
             onClick={handleClose} // 수정된 핸들러 사용
             className="
               text-gray-300 hover:text-white hover:bg-white/10
               w-8 h-8 flex items-center justify-center rounded-full /* 크기 살짝 조정 */
               text-xl font-semibold /* 폰트 조정 */
               transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
               mr-3 /* 제목과의 간격 */
             "
             aria-label="뒤로가기" // 라벨 변경
             title="뒤로가기" // 타이틀 변경
           >
             <ChevronLeft/>
           </button>
           {/* 제목 */}
           <h2 className={`text-lg font-semibold text-white font-mono transition-colors ${isChatInvalid ? 'text-gray-400' : 'text-shadow'}`}>
             {isChatInvalid ? '대화 상태 변경됨' : `${partnerName} 와(과)의 대화`}
           </h2>
           {/* 기존 닫기 버튼 제거됨 */}
        </div>
        {/* ----------------------------------------- */}

        {/* --- Messages Area & Status Overlay --- */}
        <div className="relative flex-grow overflow-hidden">
            {/* Message List */}
            <div className={`absolute inset-0 p-4 overflow-y-auto scrollbar-thin transition-opacity duration-300 ${isChatInvalid ? 'opacity-30 filter blur-[2px]' : 'opacity-100'}`}>
                 {messages.length === 0 && !isChatInvalid && (
                    <div className="text-center text-gray-300/70 text-sm mt-8 font-mono"> 첫 메시지를 보내보세요 </div>
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
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-10">
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
                         <button
                            onClick={handleClose} // 여기도 수정된 핸들러 사용
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