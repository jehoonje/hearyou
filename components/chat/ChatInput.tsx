// src/components/chat/ChatInput.tsx
import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/chatStore';
import { useAuth } from '../../hooks/useAuth';
import { useMatchStore } from '../../store/matchStore';
import { ArrowUp, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../app/contexts/LanguageContext';

interface ChatInputProps {
  isDisabled?: boolean;
}

// 부적절한 콘텐츠 필터링을 위한 금지어 목록 (영문 금지어도 고려)
const INAPPROPRIATE_WORDS_KO = ['카카오톡', '씨발', '비속어1', '비속어2'];
const INAPPROPRIATE_WORDS_EN = ['contact', 'instagram', 'telegram', 'fuck'];

// 부적절한 패턴 감지 (정규표현식)
const INAPPROPRIATE_PATTERNS = [
  /연락처.*\d{3,}/i, // 전화번호 패턴
  /카카오톡|카톡|라인|텔레그램/i, // 외부 메신저
  /만나자|만날래|보자/i, // 오프라인 만남 유도
  // 영문 패턴 추가
  /contact info.*\d{3,}/i,
  /kakaotalk|line|telegram/i,
  /let's meet|wanna meet/i,
];

const ChatInput = memo<ChatInputProps>(({ isDisabled = false }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { activeChatPartnerId, currentMatch } = useMatchStore();
  const { currentMessage, setCurrentMessage, sendMessage, isSending, error: chatError } = useChatStore();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [contentWarning, setContentWarning] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const INAPPROPRIATE_WORDS = language === 'ko' ? INAPPROPRIATE_WORDS_KO : INAPPROPRIATE_WORDS_EN;

  // 키보드 상태 감지
  useEffect(() => {
    const initialViewportHeight = window.innerHeight;

    const handleResize = () => {
      const currentViewportHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentViewportHeight;
      
      // 키보드가 열렸는지 판단
      const keyboardOpen = heightDifference > 150;
      setIsKeyboardOpen(keyboardOpen);
    };

    // visualViewport API 사용 (모던 브라우저)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
      };
    } else {
      // 폴백: window resize 이벤트 사용
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  // 입력창 포커스 시 키보드 열림 감지
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      // 포커스 시 약간의 지연 후 키보드 상태 확인
      setTimeout(() => {
        const currentViewportHeight = window.visualViewport?.height || window.innerHeight;
        const heightDifference = window.innerHeight - currentViewportHeight;
        setIsKeyboardOpen(heightDifference > 150);
      }, 300);
    };

    const handleBlur = () => {
      // 블러 시 키보드 닫힘으로 간주
      setTimeout(() => {
        setIsKeyboardOpen(false);
      }, 100);
    };

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);

    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
    };
  }, []);

  // iOS 줌 방지를 위한 viewport 설정
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      if (isKeyboardOpen) {
        // 키보드가 열렸을 때 줌 방지 및 고정
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0, viewport-fit=cover');
      } else {
        // 키보드가 닫혔을 때 기본 설정
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      }
    }
    
    return () => {
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
      }
    };
  }, [isKeyboardOpen]);

  // 부적절한 콘텐츠 검사 함수
  const checkInappropriateContent = useCallback((text: string): { isInappropriate: boolean; reason?: string } => {
    const lowerText = text.toLowerCase();
    
    // 금지어 검사
    for (const word of INAPPROPRIATE_WORDS) {
      if (lowerText.includes(word.toLowerCase())) {
        return { isInappropriate: true, reason: t.chat.inappropriateContentWarning };
      }
    }
    
    // 패턴 검사
    for (const pattern of INAPPROPRIATE_PATTERNS) {
      if (pattern.test(text)) {
        return { isInappropriate: true, reason: t.chat.policyViolationWarning };
      }
    }
    
    return { isInappropriate: false };
  }, [INAPPROPRIATE_WORDS, t]);

  // 메시지 입력 핸들러
  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMessage = e.target.value;
    setCurrentMessage(newMessage);
    
    // 실시간 콘텐츠 검사
    if (newMessage.trim()) {
      const check = checkInappropriateContent(newMessage);
      if (check.isInappropriate) {
        setContentWarning(check.reason || t.chat.inappropriateContentDetected);
        setIsBlocked(true);
      } else {
        setContentWarning(null);
        setIsBlocked(false);
      }
    } else {
      setContentWarning(null);
      setIsBlocked(false);
    }
  }, [setCurrentMessage, checkInappropriateContent, t.chat.inappropriateContentDetected]);

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (isDisabled || !currentMessage.trim() || !activeChatPartnerId || !currentMatch?.matchDate || !user) {
      return;
    }

    // 최종 콘텐츠 검사
    const check = checkInappropriateContent(currentMessage);
    if (check.isInappropriate) {
      setContentWarning(t.chat.cantSendWarning.replace('{reason}', check.reason || ''));
      return;
    }

    try {
      await sendMessage(user, activeChatPartnerId, currentMatch.matchDate);
      setContentWarning(null);
      setIsBlocked(false);
      
      // 전송 후 입력창에 포커스 유지
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error("메시지 전송 중 오류 발생:", error);
    }
  }, [
    isDisabled,
    currentMessage,
    user,
    activeChatPartnerId,
    currentMatch?.matchDate,
    sendMessage,
    checkInappropriateContent,
    t.chat.cantSendWarning,
  ]);

  const isSendDisabled = isSending || !currentMessage.trim() || isDisabled || !activeChatPartnerId || isBlocked;
  const showSendButton = currentMessage.trim().length > 0;

  return (
    <div className={`transition-all duration-300 ${isKeyboardOpen ? 'pb-safe' : ''}`}>
      <form onSubmit={handleSend} className="p-3 bg-black/10">
        {/* 경고 메시지 */}
        {(contentWarning || chatError) && !isDisabled && (
          <div className="mb-2 px-1 flex items-center gap-2">
            <AlertCircle size={14} className="text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-400 text-xs">{contentWarning || chatError}</p>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {/* Apple 스타일 입력 필드 */}
          <div className={`flex-1 relative flex items-center bg-[#222] backdrop-filter backdrop-blur-sm -webkit-backdrop-filter backdrop-blur-sm border rounded-full px-1 py-1 transition-colors ${
            isBlocked ? 'border-yellow-500/50' : 'border-black/20 border-t-white/10'
          }`}>
            <input
              ref={inputRef}
              type="text"
              value={currentMessage}
              onChange={handleMessageChange}
              placeholder={isDisabled ? t.chat.inputPlaceholderDisabled : t.chat.inputPlaceholderDefault}
              className="
                flex-1 bg-transparent text-white placeholder-gray-400/70
                px-3 py-1.5 text-sm
                focus:outline-none
                transition-all duration-150
              "
              disabled={isSending || isDisabled || !activeChatPartnerId}
              aria-label={t.chat.inputPlaceholderDefault}
              style={{ 
                fontSize: '16px', // iOS 줌 방지
                minHeight: '20px'
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            
            {/* 전송 버튼 */}
            {showSendButton && (
              <button
                type="submit"
                disabled={isSendDisabled}
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center mr-1
                  transition-all duration-150 ease-in-out
                  ${isSendDisabled
                    ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                    : 'bg-[#007AFF] hover:bg-[#0051D5] active:scale-95'
                  }
                `}
                aria-label={t.chat.sendButtonTooltip}
                title={isBlocked ? t.chat.sendButtonBlockedTooltip : t.chat.sendButtonTooltip}
              >
                <ArrowUp size={18} className="text-white" />
              </button>
            )}
          </div>
        </div>
        
        {/* 안내 메시지 */}
        <p className="text-[10px] text-gray-500 mt-1 px-1 text-center">
          {t.chat.moderationNotice}
        </p>
      </form>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
export default ChatInput;