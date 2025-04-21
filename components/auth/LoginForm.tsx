import {
  useRef,
  useEffect,
  useCallback,
  memo,
  ChangeEvent,
  FocusEvent,
  useState, // infoMessage 상태 제거
} from "react";
import { AuthState } from "../../types";
import ThreeDTitle from "./ThreeDTitle";
import { motion, AnimatePresence } from "framer-motion";
// import NotificationBanner from "../../components/NotificationBanner"; // NotificationBanner 제거
import { ChevronRight } from 'lucide-react'; 

// Interface 정의는 동일하게 유지됩니다.
interface LoginFormProps extends AuthState {
  setAuthView: (view: "login" | "signup") => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setUsername: (username: string) => void;
  setEmailError: (error: string) => void;
  setPasswordError: (error: string) => void;
  setUsernameError: (error: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  handleSignUp: (e: React.FormEvent) => void;
  resetFormErrors: () => void;
  isContentVisible: boolean;
}

// --- 애니메이션 Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, y: -120, transition: { staggerChildren: 0.1 } },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

// itemVariants 수정: visible 상태의 y 값을 100으로, formVisible 상태의 y 값을 0으로 설정
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 70 }, // 초기 버튼 등장 시 y: 100
  formVisible: { opacity: 1, y: 0 }, // 폼(인풋창) 등장 시 y: 0
  exit: { opacity: 0, y: 0, transition: { duration: 0.2 } },
};

const titleVariants = {
  initial: { y: 120 },
  buttonsVisible: { y: -250, transition: { type: "spring", stiffness: 100 } }, // 버튼 표시될 때 타이틀 위치 조정
  formVisible: { y: -40, transition: { type: "spring", stiffness: 100 } }, // 폼 표시될 때 타이틀 위치 조정
};

