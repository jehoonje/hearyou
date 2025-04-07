import { memo } from 'react';
import { Keyword } from '../../types';

interface KeywordListProps {
  keywordList: Keyword[];
}

const KeywordList = memo<KeywordListProps>(({ keywordList }) => (
  <div className="bg-transparent p-3 rounded-lg border border-gray-700/50">
    <h2 className="text-base font-mono font-semibold mb-1 text-shadow">
      기록된 키워드:
    </h2>
    {keywordList.length > 0 ? (
      <ul className="mt-1 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
        {keywordList.map((k) => (
          <li
            key={k.id}
            className="text-sm font-mono flex justify-between items-center py-1 border-b border-gray-700/50"
          >
            <span className="text-shadow">{k.keyword}</span>
            <span className="bg-blue-500/70 px-2 py-1 rounded-full text-xs">
              {k.count}회
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm font-mono text-gray-400">
        아직 기록된 키워드가 없습니다.
      </p>
    )}
  </div>
));

KeywordList.displayName = 'KeywordList';
export default KeywordList;
