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
  
  // 텍스트 길이에 따른 동적 스타일 결정
  const messageLength = message.message_text.length;
  const isShortMessage = messageLength <= 16;
  
  // Apple 스타일 말풍선 - 짧은 메시지는 inline-block으로 처리
  const bubbleBaseStyle = `
    px-4 py-2 rounded-2xl
    transition-all duration-150 ease-in-out
    text-[14px] leading-[1.4]
    ${isShortMessage ? 'inline-block' : 'block max-w-[70%]'}
  `;
  
  const senderBubbleStyle = `
    bg-[#6F3ACD] text-white
    rounded-br-[4px]
  `;
  
  const receiverBubbleStyle = `
    bg-[#333] text-white
    rounded-bl-[4px]
  `;
  
  const bubbleClass = isSender ? `${bubbleBaseStyle} ${senderBubbleStyle}` : `${bubbleBaseStyle} ${receiverBubbleStyle}`;

  const time = new Date(message.sent_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });

  return (
    <div className={`flex flex-col mb-2 ${alignClass}`}>
      <div className={`flex items-end ${isSender ? 'justify-end' : 'justify-start'}`}>
        {!isSender && <div className="w-2"></div>}
        <div
          className={bubbleClass}
          style={{ 
            wordBreak: messageLength > 16 ? 'break-word' : 'keep-all',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            whiteSpace: isShortMessage ? 'nowrap' : 'normal'
          }}
        >
          <p className={isShortMessage ? '' : 'break-words'}>{message.message_text}</p>
        </div>
        {isSender && <div className="w-2"></div>}
      </div>
      {/* 타임스탬프 - 더 작은 폰트 */}
      <span className={`text-[11px] text-gray-500/70 mt-1 ${isSender ? 'self-end mr-3' : 'self-start ml-3'}`}>
        {time}
      </span>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;