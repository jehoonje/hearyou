import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../app/contexts/LanguageContext';
import { Shield, Eye, Flag, Ban, Clock, AlertTriangle } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onAgree?: () => void;
  onDisagree?: () => void;
  viewOnly?: boolean; // 보기 전용 모드 추가
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ 
  isOpen, 
  onAgree, 
  onDisagree,
  viewOnly = false // 기본값은 false로 기존 동작 유지
}) => {
  const [show, setShow] = useState(false);
  const { t, language } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(isOpen);
    }, 10);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // 뒤로가기 핸들러
  const handleBack = () => {
    if (viewOnly && onAgree) {
      onAgree(); // viewOnly 모드에서는 onAgree가 모달 닫기 역할
    }
  };

  // 커뮤니티 가이드라인 내용 (언어별)
  const communityGuidelines = {
    ko: {
      title: "커뮤니티 안전 가이드라인",
      noTolerance: "부적절한 콘텐츠 및 학대적 행동 무관용 정책",
      noToleranceDesc: "욕설, 혐오 표현, 성적 콘텐츠, 스팸, 괴롭힘 등은 엄격히 금지되며 즉시 제재됩니다.",
      contentFiltering: "실시간 콘텐츠 필터링",
      contentFilteringDesc: "자동 필터링 시스템으로 부적절한 콘텐츠를 실시간으로 차단합니다.",
      reportingSystem: "신고 및 차단 시스템",
      reportingSystemDesc: "부적절한 콘텐츠나 사용자를 쉽게 신고하고 차단할 수 있습니다.",
      quickResponse: "24시간 내 신속 대응",
      quickResponseDesc: "신고된 내용은 24시간 내에 검토되어 콘텐츠 삭제 및 사용자 제재가 이루어집니다."
    },
    en: {
      title: "Community Safety Guidelines",
      noTolerance: "Zero Tolerance for Objectionable Content and Abusive Behavior",
      noToleranceDesc: "Profanity, hate speech, sexual content, spam, and harassment are strictly prohibited and will result in immediate action.",
      contentFiltering: "Real-time Content Filtering",
      contentFilteringDesc: "Automated filtering systems block inappropriate content in real-time.",
      reportingSystem: "Reporting and Blocking System",
      reportingSystemDesc: "Users can easily report and block inappropriate content or abusive users.",
      quickResponse: "Swift Response Within 24 Hours",
      quickResponseDesc: "Reported content is reviewed within 24 hours, leading to content removal and user sanctions."
    }
  };

  // 개인정보처리방침 내용 (언어별로 분리)
  const privacyContent = {
    ko: {
      title: "개인정보처리방침",
      content: (
        <>
          <p className="mb-2">
            본 개인정보처리방침은 귀하의 개인정보를 보호하고, 「개인정보보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령을 준수하기 위해 작성되었습니다.
          </p>

          <h3 className="font-bold mt-4 mb-2">1. 수집하는 개인정보의 항목</h3>
          <p>
            - 필수 항목: 사용자 ID, 이메일 주소, 비밀번호, 가입일시, 최종 접속일시<br />
            - 선택 항목: Apple 계정 정보(Apple 로그인 시), 음성 인식 키워드(사용자가 기능 ON/OFF 선택 가능)<br />
            - 자동 생성 정보: 채팅 내용, 접속 로그, 앱 사용 정보, 기기정보, 웹뷰 쿠키, IP주소
          </p>

          <h3 className="font-bold mt-4 mb-2">2. 개인정보의 수집 및 이용 목적</h3>
          <p>
            - 회원관리: 회원 식별, 본인 확인, 서비스 부정이용 방지<br />
            - 서비스 제공: Expo 기반 모바일 앱 서비스, 채팅 서비스, Apple 로그인, 음성 인식 서비스<br />
            - 서비스 개선: 이용 통계 분석, 품질 향상, 신규 서비스 개발<br />
            - 음성 인식 키워드: 음성 기반 서비스 제공, 사용자 경험 개선
          </p>

          <h3 className="font-bold mt-4 mb-2">3. 개인정보의 보유 및 이용 기간</h3>
          <p>
            - 회원정보: 회원 탈퇴 시까지 (탈퇴 즉시 파기)<br />
            - 채팅 내용: 서비스 제공 목적 달성 후 지체 없이 파기<br />
            - 음성 인식 키워드: 매일 자정(00:00) 자동 파기, 기능 OFF 시 수집 중지(기존 데이터는 자정까지 보관), 회원 탈퇴 시 즉시 파기<br />
            - 접속 로그: 3개월, 앱 사용 정보: 1년<br />
            - 법령 보존: 전자상거래법(3년), 정보통신망법(6개월) 등 관련 법령에 따라 보관
          </p>

          <h3 className="font-bold mt-4 mb-2">4. 개인정보의 제3자 제공</h3>
          <p>
            - 원칙: 개인정보는 제3자에게 제공되지 않습니다.<br />
            - 예외: 이용자의 사전 동의, 법령의 규정, 수사 목적의 수사기관 요구, 국가안보/범죄수사/공공안전을 위한 관계기관 요청<br />
            - 제공 시 조치: 제공받는 자, 목적, 항목, 보유기간 고지 및 최소한의 정보만 제공
          </p>

          <h3 className="font-bold mt-4 mb-2">5. 개인정보 처리 위탁</h3>
          <p>
            - Supabase Inc.: 데이터베이스 관리 및 서버 운영 (위탁계약 종료시까지)<br />
            - Apple Inc.: Apple 로그인 인증 서비스 (연동 해제시까지)<br />
            - Expo: 모바일 앱 플랫폼 서비스 (앱 서비스 종료시까지)<br />
            - 위탁업체와 개인정보 보호 관련 계약 체결 및 정기 점검 실시
          </p>

          <h3 className="font-bold mt-4 mb-2">6. 개인정보 보호 책임자</h3>
          <p>
            - 개인정보 보호책임자: 임제훈<br />
            - 개인정보 보호담당자: 임제훈<br />
            - 이메일: limjhoon8@gmail.com<br />
            - 소속: 고객지원팀<br />
            - 처리기한: 접수 후 10일 이내 처리
          </p>

          <h3 className="font-bold mt-4 mb-2">7. 이용자의 권리 및 의무</h3>
          <p>
            - 권리: 개인정보 열람, 정정·삭제, 처리정지, 손해배상청구권 행사 가능<br />
            - 행사 방법: 서면, 이메일을 통해 요청 (본인 확인 절차 후 10일 이내 처리)<br />
            - 의무: 정확한 정보 제공, 변경 시 즉시 갱신, 타인 개인정보 침해 금지, ID/비밀번호 관리 책임
          </p>

          <h3 className="font-bold mt-4 mb-2">8. 개인정보의 파기</h3>
          <p>
            - 파기 시점: 이용 목적 달성 또는 보유 기간 만료 후 즉시 파기<br />
            - 파기 방법: 전자적 데이터는 재생 불가능한 기술적 방법, 물리적 문서는 분쇄 또는 소각
          </p>

          <h3 className="font-bold mt-4 mb-2">9. 보안 조치</h3>
          <p>
            - 기술적 조치: 개인정보 및 비밀번호 암호화, 해킹 방지, 접근통제<br />
            - 관리적 조치: 내부관리계획 수립, 직원 교육, 접근권한 관리, 접속기록 보관<br />
            - 물리적 조치: 서버실 보안, 잠금장치 사용
          </p>

          <h3 className="font-bold mt-4 mb-2">10. 쿠키 및 웹뷰 정보 운용</h3>
          <p>
            - 사용 목적: 로그인 상태 유지, 사용자 환경 설정, 서비스 이용 분석, 음성 인식 기능 설정, 앱 성능 최적화<br />
            - 관리: 앱 삭제 시 자동 삭제, 앱 데이터 초기화 가능, 설정에서 개별 기능 ON/OFF 가능
          </p>

          <h3 className="font-bold mt-4 mb-2">11. 개인정보의 국외이전</h3>
          <p>
            - Supabase Inc.(미국): 데이터베이스 관리 및 서버 운영<br />
            - Apple Inc.(미국): Apple 로그인 인증 서비스<br />
            - Expo(미국): 모바일 앱 플랫폼 서비스<br />
            - 국외 이전 시 관련 법령에 따른 고지 및 동의 절차 이행
          </p>

          <h3 className="font-bold mt-4 mb-2">12. 이용자 간 채팅 서비스 면책</h3>
          <p>
            - 회사는 이용자 간 채팅을 통한 거래, 개인정보 유출, 사기 피해, 불법행위, 저작권 침해, 허위정보, 약속 불이행 등에 대해 법적 책임을 지지 않습니다.<br />
            - 모든 책임은 해당 이용자에게 있으며, 분쟁 시 당사자 간 자율 해결해야 합니다.
          </p>

          <h3 className="font-bold mt-4 mb-2">13. 개인정보 침해신고</h3>
          <p>
            - 개인정보 침해신고센터: privacy.go.kr (국번없이 182)<br />
            - 개인정보 분쟁조정위원회: kopico.go.kr (국번없이 1833-6972)<br />
            - 대검찰청 사이버범죄수사단: spo.go.kr (국번없이 1301)<br />
            - 경찰청 사이버안전국: cyberbureau.police.go.kr (국번없이 182)
          </p>

          <h3 className="font-bold mt-4 mb-2">14. 개인정보 처리방침 변경</h3>
          <p>
            - 변경 공지: 변경 7일 전 사전 공지, 중요한 변경사항은 30일 전 공지<br />
            - 시행일자: 2025년 6월 21일<br />
            - 변경사항에 동의하지 않을 경우 서비스 이용 중단 및 탈퇴 가능
          </p>

          <p className="mt-4 text-xs text-gray-400">
            본 개인정보처리방침은 2025년 6월 21일부터 시행됩니다.<br />
            개인정보 관련 문의: limjhoon8@gmail.com
          </p>
        </>
      )
    },
    en: {
      title: "Privacy Policy",
      content: (
        <>
          <p className="mb-2">
            This Privacy Policy has been established to protect your personal information and comply with relevant laws such as the Personal Information Protection Act and the Act on Promotion of Information and Communications Network Utilization and Information Protection.
          </p>

          <h3 className="font-bold mt-4 mb-2">1. Personal Information Items Collected</h3>
          <p>
            - Required items: User ID, email address, password, registration date, last access date<br />
            - Optional items: Apple account information (when using Apple login), voice recognition keywords (user can choose ON/OFF)<br />
            - Automatically generated information: Chat content, access logs, app usage information, device information, webview cookies, IP address
          </p>

          <h3 className="font-bold mt-4 mb-2">2. Purpose of Collection and Use of Personal Information</h3>
          <p>
            - Member management: Member identification, identity verification, prevention of service misuse<br />
            - Service provision: Expo-based mobile app service, chat service, Apple login, voice recognition service<br />
            - Service improvement: Usage statistics analysis, quality improvement, new service development<br />
            - Voice recognition keywords: Voice-based service provision, user experience improvement
          </p>

          <h3 className="font-bold mt-4 mb-2">3. Retention and Use Period of Personal Information</h3>
          <p>
            - Member information: Until member withdrawal (immediate deletion upon withdrawal)<br />
            - Chat content: Deleted immediately after achieving service provision purpose<br />
            - Voice recognition keywords: Automatically deleted daily at midnight (00:00), collection stops when function is OFF (existing data kept until midnight), immediate deletion upon member withdrawal<br />
            - Access logs: 3 months, App usage information: 1 year<br />
            - Legal retention: Stored according to relevant laws such as E-commerce Act (3 years), Information and Communications Network Act (6 months)
          </p>

          <h3 className="font-bold mt-4 mb-2">4. Provision of Personal Information to Third Parties</h3>
          <p>
            - Principle: Personal information is not provided to third parties.<br />
            - Exceptions: Prior consent from users, legal requirements, investigative agency requests for investigation purposes, requests from relevant agencies for national security/criminal investigation/public safety<br />
            - Measures when providing: Notification of recipient, purpose, items, retention period and provision of minimum information only
          </p>

          <h3 className="font-bold mt-4 mb-2">5. Personal Information Processing Consignment</h3>
          <p>
            - Supabase Inc.: Database management and server operation (until consignment contract termination)<br />
            - Apple Inc.: Apple login authentication service (until connection termination)<br />
            - Expo: Mobile app platform service (until app service termination)<br />
            - Personal information protection contracts concluded with consignees and regular inspections conducted
          </p>

          <h3 className="font-bold mt-4 mb-2">6. Personal Information Protection Officer</h3>
          <p>
            - Personal Information Protection Officer: Lim Jehoon<br />
            - Personal Information Protection Manager: Lim Jehoon<br />
            - Email: limjhoon8@gmail.com<br />
            - Department: Customer Support Team<br />
            - Processing deadline: Processed within 10 days of receipt
          </p>

          <h3 className="font-bold mt-4 mb-2">7. Rights and Obligations of Users</h3>
          <p>
            - Rights: Access, correction/deletion, processing suspension, damage compensation claim available<br />
            - Exercise method: Request via written document or email (processed within 10 days after identity verification)<br />
            - Obligations: Provide accurate information, immediate update when changed, prohibition of infringement of others' personal information, responsibility for ID/password management
          </p>

          <h3 className="font-bold mt-4 mb-2">8. Destruction of Personal Information</h3>
          <p>
            - Destruction timing: Immediate destruction after achieving purpose or expiration of retention period<br />
            - Destruction method: Electronic data by irreversible technical methods, physical documents by shredding or incineration
          </p>

          <h3 className="font-bold mt-4 mb-2">9. Security Measures</h3>
          <p>
            - Technical measures: Personal information and password encryption, hacking prevention, access control<br />
            - Administrative measures: Internal management plan establishment, employee training, access authority management, access record storage<br />
            - Physical measures: Server room security, use of locking devices
          </p>

          <h3 className="font-bold mt-4 mb-2">10. Cookie and Webview Information Management</h3>
          <p>
            - Purpose of use: Login status maintenance, user environment settings, service usage analysis, voice recognition function settings, app performance optimization<br />
            - Management: Automatic deletion when app is deleted, app data initialization possible, individual function ON/OFF available in settings
          </p>

          <h3 className="font-bold mt-4 mb-2">11. International Transfer of Personal Information</h3>
          <p>
            - Supabase Inc. (USA): Database management and server operation<br />
            - Apple Inc. (USA): Apple login authentication service<br />
            - Expo (USA): Mobile app platform service<br />
            - Notification and consent procedures according to relevant laws when transferring abroad
          </p>

          <h3 className="font-bold mt-4 mb-2">12. Disclaimer for User-to-User Chat Service</h3>
          <p>
            - The company is not legally responsible for transactions, personal information leakage, fraud damage, illegal activities, copyright infringement, false information, promise defaults, etc. through user-to-user chat.<br />
            - All responsibility lies with the relevant users, and disputes must be resolved autonomously between parties.
          </p>

          <h3 className="font-bold mt-4 mb-2">13. Personal Information Violation Report</h3>
          <p>
            - Personal Information Violation Report Center: privacy.go.kr (182 without area code)<br />
            - Personal Information Dispute Mediation Committee: kopico.go.kr (1833-6972 without area code)<br />
            - Supreme Prosecutors' Office Cyber Crime Investigation Unit: spo.go.kr (1301 without area code)<br />
            - National Police Agency Cyber Safety Bureau: cyberbureau.police.go.kr (182 without area code)
          </p>

          <h3 className="font-bold mt-4 mb-2">14. Changes to Privacy Policy</h3>
          <p>
            - Change notification: Advance notice 7 days before change, 30 days advance notice for important changes<br />
            - Effective date: June 21, 2025<br />
            - Service discontinuation and withdrawal possible if you do not agree to changes
          </p>

          <p className="mt-4 text-xs text-gray-400">
            This Privacy Policy is effective from June 21, 2025.<br />
            Personal information inquiries: limjhoon8@gmail.com
          </p>
        </>
      )
    }
  };

  const currentContent = privacyContent[language as keyof typeof privacyContent] || privacyContent.ko;
  const currentGuidelines = communityGuidelines[language as keyof typeof communityGuidelines] || communityGuidelines.ko;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-auto"
          onClick={viewOnly ? handleBack : undefined}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full h-full max-w-4xl max-h-[100vh] mx-4 my-4 flex flex-col overflow-hidden rounded-xl shadow-2xl shadow-black/40 bg-transparent backdrop-blur-lg border-none p-6"
            onClick={(e:any) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white font-mono mb-4">
              {viewOnly ? (language === "ko" ? "운영 정책" : "Privacy Policy") : currentContent.title}
            </h2>
            
            <div className="text-sm text-gray-300 mb-6 flex-1 overflow-y-auto show-scrollbar">
              {/* 커뮤니티 안전 가이드라인 섹션 추가 */}
              <div className="mb-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="text-blue-400" size={18} />
                  <h3 className="text-base font-semibold text-white">
                    {currentGuidelines.title}
                  </h3>
                </div>
                
                <div className="space-y-3 text-xs text-gray-300">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="text-red-400 mt-0.5 flex-shrink-0" size={14} />
                    <div>
                      <strong className="text-white">{currentGuidelines.noTolerance}</strong>
                      <p className="text-gray-400 mt-1">{currentGuidelines.noToleranceDesc}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Eye className="text-green-400 mt-0.5 flex-shrink-0" size={14} />
                    <div>
                      <strong className="text-white">{currentGuidelines.contentFiltering}</strong>
                      <p className="text-gray-400 mt-1">{currentGuidelines.contentFilteringDesc}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Flag className="text-yellow-400 mt-0.5 flex-shrink-0" size={14} />
                    <div>
                      <strong className="text-white">{currentGuidelines.reportingSystem}</strong>
                      <p className="text-gray-400 mt-1">{currentGuidelines.reportingSystemDesc}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Clock className="text-blue-400 mt-0.5 flex-shrink-0" size={14} />
                    <div>
                      <strong className="text-white">{currentGuidelines.quickResponse}</strong>
                      <p className="text-gray-400 mt-1">{currentGuidelines.quickResponseDesc}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 기존 개인정보처리방침 내용 */}
              {currentContent.content}
            </div>
            
            <div className="flex text-sm justify-end space-x-4">
              {viewOnly ? (
                <button
                  onClick={handleBack}
                  className="btn-aero-gray w-full"
                >
                  {language === "ko" ? "뒤로가기" : "Back"}
                </button>
              ) : (
                <>
                  <button
                    onClick={onDisagree}
                    className="px-4 py-1 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
                  >
                    {t.modal.disagree}
                  </button>
                  <button
                    onClick={onAgree}
                    className="px-6 bg-[#376ECA] hover:bg-gray-200 text-white hover:text-black rounded-full transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#FE4848]"
                  >
                    {t.modal.agree}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrivacyPolicyModal;