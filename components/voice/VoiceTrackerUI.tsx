import { memo } from 'react';
import VolumeIndicator from './VolumeIndicator';
import TranscriptDisplay from './TranscriptDisplay';
import KeywordList from './KeywordList';
import { Keyword } from '../../types';

interface VoiceTrackerUIProps {
  volume: number;
  transcript: string;
  listening: boolean;
  newKeywords: string[];
  keywordList: Keyword[];
  error: string | null;
  userEmail: string;
  onLogout: () => void;
}

const VoiceTrackerUI = memo<VoiceTrackerUIProps>(({
  volume,
  transcript,
  listening,
  newKeywords,
  keywordList,
  error,
  userEmail,
  onLogout
}) => (
  <div className="absolute inset-0 flex flex-col w-full h-full pointer-events-none">
    {/* 에러 메시지 - 포인터 이벤트 허용 */}
    {error && (
      <div className="sticky top-0 w-full bg-red-500 text-white p-2 text-center z-50 font-mono pointer-events-auto">
        {error}
      </div>
    )}

    {/* 상단 영역 - 포인터 이벤트 허용 */}
    <div className="p-4 flex-shrink-0 pointer-events-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-mono font-bold flex items-center text-shadow">
          Voice Tracker
          {listening && (
            <span
              className="ml-2 inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"
              title="음성 감지 중"
            ></span>
          )}
        </h1>

        <div className="flex items-center">
          <span className="text-xs font-mono mr-2 text-gray-400">
            {userEmail?.split("@")[0]}
          </span>
          <button
            onClick={onLogout}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-white font-mono py-1 px-2 rounded"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* 인식된 음성 텍스트 */}
      <TranscriptDisplay transcript={transcript} />

      {/* 감지된 키워드 알림 */}
      {newKeywords.length > 0 && (
        <div className="backdrop-blur-lg bg-blue-500/30 p-3 rounded-lg mb-4 animate-pulse border border-blue-300">
          <h2 className="text-base font-mono font-semibold text-shadow">
            감지된 키워드:
          </h2>
          <p className="text-sm font-mono font-bold">
            {newKeywords.join(", ")}
          </p>
        </div>
      )}

      {/* 볼륨 레벨 표시 */}
      <VolumeIndicator volume={volume} />
    </div>

    {/* 중앙 여백 */}
    <div className="flex-grow"></div>

    {/* 하단 영역 - 포인터 이벤트 허용 */}
    <div className="p-4 flex-shrink-0 pointer-events-auto">
      <KeywordList keywordList={keywordList} />
    </div>
  </div>
));

VoiceTrackerUI.displayName = 'VoiceTrackerUI';
export default VoiceTrackerUI;
