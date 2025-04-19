import { memo, useState } from 'react';
import { Keyword } from '../../types'; // 경로가 올바르다고 가정
import { motion, AnimatePresence } from 'framer-motion'; // framer-motion 임포트
// import { MdExpandLess, MdExpandMore } from 'react-icons/md'; // 이전 아이콘 임포트 주석 처리
import { ChevronDown, ChevronUp } from 'lucide-react'; // lucide-react 아이콘 임포트

interface KeywordListProps {
  keywordList: Keyword[];
}

// 애니메이션 Variants 정의 (변경 없음)
const listVariants = {
  hidden: {
    opacity: 0,
    height: 0,
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    },
  },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: {
      duration: 0.3,
      ease: "easeInOut"
    },
  },
};

const KeywordList = memo<KeywordListProps>(({ keywordList }) => {
  // 토글 상태 관리 (변경 없음)
  const [isOpen, setIsOpen] = useState(true);

  // 토글 함수 (변경 없음)
  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="bg-transparent p-1 pt-2 px-3 rounded-lg border border-gray-700/50 overflow-hidden">
      {/* 제목과 토글 버튼 영역 */}
      <div className="flex justify-between items-center mb-1 cursor-pointer" onClick={toggleOpen}>
        <h2 className="text-base font-mono font-semibold text-sm text-shadow">
          Keywords
        </h2>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleOpen();
          }}
          className="text-gray-400 hover:text-white focus:outline-none"
          aria-label={isOpen ? "키워드 목록 접기" : "키워드 목록 펼치기"}
        >
          {/* 상태에 따라 아이콘 변경 (lucide-react 아이콘 사용) */}
          {isOpen ? <ChevronDown size={20} strokeWidth={2} /> : <ChevronUp size={20} strokeWidth={2} />}
          {/* lucide 아이콘은 strokeWidth 같은 추가 속성도 사용 가능 */}
        </button>
      </div>

      {/* 키워드 목록 (애니메이션 적용 - 변경 없음) */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="keywordContent"
            variants={listVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {keywordList.length > 0 ? (
              <ul className="mt-1 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
                {keywordList.map((k) => (
                  <li
                    key={k.id}
                    className="text-sm font-mono flex justify-between items-center py-1 border-b border-gray-700/50 last:border-b-0"
                  >
                    <span className="text-shadow mr-2 break-all">{k.keyword}</span>
                    <span className="bg-blue-500/70 px-2 py-1 rounded-full text-xs flex-shrink-0">
                      {k.count}회
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-mono text-gray-400 mt-1">
                아직 기록된 키워드가 없습니다.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

KeywordList.displayName = 'KeywordList';
export default KeywordList;