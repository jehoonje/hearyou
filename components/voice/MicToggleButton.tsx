// src/components/voice/MicToggleButton.tsx

import React, { useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface MicToggleButtonProps {
  listening: boolean;
  onClick: () => void;
  disabled?: boolean;
  onMicStart?: () => void; // 마이크 시작 시 음악 끄기 위한 콜백
}

const MicToggleButton: React.FC<MicToggleButtonProps> = ({
  listening,
  onClick,
  disabled = false,
  onMicStart
}) => {
  // 마이크가 켜질 때 음악 끄기
  useEffect(() => {
    if (listening && onMicStart) {
      onMicStart();
    }
  }, [listening, onMicStart]);

  return (
    <button
      type="button"
      aria-label={listening ? '음성 인식 중지' : '음성 인식 시작'}
      title={
        disabled
          ? '로그인 필요'
          : listening
          ? '음성 인식 중지'
          : '음성 인식 시작'
      }
      disabled={disabled}
      onClick={onClick}
      className={`circle-toggle-btn ${listening ? 'mic-active' : ''}`}
    >
      {listening ? (
        <Mic size={16} className="circle-toggle-icon" />
      ) : (
        <MicOff size={16} className="circle-toggle-icon" />
      )}
    </button>
  );
};

export default MicToggleButton;