const LoginForm = memo<LoginFormProps>(
  ({
    authView,
    isContentVisible,
    setAuthView,
    authMessage,
    authError,
    email,
    setEmail,
    password,
    setPassword,
    username,
    setUsername,
    emailError,
    setEmailError,
    passwordError,
    setPasswordError,
    usernameError,
    setUsernameError,
    authLoading,
    handleLogin,
    handleSignUp,
    resetFormErrors,
  }) => {
    const inputRefs = useRef<{
      email: HTMLInputElement | null;
      password: HTMLInputElement | null;
      username: HTMLInputElement | null;
    }>({ email: null, password: null, username: null });

    // Apple 로그인 관련 상태 제거
    // const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const shouldMaintainFocus = useRef(false);
    const activeFieldName = useRef<keyof typeof inputRefs.current | null>(null);

    const [animationStage, setAnimationStage] = useState<
      "initial" | "buttonsVisible" | "formVisible"
    >("initial");

    const handleTitleClick = useCallback(() => {
      window.location.href = "/";
    }, []);

    // handleAppleLoginClick 콜백 제거
    // const handleAppleLoginClick = useCallback(() => {
    //   setInfoMessage("Apple 로그인은 아직 구현 중입니다.");
    // }, []);

    const handleInitialSpinComplete = useCallback(() => {
      if (animationStage === "initial") {
        setTimeout(() => {
          setAnimationStage("buttonsVisible");
        }, 100);
      }
    }, [animationStage]);

    const showLoginForm = useCallback(() => {
      if (animationStage === "buttonsVisible") {
        setAnimationStage("formVisible");
        resetFormErrors();
        setAuthView("login");
      }
    }, [animationStage, resetFormErrors, setAuthView]);

    const handleSetAuthView = useCallback(
      (view: "login" | "signup") => {
        if (animationStage === "formVisible") {
          setAuthView(view);
          resetFormErrors();
        }
      },
      [animationStage, setAuthView, resetFormErrors]
    );

    const handleInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        activeFieldName.current = name as keyof typeof inputRefs.current;
        shouldMaintainFocus.current = true;

        if (name === "email") {
          setEmail(value);
          if (emailError) setEmailError("");
        } else if (name === "password") {
          setPassword(value);
          if (passwordError) setPasswordError("");
        } else if (name === "username" && authView === "signup") {
          setUsername(value);
          if (usernameError) setUsernameError("");
        }
      },
      [
        authView,
        emailError,
        passwordError,
        usernameError,
        setEmail,
        setPassword,
        setUsername,
        setEmailError,
        setPasswordError,
        setUsernameError,
      ]
    );

    const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
      activeFieldName.current = e.target.name as keyof typeof inputRefs.current;
      shouldMaintainFocus.current = true;
    }, []);

    useEffect(() => {
      if (
        animationStage === "formVisible" &&
        shouldMaintainFocus.current &&
        activeFieldName.current
      ) {
        const inputRef = inputRefs.current[activeFieldName.current];
        if (inputRef) {
          requestAnimationFrame(() => {
            inputRef.focus();
            const length = inputRef.value.length;
             if (inputRef.type !== "email") { // 이메일 타입 외 필드에서만 커서 끝으로 이동 시도
                try {
                  inputRef.setSelectionRange(length, length);
                } catch (err) {
                  console.warn("Could not set selection range", err);
                }
              }
            shouldMaintainFocus.current = false;
          });
        } else {
          shouldMaintainFocus.current = false;
        }
      } else if (animationStage !== "formVisible") {
        shouldMaintainFocus.current = false;
        activeFieldName.current = null;
      }
    }, [animationStage]);

    const setRef = useCallback(
      (
        element: HTMLInputElement | null,
        name: keyof typeof inputRefs.current
      ) => {
        inputRefs.current[name] = element;
      },
      []
    );

    useEffect(() => {
      if (!isContentVisible) {
        setAnimationStage("initial");
      }
    }, [isContentVisible]);

    return (
      <div className="w-full max-w-md mx-auto p-6 flex flex-col items-center justify-start h-full pt-16 md:pt-24"> {/* 상단 패딩 조정 */}
        {/* 애니메이션 타이틀 컨테이너 */}
        <motion.div
          className="w-full mb-8" // 간격을 위한 margin-bottom 추가
          variants={titleVariants}
          initial="initial"
          animate={animationStage}
          onClick={handleTitleClick}
          style={{ y: 0 }} // y의 초기 시각적 상태
        >
          <ThreeDTitle
            onInitialSpinComplete={handleInitialSpinComplete}
            isContentVisible={isContentVisible}
          />
        </motion.div>

        {/* --- 알림 배너 제거 --- */}
        {/* <div className="fixed top-0 w-80 rounded z-50"> ... </div> */}

        {/* 메시지 (타이틀 아래, 애니메이션 콘텐츠 위에 표시) */}
        <div className="w-full mb-4"> {/* margin-bottom 추가 */}
          {authMessage && !authError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 w-full rounded-md text-sm font-mono bg-green-500/30 text-green-200"
              >
                {authMessage}
              </motion.div>
            )}
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 w-full rounded-md text-sm font-mono bg-red-500/30 text-red-200"
            >
              {authError}
            </motion.div>
          )}
        </div>


        {/* 애니메이션 요소 컨테이너 */}
        {/* 콘텐츠에 따라 min-height 조정 */}
        <div className="w-full relative" style={{ minHeight: "250px" }}>
          <AnimatePresence mode="wait">
            {/* 초기 버튼 */}
            {animationStage === "buttonsVisible" && (
              <motion.div
                key="initialButtons"
                className="flex flex-col items-center w-full" // 버튼 중앙 정렬 유지
                variants={itemVariants} // 컨테이너 애니메이션 적용
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* ===== SIGN IN BUTTON - NEW STYLE ===== */}
                <motion.div
                  variants={itemVariants} // 개별 아이템 애니메이션 적용 (여기서 visible 상태 사용)
                  className="w-full" // 기존 너비 제한 유지
                >
                  {/* 버튼 컨테이너 (새 스타일 적용) */}
                  <div className="relative p-[12px_24px]"> {/* :before 스타일 위한 사용자 정의 클래스 */}

                    {/* 버튼 노이즈 SVG (스타일 적용) */}
                    <svg viewBox="0 0 100 100" xmlns='http://www.w3.org/2000/svg' preserveAspectRatio="none" className="absolute inset-0 w-full h-full rounded-[15px] opacity-40 overflow-hidden pointer-events-none" style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', mixBlendMode: 'overlay' }}> {/* 블러, 투명도, 블렌드 조정 */}
                      <filter id='buttonNoiseFilterLogin'> {/* 고유 필터 ID */}
                        <feTurbulence type='fractalNoise' baseFrequency='0' numOctaves='4' stitchTiles='stitch' />
                      </filter>
                      <rect width='100%' height='100%' filter='url(#buttonNoiseFilterLogin)' />
                    </svg>

                    {/* 실제 버튼 (스타일 적용) */}
                    <button
                      onClick={showLoginForm}
                      className="relative flex items-center justify-between gap-4 w-full h-14 text-lg leading-none text-[#131313] whitespace-nowrap focus:outline-none transition-transform duration-300 ease-in-out hover:scale-[1.02]" // 높이(h-14), 텍스트 크기/색상 조정, justify-between 추가
                    >
                      {/* 버튼 타이틀 */}
                      <span className="font-semibold transition-colors duration-300 ease-in-out pl-2"> {/* 텍스트 스타일 조정, 패딩 추가 */}
                        Get Started
                      </span>

                      {/* 버튼 아이콘 (스타일 적용) */}
                      <span className="relative z-10 flex items-center justify-center rounded-full h-full aspect-square bg-[#131313] text-[#cdf00f] transition-transform duration-300 ease-in-out"> {/* 색상 적용 */}
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" fill="currentColor" viewBox="0 0 18 26">
                          <ChevronRight/>
                        </svg>
                      </span>
                    </button>
                  </div>
                </motion.div>
                 {/* ===== APPLE SIGN IN BUTTON REMOVED ===== */}
              </motion.div>
            )}

            {/* 로그인/회원가입 폼 */}
            {animationStage === "formVisible" && (
              <motion.div
                key="authForm"
                className="w-full"
                variants={containerVariants}
                initial="hidden"
                animate="visible" // 여기서 visible은 containerVariants의 visible을 의미
                exit="exit"
              >
                {authView === 'login' ? (
                    <motion.form onSubmit={handleLogin} className="space-y-4">
                         <motion.div variants={itemVariants} // 개별 아이템 애니메이션 적용 (여기서 formVisible 상태 사용)
                         >
                            <label htmlFor="email" className="block text-sm font-mono text-gray-300 mb-1">Email</label>
                            <input id="email" name="email" type="email" value={email} onChange={handleInputChange} onFocus={handleFocus} ref={el => setRef(el, 'email')} required autoComplete="email" placeholder="이메일 주소" className="w-full px-3 py-2 bg-transparent backdrop-blur-sm border rounded-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 border-gray-600" />
                            {emailError && <p className="text-red-400 text-xs mt-1 font-mono">{emailError}</p>}
                         </motion.div>
                         <motion.div variants={itemVariants} // 개별 아이템 애니메이션 적용 (여기서 formVisible 상태 사용)
                         >
                            <label htmlFor="password" className="block text-sm font-mono text-gray-300 mb-1">Password</label>
                            <input id="password" name="password" type="password" value={password} onChange={handleInputChange} onFocus={handleFocus} ref={el => setRef(el, 'password')} required autoComplete="current-password" placeholder="비밀번호" className="w-full px-3 py-2 bg-transparent border backdrop-blur-sm rounded-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 border-gray-600" />
                            {passwordError && <p className="text-red-400 text-xs mt-1 font-mono">{passwordError}</p>}
                        </motion.div>
                        <motion.div variants={itemVariants} // 개별 아이템 애니메이션 적용 (여기서 formVisible 상태 사용)
                                    layout>
                                      
                            <button type="submit" disabled={authLoading} className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black text-xs font-mono py-4 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200">
                                {authLoading ? 'Pending...' : 'Sign In'}
                            </button>
                        </motion.div>
                        <motion.div className="text-center mt-4" variants={itemVariants} // 개별 아이템 애니메이션 적용 (여기서 formVisible 상태 사용)
                        >
                            <button type="button" onClick={() => handleSetAuthView('signup')} className="text-gray-400 hover:text-gray-300 font-mono text-sm">
                                계정이 없으신가요? 회원가입
                            </button>
                        </motion.div>
                    </motion.form>
                ) : (
                     <motion.form onSubmit={handleSignUp} className="space-y-4">
                         <motion.div variants={itemVariants} // 개별 아이템 애니메이션 적용 (여기서 formVisible 상태 사용)
                         >
                            <label htmlFor="username" className="block text-sm font-mono text-gray-300 mb-1">Name</label>
                            <input id="username" name="username" type="text" value={username} onChange={handleInputChange} onFocus={handleFocus} ref={el => setRef(el, 'username')} required className="w-full px-3 py-2 bg-transparent border rounded-md backdrop-blur-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 border-gray-600" placeholder="이름" />
                            {usernameError && <p className="text-red-400 text-xs mt-1 font-mono">{usernameError}</p>}
                        </motion.div>
                        <motion.div variants={itemVariants} // 개별 아이템 애니메이션 적용 (여기서 formVisible 상태 사용)
                        >
                            <label htmlFor="email" className="block text-sm font-mono text-gray-300 mb-1">Email</label>
                            <input id="email" name="email" type="email" value={email} onChange={handleInputChange} onFocus={handleFocus} ref={el => setRef(el, 'email')} required autoComplete="email" className="w-full px-3 py-2 bg-black/30 border rounded-md text-white font-mono backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-gray-200 border-gray-600" placeholder="이메일 주소" />
                            {emailError && <p className="text-red-400 text-xs mt-1 font-mono">{emailError}</p>}
                        </motion.div>
                        <motion.div variants={itemVariants} // 개별 아이템 애니메이션 적용 (여기서 formVisible 상태 사용)
                        >
                            <label htmlFor="password" className="block text-sm font-mono text-gray-300 mb-1">Password</label>
                            <input id="password" name="password" type="password" value={password} onChange={handleInputChange} onFocus={handleFocus} ref={el => setRef(el, 'password')} required autoComplete="new-password" minLength={6} className="w-full px-3 py-2 bg-black/30 border rounded-md text-white font-mono backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-gray-200 border-gray-600" placeholder="비밀번호 (6자 이상)" />
                            {passwordError && <p className="text-red-400 text-xs mt-1 font-mono">{passwordError}</p>}
                        </motion.div>
                        <motion.div variants={itemVariants} // 개별 아이템 애니메이션 적용 (여기서 formVisible 상태 사용)
                                    layout>
                            <button type="submit" disabled={authLoading} className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black font-mono py-3 px-4 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200">
                                {authLoading ? '처리 중...' : 'Create account'}
                            </button>
                        </motion.div>
                         <motion.div className="text-center mt-4" variants={itemVariants} // 개별 아이템 애니메이션 적용 (여기서 formVisible 상태 사용)
                         >
                            <button type="button" onClick={() => handleSetAuthView('login')} className="text-gray-400 hover:text-gray-300 font-mono text-sm">
                                이미 계정이 있으신가요? 로그인
                            </button>
                        </motion.div>
                    </motion.form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
);

LoginForm.displayName = "LoginForm";
export default LoginForm;