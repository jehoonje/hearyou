// src/components/chat/ChatInput.tsx
import { memo, useState, useCallback, useRef } from 'react'; // useRef 임포트
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
  const inputRef = useRef<HTMLInputElement | null>(null); // 입력 필드 참조 생성

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // 폼 기본 제출 방지
    // 전송 조건 확인 (사용자, 파트너 ID, 메시지 내용 등)
    if (isDisabled || !currentMessage.trim() || !activeChatPartnerId || !currentMatch?.matchDate || !user) {
        console.warn("메시지 전송 조건 미충족");
        return;
    }

    try {
      // 전송할 메시지 저장 (sendMessage가 비동기이고 상태를 변경할 수 있으므로)
      const messageToSend = currentMessage;

      // Zustand 스토어의 sendMessage 호출 (user, partnerId, matchDate 필요)
      // sendMessage 내부에서 currentMessage 초기화가 이루어진다고 가정
      await sendMessage(user, activeChatPartnerId, currentMatch.matchDate);

      // --- 전송 성공 후 입력 필드에 포커스 ---
      if (inputRef.current) {
        inputRef.current.focus();
        //console.log("Input focused after sending message."); // 포커스 확인 로그
      }
      // --------------------------------------

      // 만약 sendMessage가 currentMessage를 자동으로 비우지 않는다면 여기서 비워야 함
      // setCurrentMessage('');

    } catch (error) {
      console.error("메시지 전송 중 오류 발생:", error);
      // 오류 발생 시에도 포커스를 줄지 여부 결정 (일반적으로는 안 줌)
    }

  }, [
      isDisabled,
      currentMessage,
      user,
      activeChatPartnerId,
      currentMatch?.matchDate,
      sendMessage,
      // setCurrentMessage // 필요시에만 의존성 추가
  ]);

  // 전송 버튼 비활성화 조건
  const isSendDisabled = isSending || !currentMessage.trim() || isDisabled || !activeChatPartnerId;

  return (
    // --- 입력 영역 컨테이너 ---
    <form onSubmit={handleSend} className="p-3 bg-black/10">
      {/* 에러 메시지 표시 (채팅 비활성화 아닐 때만) */}
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
        {/* --- 입력 필드 --- */}
        <input
          ref={inputRef} // ref 할당
          type="text"
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder={isDisabled ? "대화 상태가 변경되었습니다." : "type message..."}
          className="
            flex-grow bg-transparent text-white placeholder-gray-400/70
            focus:outline-none text-sm px-3 py-1.5 /* 내부 패딩 추가 */
          "
          disabled={isSending || isDisabled || !activeChatPartnerId} // 전송 중 또는 비활성화 시 입력 불가
          aria-label="메시지 입력"
        />
        {/* --- 전송 버튼: Aero 스타일 적용 --- */}
        <button
          type="submit"
          disabled={isSendDisabled}
          // 조건부 클래스: 활성(Aero Green), 비활성(Aero Gray + disabled 스타일)
          className={`
            ml-1 flex-shrink-0 btn-aero text-base px-3 py-0.5 /* 크기 약간 줄임 */
            transition-all duration-150 ease-in-out /* 부드러운 전환 효과 */
            ${isSendDisabled
              ? 'btn-aero-gray opacity-60 cursor-not-allowed filter grayscale-[30%]' // 비활성 스타일
              : 'btn-aero-green hover:brightness-110 active:brightness-95' // 활성 스타일 + 호버/클릭 효과
            }
          `}
          aria-label="메시지 전송"
        >
          {isSending ? 'Send' : 'Send'}
        </button>
      </div>
    </form>
  );
});

ChatInput.displayName = 'ChatInput';
export default ChatInput;