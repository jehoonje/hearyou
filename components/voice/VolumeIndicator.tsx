import { memo } from 'react';

interface VolumeIndicatorProps {
  volume: number;
}

const VolumeIndicator = memo<VolumeIndicatorProps>(({ volume }) => (
  <div className="mt-4 text-xs flex items-center justify-between">
    <div className="text-gray-300 font-mono text-shadow">
      Volume Level:{" "}
      <span
        className={volume > 30 ? "text-green-400" : "text-gray-300"}
      >
        {Math.round(volume)}
      </span>
    </div>
    <div className="w-24 h-2 bg-gray-800/70 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-100"
        style={{ width: `${Math.min(100, volume * 2)}%` }}
      ></div>
    </div>
  </div>
));

VolumeIndicator.displayName = 'VolumeIndicator';
export default VolumeIndicator;
