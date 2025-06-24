// components/auth/VerificationModal.tsx

import { memo } from 'react';
import { useLanguage } from '../../app/contexts/LanguageContext';

interface VerificationModalProps {
  onComplete: () => void;
}

const VerificationModal = memo<VerificationModalProps>(({ onComplete }) => {
  const { t } = useLanguage();
  
  return (
    // 모달 뒷배경: 전체 화면을 덮고 약간의 블러 효과를 줌
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20 backdrop-blur-sm">
      
      {/* 모달 컨테이너: 여기에 glass-effect 클래스를 적용 */}
      <div className="w-full max-w-md p-6 glass-effect">
        
        {/* 제목: 텍스트 색상을 검은색으로 변경 */}
        <h2 className="text-2xl text-center font-mono font-bold mb-4 text-black">
          {t.common.done}
        </h2>
        
        {/* 본문: 텍스트 색상을 어두운 회색으로 변경 */}
        <p className="text-center text-gray-100 mb-6 font-mono">
          {t.auth.emailSentDescription}
        </p>
        
        {/* 버튼: 배경색과 대비되도록 텍스트는 흰색으로 유지 */}
        <button
          onClick={onComplete}
          className="w-full glass-effect hover:opacity-80 text-white font-mono font-bold text-sm py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          {t.common.close}
        </button>
      </div>
    </div>
  );
});

VerificationModal.displayName = 'VerificationModal';
export default VerificationModal;