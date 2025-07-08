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
        const { data, error } = await supabase.functions.invoke('get-voice-prompt', {
          body: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }
        });

        if (!error && data) {
          setPlaceholder(language === 'ko' ? data.prompt_text : data.prompt_text_en);
        }
      } catch (error) {
        console.error('Failed to fetch voice prompt:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 초기 로드
    fetchPrompt();

    // 1시간마다 새로운 프롬프트 가져오기
    const interval = setInterval(fetchPrompt, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [language, supabase.functions]);

  return (
    <div
      className={`backdrop-blur-sm p-3 rounded-lg mb-4 bg-black/20 transition-all duration-300 
                ${
                  transcript !== null && transcript !== ''
                    ? "border-blue-500 border"
                    : "border-none"
                }`}
    >
      <p
        className={`text-sm font-mono min-h-[40px] rounded p-2 transition-opacity duration-300
                  ${
                    transcript ? "text-white" : "text-gray-400 italic"
                  }
                  ${
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