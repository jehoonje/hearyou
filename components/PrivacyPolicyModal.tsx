import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onDisagree: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onAgree, onDisagree }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(isOpen);
    }, 10);
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed top-10 bg-black/80 rounded-xl flex items-center justify-center z-50 pointer-events-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-[365px] h-[500px] max-w-md flex flex-col overflow-hidden rounded-xl shadow-2xl shadow-black/40 bg-transparent backdrop-blur-lg border border-white/20 border-b-black/30 p-6"
          >
            <h2 className="text-lg font-semibold text-white font-mono mb-4">개인정보처리방침</h2>
            <div className="text-sm text-gray-300 mb-6 max-h-[400px] overflow-y-auto scrollbar-thin">
              <p className="mb-2">
                본 개인정보처리방침은 귀하의 개인정보를 보호하고, 「개인정보보호법」을 준수하기 위해 작성되었습니다.
              </p>

              <h3 className="font-bold mt-4 mb-2">1. 수집하는 개인정보의 항목</h3>
              <p>
                - 필수 항목: 이메일 주소, 사용자 이름(닉네임), 비밀번호, 채팅 내용<br />
                - 선택 항목: 없음
              </p>

              <h3 className="font-bold mt-4 mb-2">2. 개인정보의 수집 및 이용 목적</h3>
              <p>
                - 이메일 주소: 회원가입 및 이용자 식별, 서비스 관련 공지 및 고객 지원, 통계 분석을 통한 서비스 개선<br />
                - 사용자 이름(닉네임): 서비스 내 이용자 식별 및 개인화된 경험 제공<br />
                - 비밀번호: 계정 보안 및 인증<br />
                - 채팅 내용: 채팅 서비스 제공, 콘텐츠 모니터링(부적절한 콘텐츠 방지), 서비스 개선을 위한 분석
              </p>

              <h3 className="font-bold mt-4 mb-2">3. 개인정보의 보유 및 이용 기간</h3>
              <p>
                - 기본 보유 기간: 회원 탈퇴 시까지 개인정보를 보유하며, 탈퇴 즉시 파기합니다.<br />
                - 법적 보존 의무: 관련 법령(예: 전자상거래 등에서의 소비자 보호에 관한 법률)에 따라 거래 기록 등은 일정 기간(예: 5년) 보관 후 파기됩니다.<br />
                - 채팅 내용: 서비스 제공 및 모니터링 목적 달성 후 즉시 파기되며, 법적 요구가 없는 한 장기 보관되지 않습니다.
              </p>

              <h3 className="font-bold mt-4 mb-2">4. 개인정보의 제3자 제공</h3>
              <p>
                - 원칙: 개인정보는 제3자에게 제공되지 않습니다.<br />
                - 예외: 이용자의 명시적 동의가 있는 경우, 법률에 의한 요구(예: 수사 기관, 법원), 서비스 제공에 필수적인 경우(예: 결제 처리 업체)<br />
                - 제공 시 조치: 제공 목적, 항목, 보유 기간을 이용자에게 고지하고 동의를 받습니다.
              </p>

              <h3 className="font-bold mt-4 mb-2">5. 개인정보 처리 위탁</h3>
              <p>
                - 위탁 여부: 개인정보 처리가 위탁되는 경우, 위탁업체와 PIPA 준수를 위한 계약을 체결합니다.<br />
                - 위탁업체 예시: 서버 관리, 결제 처리 등<br />
                - 위탁업체의 의무: 개인정보 보호를 위한 기술적/관리적 조치 이행, 정기적 점검.
              </p>

              <h3 className="font-bold mt-4 mb-2">6. 개인정보 보호 책임자</h3>
              <p>
                - 개인정보 보호책임자: 임제훈, 이메일: limjhoon8@gmail.com<br />
                - 담당 부서: 고객지원팀, 이메일: limjhoon8@gmail.com<br />
                - 이용자는 개인정보 관련 문의나 불만을 위 연락처로 제기할 수 있습니다.
              </p>

              <h3 className="font-bold mt-4 mb-2">7. 이용자의 권리 및 의무</h3>
              <p>
                - 권리: 자신의 개인정보를 열람, 정정, 삭제, 처리 중지를 요청할 수 있습니다.<br />
                - 행사 방법: 개인정보 보호책임자에게 서면, 전화, 이메일로 요청. 요청은 10일 이내 처리됩니다.<br />
                - 의무: 이용자는 정확한 정보를 제공해야 하며, 변경 시 즉시 갱신해야 합니다.
              </p>

              <h3 className="font-bold mt-4 mb-2">8. 개인정보의 파기</h3>
              <p>
                - 파기 시점: 이용 목적 달성 또는 보유 기간 만료 후 즉시 파기.<br />
                - 파기 방법: 전자적 데이터는 재생 불가능한 기술적 방법(예: 데이터 덮어쓰기), 물리적 문서는 분쇄 또는 소각.
              </p>

              <h3 className="font-bold mt-4 mb-2">9. 보안 조치</h3>
              <p>
                - 기술적 조치: 데이터 암호화, 접근 통제 시스템, 방화벽<br />
                - 관리적 조치: 내부 개인정보 보호 정책, 직원 교육, 정기 감사<br />
                - 물리적 조치: 서버 및 데이터 저장소의 물리적 접근 제한
              </p>

              <h3 className="font-bold mt-4 mb-2">10. 쿠키 및 자동 수집 장치</h3>
              <p>
                - 쿠키 사용: 서비스 이용 분석 및 사용자 경험 개선을 위해 쿠키를 사용할 수 있습니다.<br />
                - 거부 방법: 브라우저 설정에서 쿠키를 비활성화할 수 있습니다.<br />
                - 영향: 쿠키 거부 시 일부 서비스 기능이 제한될 수 있습니다.
              </p>

              <h3 className="font-bold mt-4 mb-2">11. 불만 접수 및 처리</h3>
              <p>
                - 접수 창구: 개인정보 보호책임자, 개인정보 분쟁 조정위원회, 개인정보 침해 신고센터, 대검찰청 사이버범죄수사단, 경찰청 사이버안전국<br />
                - 처리 절차: 접수 후 신속히 조사, 결과는 이용자에게 통보.
              </p>

              <h3 className="font-bold mt-4 mb-2">12. 개인정보 처리방침 변경</h3>
              <p>
                - 변경 공지: 정책 변경 시 홈페이지 공지사항 또는 이메일로 사전 고지.<br />
                - 효력 발생: 공지 후 7일 경과 시 적용.
              </p>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={onDisagree}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
              >
                미동의
              </button>
              <button
                onClick={onAgree}
                className="px-4 py-2 bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#FE4848]"
              >
                동의
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrivacyPolicyModal;