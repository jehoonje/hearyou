import { memo } from 'react';

interface TranscriptDisplayProps {
  transcript: string;
}

const TranscriptDisplay = memo<TranscriptDisplayProps>(({ transcript }) => (
  <div
    className={`backdrop-blur-sm p-3 rounded-lg mb-4 transition-all duration-300 
              ${
                transcript
                  ? "border-blue-500 border"
                  : "border border-gray-700/50"
              }`}
  >
    <h2 className="text-base font-mono font-semibold mb-1 text-shadow">
      인식된 음성:
    </h2>
    <p
      className={`text-sm font-mono min-h-[40px] rounded p-2 bg-black/20
                ${
                  transcript ? "text-white" : "text-gray-400 italic"
                }`}
    >
      {transcript || "음성 대기 중... (말씀해 보세요)"}
    </p>
  </div>
));

TranscriptDisplay.displayName = 'TranscriptDisplay';
export default TranscriptDisplay;
