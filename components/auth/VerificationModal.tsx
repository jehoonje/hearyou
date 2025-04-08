import { memo } from 'react';

interface VerificationModalProps {
  onComplete: () => void;
}

const VerificationModal = memo<VerificationModalProps>(({ onComplete }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
    <div className="w-full max-w-md bg-gray-900 border border-blue-500 rounded-lg p-6 shadow-xl">
      <h2 className="text-2xl font-mono font-bold mb-4 text-white">
        회원가입 완료
      </h2>
      <p className="text-gray-300 mb-6 font-mono">
        이메일 주소로 확인 링크를 발송했습니다. 계정을 활성화하려면 이메일을
        확인해주세요.
      </p>
      <button
        onClick={onComplete}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        확인
      </button>
    </div>
  </div>
));

VerificationModal.displayName = 'VerificationModal';
export default VerificationModal;
