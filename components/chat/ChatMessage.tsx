// src/components/chat/ChatMessage.tsx
import { memo } from 'react';
import { ChatMessageData, UserProfile } from '../../types';

interface ChatMessageProps {
  message: ChatMessageData;
  isSender: boolean;
  senderProfile?: UserProfile | null; // 보낸 사람 프로필 (선택 사항)
}

const ChatMessage = memo<ChatMessageProps>(({ message, isSender, senderProfile }) => {
  const alignClass = isSender ? 'items-end' : 'items-start';
  // --- 말풍선 스타일: Aero 반투명 적용 ---
  const bubbleBaseStyle = `
    max-w-xs lg:max-w-md px-3 py-2 rounded-xl shadow-md /* 좀 더 둥글게 */
    transition-all duration-150 ease-in-out
    text-white text-shadow-sm /* 기본 텍스트 그림자 */
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 1px 2px rgba(0,0,0,0.15) /* 미세 광택/그림자 */
  `;
  const senderBubbleStyle = `
    bg-blue-600/85 /* 반투명 파랑 */
    rounded-br-lg /* 꼬리 느낌 살짝 */
  `;
  const receiverBubbleStyle = `
    bg-gray-700/85 /* 반투명 회색 */
    rounded-bl-lg /* 꼬리 느낌 살짝 */
  `;
  const bubbleClass = isSender ? `${bubbleBaseStyle} ${senderBubbleStyle}` : `${bubbleBaseStyle} ${receiverBubbleStyle}`;

  const time = new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className={`flex flex-col mb-4 ${alignClass}`}> {/* 간격 약간 넓힘 */}
       <div className="flex items-end">
            {!isSender && <div className="w-2"></div>} {/* 여백 조정 */}
            <div
                className={bubbleClass}
                style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }} // 자동 줄바꿈 (wordBreak 수정)
            >
                {/* 텍스트 가독성 위해 살짝 그림자 추가 */}
                <p className="text-sm" style={{ textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)' }}>{message.message_text}</p>
            </div>
             {isSender && <div className="w-2"></div>} {/* 여백 조정 */}
       </div>
       {/* 타임스탬프 스타일 */}
      <span className={`text-xs text-gray-400/80 mt-1.5 ${isSender ? 'self-end mr-1' : 'self-start ml-1'}`}>{time}</span>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;