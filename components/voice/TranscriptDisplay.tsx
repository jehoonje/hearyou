import { memo } from 'react';

interface TranscriptDisplayProps {
  // transcript 타입을 string 또는 null을 허용하도록 수정
  transcript: string | null;
}

const TranscriptDisplay = memo<TranscriptDisplayProps>(({ transcript }) => (
  <div
    className={`backdrop-blur-sm p-3 rounded-lg mb-4 bg-black/20 transition-all duration-300 
              ${
                // transcript가 null이 아닐 때만 파란색 테두리 적용
                transcript !== null && transcript !== ''
                  ? "border-blue-500 border"
                  : "border-none" // null이거나 빈 문자열일 때 회색 테두리
              }`}
  >
    {/* 제목은 필요하다면 추가 */}
    {/* <h2 className="text-base font-mono font-semibold mb-1 text-shadow">인식된 텍스트</h2> */}
    <p
      className={`text-sm font-mono min-h-[40px] rounded p-2 
                ${
                  // transcript가 유효한 문자열일 때 흰색 텍스트
                  transcript ? "text-white" : "text-gray-400 italic"
                }`}
    >
      {/* transcript가 null이거나 빈 문자열일 경우 대기 메시지 표시 */}
      {transcript || "어떤 말도 좋아요. 말씀해보세요. "}
    </p>
  </div>
));

TranscriptDisplay.displayName = 'TranscriptDisplay';
export default TranscriptDisplay;