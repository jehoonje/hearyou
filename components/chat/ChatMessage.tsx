// components/chat/ChatMessage.tsx
import { memo } from 'react';
import { ChatMessageData, UserProfile } from '../../types';

interface ChatMessageProps {
  message: ChatMessageData;
  isSender: boolean;
  senderProfile?: UserProfile | null; // 보낸 사람 프로필 (선택 사항)
}

const ChatMessage = memo<ChatMessageProps>(({ message, isSender, senderProfile }) => {
  const alignClass = isSender ? 'items-end' : 'items-start';
  const bubbleClass = isSender
    ? 'bg-blue-600 text-white rounded-br-none'
    : 'bg-gray-700 text-white rounded-bl-none';
  // const senderName = isSender ? '나' : (senderProfile?.username || senderProfile?.email?.split('@')[0] || '상대방');
  const time = new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className={`flex flex-col mb-3 ${alignClass}`}>
       {/* {!isSender && (
         <span className="text-xs text-gray-400 mb-1">{senderName}</span>
       )} */}
       <div className="flex items-end">
            {!isSender && <div className="w-3"></div>} {/* 왼쪽 여백 */}
            <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow ${bubbleClass}`}
                style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }} // 자동 줄바꿈
            >
                <p className="text-sm">{message.message_text}</p>
            </div>
             {isSender && <div className="w-3"></div>} {/* 오른쪽 여백 */}
       </div>

      <span className={`text-xs text-gray-500 mt-1 ${isSender ? 'self-end' : 'self-start'}`}>{time}</span>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;