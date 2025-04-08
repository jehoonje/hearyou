import { memo } from 'react';

interface LoadingScreenProps {
  loadingProgress: number;
}

const LoadingScreen = memo<LoadingScreenProps>(({ loadingProgress }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700">
    <div className="w-[200px] text-center">
      <h1 className="text-3xl font-mono font-bold mb-6 text-white tracking-wider">
        VOICE TRACKER
      </h1>

      <div className="mb-6 flex flex-col items-center">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500 opacity-75 animate-ping"></div>
          <div className="absolute inset-[25%] rounded-full bg-blue-500"></div>
        </div>
        <p className="text-sm font-mono text-gray-400 mb-2">
          시스템 초기화 중...
        </p>
      </div>

      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${loadingProgress}%` }}
        ></div>
      </div>
      <p className="text-xs font-mono text-gray-500">
        {Math.round(loadingProgress)}%
      </p>
    </div>
  </div>
));

LoadingScreen.displayName = 'LoadingScreen';
export default LoadingScreen;
