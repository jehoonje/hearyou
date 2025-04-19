// src/components/voice/MicToggleButton.tsx

import React from 'react';

interface MicToggleButtonProps {
  listening: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const MicToggleButton: React.FC<MicToggleButtonProps> = ({
  listening,
  onClick,
  disabled = false,
}) => {
  const stateClass = listening ? 'on' : 'off';
  const disabledClass = disabled ? 'disabled' : '';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={listening}
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
      // 적용된 커스텀 CSS 클래스
      className={`mic-toggle-aero ${stateClass} ${disabledClass}`}
    >
      <span className="sr-only">
        {listening ? '음성 인식 활성화됨' : '음성 인식 비활성화됨'}
      </span>

      {/* ON/OFF 텍스트 */}
      <span
         className={`mic-toggle-text on ${listening ? 'opacity-100' : 'opacity-0'}`}
         aria-hidden="true"
       >
         ON
       </span>
       <span
         className={`mic-toggle-text off ${!listening ? 'opacity-100' : 'opacity-0'}`}
         aria-hidden="true"
       >
         OFF
       </span>

      {/* 움직이는 동그라미 (Thumb) */}
      <span
        aria-hidden="true"
        // 적용된 커스텀 CSS 클래스
        className={`mic-toggle-thumb-aero ${stateClass}`}
      />
    </button>
  );
};

export default MicToggleButton;