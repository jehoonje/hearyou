// src/components/chat/ChatMessage.tsx
import { memo, useState, useCallback } from 'react';
import { ChatMessageData, UserProfile } from '../../types';
import { Flag, MoreHorizontal } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../app/contexts/LanguageContext'; // 언어 컨텍스트 import

interface ChatMessageProps {
  message: ChatMessageData;
  isSender: boolean;
  senderProfile?: UserProfile | null;
  onReport?: (messageId: string) => void;
}

const ChatMessage = memo<ChatMessageProps>(({ message, isSender, senderProfile, onReport }) => {
  const { t } = useLanguage(); // 언어 컨텍스트 사용
  const { user } = useAuth();
  const [showOptions, setShowOptions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClientComponentClient();
  
  const alignClass = isSender ? 'items-end' : 'items-start';
  
  // 텍스트 길이에 따른 동적 스타일
  const messageLength = message.message_text.length;
  const isShortMessage = messageLength <= 16;
  
  // Apple 스타일 말풍선
  const bubbleBaseStyle = `
    px-4 py-2 rounded-2xl
    transition-all duration-150 ease-in-out
    text-[14px] leading-[1.4]
    ${isShortMessage ? 'inline-block' : 'block max-w-[70%]'}
  `;
  
  const senderBubbleStyle = `
    bg-[#007AFF] text-white
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

  // 메시지 신고 처리
  const handleReport = useCallback(async () => {
    if (!user || !reportReason) return;
    
    if (user.id === message.sender_id) {
      alert(t.chat.alert.selfReportMessage);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const { data: existingReports, error: checkError } = await supabase
        .from('reports')
        .select('id')
        .eq('reporter_id', user.id)
        .eq('reported_user_id', message.sender_id)
        .eq('message_id', message.id);
  
      if (checkError) {
        console.error('중복 신고 확인 오류:', checkError);
      } else if (existingReports && existingReports.length > 0) {
        alert(t.chat.alert.alreadyReportedMessage);
        setShowReportModal(false);
        return;
      }
  
      const reportData = {
        reporter_id: user.id,
        reported_user_id: message.sender_id,
        report_type: 'message' as const,
        message_id: message.id,
        reason: reportReason,
        status: 'pending' as const
      };
  
      const { data, error } = await supabase
        .from('reports')
        .insert(reportData);
  
      if (error) {
        console.error('Supabase 신고 삽입 오류:', error);
        if (error.code === '42501') {
          alert(t.chat.alert.permissionError);
        } else if (error.code === '23505') {
          alert(t.chat.alert.duplicateError);
        } else {
          alert(t.chat.alert.reportError.replace('{message}', error.message));
        }
        return;
      }
  
      alert(t.chat.alert.reportSuccess);
      setShowReportModal(false);
      setReportReason('');
      setShowOptions(false);
    } catch (error) {
      console.error('신고 제출 예외:', error);
      alert(t.chat.alert.genericError);
    } finally {
      setIsSubmitting(false);
    }
  }, [user, message.id, message.sender_id, reportReason, supabase, t]);

  const toggleOptions = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOptions(!showOptions);
  }, [showOptions]);

  const handleClickOutside = useCallback(() => {
    if (showOptions) {
      setShowOptions(false);
    }
  }, [showOptions]);

  return (
    <>
      <div className={`flex flex-col mb-2 ${alignClass} relative`} onClick={handleClickOutside}>
        <div className={`flex items-end gap-2 ${isSender ? 'justify-end' : 'justify-start'}`}>
          {!isSender && <div className="w-2"></div>}
          
          <div className="relative group">
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
            
            {!isSender && (
              <button
                onClick={toggleOptions}
                className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full hover:bg-white/10"
                aria-label={t.chat.messageOptionsTooltip}
              >
                <MoreHorizontal size={16} className="text-gray-400" />
              </button>
            )}
            
            {showOptions && !isSender && (
              <div className="absolute left-full ml-2 top-0 bg-gray-900/95 backdrop-blur-md rounded-lg shadow-lg border border-white/10 overflow-hidden z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptions(false);
                    setShowReportModal(true);
                  }}
                  className="px-4 py-2 text-left text-yellow-400 hover:bg-white/10 flex items-center gap-2 transition-colors text-sm whitespace-nowrap"
                >
                  <Flag size={14} />
                  <span>{t.chat.reportUser}</span>
                </button>
              </div>
            )}
          </div>
          
          {isSender && <div className="w-2"></div>}
        </div>
        
        <span className={`text-[11px] text-gray-500/70 mt-1 ${isSender ? 'self-end mr-3' : 'self-start ml-3'}`}>
          {time}
        </span>
      </div>

      {showReportModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4"
          onClick={() => setShowReportModal(false)}
        >
          <div 
            className="bg-gray-900/95 backdrop-blur-md rounded-lg p-6 max-w-sm w-full border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">{t.chat.reportMessage}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">{t.chat.reportReasonLabel}</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-gray-800/50 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="">{t.chat.reportReasons.select}</option>
                  <option value="inappropriate_content">{t.chat.reportReasons.inappropriateContent}</option>
                  <option value="harassment">{t.chat.reportReasons.harassment}</option>
                  <option value="spam">{t.chat.reportReasons.spam}</option>
                  <option value="sexual_content">{t.chat.reportReasons.sexualContent}</option>
                  <option value="other">{t.chat.reportReasons.other}</option>
                </select>
              </div>

              <div className="bg-gray-800/30 p-3 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">{t.chat.reportTargetMessage}</p>
                <p className="text-sm text-gray-300 italic">"{message.message_text}"</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  disabled={isSubmitting}
                >
                  {t.common.cancel}
                </button>
                <button
                  onClick={handleReport}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                  disabled={!reportReason || isSubmitting}
                >
                  {isSubmitting ? t.chat.submitting : t.chat.reportUser}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;