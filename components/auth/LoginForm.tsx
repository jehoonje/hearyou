import {
  useRef,
  useEffect,
  useCallback,
  memo,
  ChangeEvent,
  FocusEvent,
  useState,
  FormEvent,
} from "react";
// AuthState 타입을 정의한 파일 경로가 올바른지 확인하세요.
import { AuthState } from "../../types"; // 실제 경로로 수정하세요.
import ThreeDTitle from "./ThreeDTitle"; // 실제 경로로 수정하세요.
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowLeft } from "lucide-react";
// Supabase 클라이언트 import (경로 확인 필요)
import { supabase } from "../../lib/supabase"; // 실제 프로젝트 경로로 수정하세요.

// Interface 정의는 사용자가 제공한 버전 유지
interface LoginFormProps extends AuthState {
  // setAuthView prop 제거 (내부 formStep으로 관리)
  // setAuthView: (view: "login" | "signup") => void;
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

// --- 애니메이션 Variants (사용자가 제공한 버전 유지) ---
const containerVariants = {
  hidden: { opacity: 0 },
  // 사용자가 제공한 y 값 유지 (-60)
  visible: { opacity: 1, y: -60, transition: { staggerChildren: 0.1 } },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  // 사용자가 제공한 y 값 유지 (40)
  visible: { opacity: 1, y: 40 },
  formVisible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const titleVariants = {
  initial: { y: 120 },
  buttonsVisible: { y: -250, transition: { type: "spring", stiffness: 100 } },
  formVisible: { y: -20, transition: { type: "spring", stiffness: 100 } },
};

// --- 이메일 유효성 검사 함수 ---
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// --- Supabase 이메일 확인 함수 (Edge Function 호출) ---
// 이 부분만 최신 버전의 실제 호출 로직으로 교체
const checkEmailExists = async (email: string): Promise<boolean> => {
  console.log(`Checking if email exists via Supabase Edge Function: ${email}`);

  try {
    // 'check-email-exists' 이름의 Edge Function 호출
    const { data, error } = await supabase.functions.invoke('check-email-exists', {
      body: { email } // 함수에 이메일 전달
    });

    // 함수 호출 에러 처리
    if (error) {
      console.error('Error invoking Supabase function:', error);
      throw new Error('이메일 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    console.log('Supabase function response:', data);

    // 함수 응답 데이터 형식 확인 및 반환
    if (typeof data?.exists !== 'boolean') {
        console.error('Invalid response format from Edge Function:', data);
        throw new Error('이메일 확인 응답 형식이 올바르지 않습니다.');
    }
    return data.exists;

  } catch (err) {
    console.error('Failed to check email existence:', err);
    if (err instanceof Error) {
        throw err;
    } else {
        throw new Error('이메일 확인 중 예기치 않은 오류가 발생했습니다.');
    }
  }
};


const LoginForm = memo<LoginFormProps>(
  ({
    isContentVisible,
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

    const shouldMaintainFocus = useRef(false);
    const activeFieldName = useRef<keyof typeof inputRefs.current | null>(null);

    const [animationStage, setAnimationStage] = useState<
      "initial" | "buttonsVisible" | "formVisible"
    >("initial");

    // --- 상태 변수 (사용자 코드와 동일하게 유지) ---
    const [formStep, setFormStep] = useState<
      "emailInput" | "passwordInput" | "signupInput"
    >("emailInput");
    const [isExistingUser, setIsExistingUser] = useState<boolean | null>(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    const handleTitleClick = useCallback(() => {
      window.location.href = "/";
    }, []);

    const handleInitialSpinComplete = useCallback(() => {
      if (animationStage === "initial") {
        setTimeout(() => {
          setAnimationStage("buttonsVisible");
        }, 100);
      }
    }, [animationStage]);

    // 'Get Started' 버튼 클릭 시 호출 (사용자 코드와 동일)
    const showEmailForm = useCallback(() => {
      if (animationStage === "buttonsVisible") {
        setAnimationStage("formVisible");
        setFormStep("emailInput");
        setIsExistingUser(null);
        resetFormErrors();
        setPassword('');
        setUsername('');
        activeFieldName.current = 'email'; // 포커스 준비 추가
        shouldMaintainFocus.current = true;
      }
    }, [animationStage, resetFormErrors, setPassword, setUsername]);


    // 이메일 입력 후 '계속하기' 버튼 클릭 시 호출 (checkEmailExists만 교체)
    const handleEmailSubmit = useCallback(
      async (e: FormEvent) => {
        e.preventDefault();
        if (!isValidEmail(email)) {
          setEmailError("유효한 이메일 주소를 입력해주세요.");
          return;
        }
        setEmailError("");
        setIsCheckingEmail(true);
        resetFormErrors();

        try {
          // *** 교체된 부분: 실제 Supabase Edge Function 호출 ***
          const exists = await checkEmailExists(email);
          setIsExistingUser(exists);

          // 로직은 사용자 코드와 동일하게 유지
          if (exists) {
            setFormStep("passwordInput");
            activeFieldName.current = 'password';
            shouldMaintainFocus.current = true;
          } else {
            setFormStep("signupInput");
            activeFieldName.current = 'username';
            shouldMaintainFocus.current = true;
          }
        } catch (error) {
          console.error("Email check failed:", error);
          // 에러 처리 강화 (checkEmailExists에서 throw된 메시지 사용)
          const errorMessage = error instanceof Error ? error.message : "이메일 확인 중 오류가 발생했습니다.";
          setEmailError(errorMessage);
        } finally {
          setIsCheckingEmail(false);
        }
      },
      [email, setEmailError, resetFormErrors] // 의존성 배열 유지
    );

    // 뒤로가기 버튼 핸들러 (사용자 코드와 동일)
    const handleGoBack = useCallback(() => {
      setFormStep("emailInput");
      setIsExistingUser(null);
      resetFormErrors();
      setPasswordError('');
      setUsernameError('');
      activeFieldName.current = 'email';
      shouldMaintainFocus.current = true;
    }, [resetFormErrors, setPasswordError, setUsernameError]);


    // 입력 변경 핸들러 (사용자 코드와 동일)
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
        } else if (name === "username") {
          setUsername(value);
          if (usernameError) setUsernameError("");
        }
      },
      [
        emailError, passwordError, usernameError,
        setEmail, setPassword, setUsername,
        setEmailError, setPasswordError, setUsernameError,
      ]
    );

    // 포커스 핸들러 (사용자 코드와 동일)
    const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
      activeFieldName.current = e.target.name as keyof typeof inputRefs.current;
      shouldMaintainFocus.current = true;
    }, []);

    // 포커스 유지 로직 (사용자 코드와 동일, isCheckingEmail 조건 추가)
    useEffect(() => {
      if (
        animationStage === "formVisible" &&
        shouldMaintainFocus.current &&
        activeFieldName.current &&
        !isCheckingEmail // 이메일 확인 중에는 포커스 이동 방지
      ) {
        const inputRef = inputRefs.current[activeFieldName.current];
        if (inputRef) {
          requestAnimationFrame(() => {
            inputRef.focus();
            if (inputRef.type !== 'email' && inputRef.value.length > 0) {
              const length = inputRef.value.length;
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
      }
    // isCheckingEmail을 의존성 배열에 추가하여 상태 변경 시 로직 재실행
    }, [animationStage, formStep, isCheckingEmail]);

    // Ref 설정 콜백 (사용자 코드와 동일)
    const setRef = useCallback(
      (
        element: HTMLInputElement | null,
        name: keyof typeof inputRefs.current
      ) => {
        inputRefs.current[name] = element;
      },
      []
    );

    // 콘텐츠 가시성 변경 시 초기화 (사용자 코드와 동일)
    useEffect(() => {
      if (!isContentVisible) {
        setAnimationStage("initial");
        setFormStep("emailInput");
        setIsExistingUser(null);
      }
    }, [isContentVisible]);

    // --- JSX 렌더링 (사용자 코드 구조 유지) ---
    return (
      <div className="w-full max-w-md mx-auto p-2 flex flex-col items-center justify-start h-full pt-16 md:pt-24">
        {/* 애니메이션 타이틀 컨테이너 */}
        <motion.div
          className="w-full mb-8"
          variants={titleVariants}
          initial="initial"
          animate={animationStage}
          onClick={handleTitleClick}
          style={{ y: 0 }}
        >
          <ThreeDTitle
            onInitialSpinComplete={handleInitialSpinComplete}
            isContentVisible={isContentVisible}
          />
        </motion.div>

        {/* 메시지 (성공/에러) */}
        <div className="w-full mb-4 h-10"> {/* 고정 높이 추가 */}
          <AnimatePresence>
            {authMessage && !authError && (
              <motion.div
                key="authMessage"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 w-full rounded-md text-sm font-mono bg-green-500/30 text-green-200"
              >
                {authMessage}
              </motion.div>
            )}
            {/* 이메일 에러는 필드 아래 표시되므로, 여기서는 다른 authError만 표시 */}
            {authError && !emailError && (
              <motion.div
                key="authError"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 w-full rounded-md text-sm font-mono bg-red-500/30 text-red-200"
              >
                {authError}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* "univoice" 텍스트 조건부 렌더링 */}
         {animationStage === "buttonsVisible" && (
           <motion.div
             className="absolute top-36 left-10 text-gray-300 font-mono text-md"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.5 }}
           >
             univoice
           </motion.div>
         )}


        {/* 애니메이션 요소 컨테이너 */}
        <div className="w-full relative" style={{ minHeight: "350px" }}>
          <AnimatePresence mode="wait">
            {/* 초기 버튼 ('Get Started') */}
            {animationStage === "buttonsVisible" && (
              // 컨테이너 variants를 itemVariants로 변경 (사용자 코드 기준)
              <motion.div
                key="initialButtons"
                className="flex flex-col items-center w-full"
                variants={itemVariants} // 사용자 코드 기준 variants 적용
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div
                   variants={itemVariants} // 개별 아이템 애니메이션
                   className="w-full"
                 >
                  {/* 버튼 스타일링 */}
                  <div className="relative duration-300 ease-in-out hover:scale-[1.02] p-[12px_24px]">
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="absolute inset-0 w-full h-full rounded-[50px] opacity-40 overflow-hidden pointer-events-none" style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", mixBlendMode: "overlay" }}> <filter id="buttonNoiseFilterLogin"> <feTurbulence type="fractalNoise" baseFrequency="1" numOctaves="4" stitchTiles="stitch" /> </filter> <rect width="100%" height="100%" filter="url(#buttonNoiseFilterLogin)" /> </svg>
                    <button
                      onClick={showEmailForm}
                      className="relative flex items-center justify-between gap-4 w-full h-14 text-lg leading-none text-[#131313] whitespace-nowrap focus:outline-none transition-transform duration-300 ease-in-out "
                    >
                      <span className="font-semibold text-gray-100 transition-colors duration-300 ease-in-out pl-2"> Get Started </span>
                      <span className="relative z-10 flex items-center justify-center rounded-full h-full aspect-square bg-transparent text-gray-100 transition-transform duration-300 ease-in-out"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"> <path fillRule="evenodd" d="M13.147.829h-11v2h9.606L.672 13.91l1.414 1.415 11.06-11.061v9.565h2v-13z" clipRule="evenodd"></path> </svg> </span>
                    </button>
                  </div>
                 </motion.div>
              </motion.div>
            )}

            {/* 이메일 우선 폼 */}
            {animationStage === "formVisible" && (
              <motion.div
                key={formStep}
                className="w-full"
                variants={containerVariants} // 사용자 코드 기준 variants 적용
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* --- 단계 1: 이메일 입력 --- */}
                {formStep === "emailInput" && (
                  <motion.form onSubmit={handleEmailSubmit} className="space-y-4">
                    <motion.div variants={itemVariants} className="h-6"></motion.div>
                    <motion.div variants={itemVariants}>
                      <label htmlFor="email" className="block text-sm font-mono text-gray-300 mb-1"> Email </label>
                      <input
                        id="email" name="email" type="email" value={email}
                        onChange={handleInputChange} onFocus={handleFocus}
                        ref={(el) => setRef(el, "email")} required autoComplete="email"
                        placeholder="이메일 주소"
                        className={`w-full px-3 py-2 bg-transparent backdrop-blur-sm border rounded-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 ${emailError ? 'border-red-500' : 'border-gray-600'}`}
                      />
                      {emailError && ( <p className="text-red-400 text-xs mt-1 font-mono">{emailError}</p> )}
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <button
                        type="submit" disabled={isCheckingEmail}
                        className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black text-sm font-mono py-3 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200 flex items-center justify-center"
                      >
                        {isCheckingEmail ? "확인 중..." : "계속하기"}
                        {!isCheckingEmail && <ChevronRight className="w-4 h-4 ml-1" />}
                      </button>
                    </motion.div>
                  </motion.form>
                )}

                {/* --- 단계 2: 비밀번호 입력 (로그인) --- */}
                {formStep === "passwordInput" && isExistingUser === true && (
                  <motion.form onSubmit={handleLogin} className="space-y-4">
                     <motion.div variants={itemVariants}>
                      <button type="button" onClick={handleGoBack} className="flex items-center text-sm text-gray-400 hover:text-gray-200 font-mono mb-2"> <ArrowLeft className="w-4 h-4 mr-1" /> 뒤로 </button>
                    </motion.div>
                     <motion.div variants={itemVariants} className="text-gray-300 font-mono text-sm mb-2"> 로그인: <span className="font-semibold text-white">{email}</span> </motion.div>
                    <motion.div variants={itemVariants}>
                      <label htmlFor="password" className="block text-sm font-mono text-gray-300 mb-1"> Password </label>
                      <input
                        id="password" name="password" type="password" value={password}
                        onChange={handleInputChange} onFocus={handleFocus}
                        ref={(el) => setRef(el, "password")} required autoComplete="current-password"
                        placeholder="비밀번호"
                        className={`w-full px-3 py-2 bg-transparent border backdrop-blur-sm rounded-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 ${passwordError ? 'border-red-500' : 'border-gray-600'}`}
                      />
                      {passwordError && ( <p className="text-red-400 text-xs mt-1 font-mono">{passwordError}</p> )}
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <button
                        type="submit" disabled={authLoading}
                        className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black text-sm font-mono py-3 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200"
                      >
                        {authLoading ? "로그인 중..." : "Sign In"}
                      </button>
                    </motion.div>
                  </motion.form>
                )}

                {/* --- 단계 3: 이름 + 비밀번호 입력 (회원가입) --- */}
                {formStep === "signupInput" && isExistingUser === false && (
                  <motion.form onSubmit={handleSignUp} className="space-y-4">
                    <motion.div variants={itemVariants}>
                       <button type="button" onClick={handleGoBack} className="flex items-center text-sm text-gray-400 hover:text-gray-200 font-mono mb-2"> <ArrowLeft className="w-4 h-4 mr-1" /> 뒤로 </button>
                    </motion.div>
                     <motion.div variants={itemVariants} className="text-gray-300 font-mono text-sm mb-2"> 회원가입: <span className="font-semibold text-white">{email}</span> </motion.div>
                    <motion.div variants={itemVariants}>
                      <label htmlFor="username" className="block text-sm font-mono text-gray-300 mb-1"> Name </label>
                      <input
                        id="username" name="username" type="text" value={username}
                        onChange={handleInputChange} onFocus={handleFocus}
                        ref={(el) => setRef(el, "username")} required
                        className={`w-full px-3 py-2 bg-transparent border rounded-md backdrop-blur-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 ${usernameError ? 'border-red-500' : 'border-gray-600'}`}
                        placeholder="이름"
                      />
                      {usernameError && ( <p className="text-red-400 text-xs mt-1 font-mono">{usernameError}</p> )}
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <label htmlFor="password" className="block text-sm font-mono text-gray-300 mb-1"> Password </label>
                      <input
                        id="password" name="password" type="password" value={password}
                        onChange={handleInputChange} onFocus={handleFocus}
                        ref={(el) => setRef(el, "password")} required autoComplete="new-password" minLength={6}
                        className={`w-full px-3 py-2 bg-transparent border rounded-md text-white font-mono backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-gray-200 ${passwordError ? 'border-red-500' : 'border-gray-600'}`}
                        placeholder="비밀번호 (6자 이상)"
                      />
                      {passwordError && ( <p className="text-red-400 text-xs mt-1 font-mono">{passwordError}</p> )}
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <button
                        type="submit" disabled={authLoading}
                        className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black font-mono py-3 px-4 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200"
                      >
                        {authLoading ? "처리 중..." : "Create account"}
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
