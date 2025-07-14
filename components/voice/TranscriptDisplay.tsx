// components/TranscriptDisplay.tsx (수정된 최종 버전)
import { memo, useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useLanguage } from '../../app/contexts/LanguageContext';

interface TranscriptDisplayProps {
  transcript: string | null;
}

const TranscriptDisplay = memo<TranscriptDisplayProps>(({ transcript }) => {
  const [placeholder, setPlaceholder] = useState<string>("어떤 말도 좋아요. 말씀해보세요.");
  const [isLoading, setIsLoading] = useState(false);
  const { language } = useLanguage();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchPrompt = async () => {
      setIsLoading(true);
      try {
        const now = new Date();
        const currentHour = now.getHours();
        
        // 서버리스 함수를 호출하여 현재 시간대의 프롬프트를 가져옵니다.
        const { data, error } = await supabase.functions.invoke('get-voice-prompt', {
          body: { 
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            localHour: currentHour,
          }
        });

        if (!error && data) {
          const newPromptText = language === 'ko' ? data.prompt_text : data.prompt_text_en;
          setPlaceholder(newPromptText);
          console.log('[Voice Prompt] Updated:', newPromptText);
        }
      } catch (error) {
        console.error('Failed to fetch voice prompt:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 컴포넌트가 마운트될 때 프롬프트를 한 번 가져옵니다.
    fetchPrompt();

    // 정각마다 프롬프트를 업데이트하기 위한 인터벌
    // (푸시 알림은 서버에서 보내므로, 여기서는 화면 표시 갱신용)
    const interval = setInterval(() => {
        fetchPrompt();
    }, 60 * 60 * 1000); // 1시간

    return () => clearInterval(interval);
    
  }, [language, supabase.functions]);

  return (
    <div
      className={`backdrop-blur-sm p-3 rounded-lg mb-4 bg-black/20 transition-all duration-300 ${
        transcript !== null && transcript !== ''
          ? "border-blue-500 border"
          : "border-none"
      }`}
    >
      <p
        className={`text-sm font-mono min-h-[40px] rounded p-2 transition-opacity duration-300 ${
          transcript ? "text-white" : "text-gray-400 italic"
        } ${
          isLoading ? "opacity-50" : "opacity-100"
        }`}
      >
        {transcript || placeholder}
      </p>
    </div>
  );
});

TranscriptDisplay.displayName = 'TranscriptDisplay';
export default TranscriptDisplay;