// components/auth/LoginForm.tsx (전체 코드)

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
import { FaApple } from "react-icons/fa"; // <-- 1. 애플 아이콘을 import 합니다.
import { AuthState } from "../../types";
import ThreeDTitle from "./ThreeDTitle";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import PrivacyPolicyModal from "../PrivacyPolicyModal";
import VerificationModal from "./VerificationModal"; // 모달을 여기서 직접 사용하지 않으므로, 필요 없다면 제거 가능합니다.

const AppleIcon = FaApple as React.ElementType;
interface LoginFormProps extends AuthState {
  authView: "login" | "signup";
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
  showVerificationModal: boolean;
  handleVerificationComplete: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, y: -60, transition: { staggerChildren: 0.1 } },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 40 },
  formVisible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const titleVariants = {
  initial: { y: 120 },
  buttonsVisible: { y: -250, transition: { type: "spring", stiffness: 100 } },
  formVisible: { y: -20, transition: { type: "spring", stiffness: 100 } },
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke(
      "check-email-exists",
      {
        body: { email },
      }
    );
    if (error) throw error;
    return data.exists;
  } catch (err) {
    console.error("Failed to check email existence:", err);
    throw new Error("이메일 확인 중 오류가 발생했습니다.");
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

    const [formStep, setFormStep] = useState<
      "emailInput" | "passwordInput" | "signupInput"
    >("emailInput");
    const [isExistingUser, setIsExistingUser] = useState<boolean | null>(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [isNativeApp, setIsNativeApp] = useState(false);

    const handleTitleClick = useCallback(() => {
      window.location.href = "/";
    }, []);

    const handleInitialSpinComplete = useCallback(() => {
      if (animationStage === "initial") {
        setAnimationStage("buttonsVisible");
      }
    }, [animationStage]);

    const showEmailForm = useCallback(() => {
      if (animationStage === "buttonsVisible") {
        setAnimationStage("formVisible");
        setFormStep("emailInput");
        setIsExistingUser(null);
        resetFormErrors();
        setPassword("");
        setUsername("");
        activeFieldName.current = "email";
        shouldMaintainFocus.current = true;
      }
    }, [animationStage, resetFormErrors, setPassword, setUsername]);

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
          const exists = await checkEmailExists(email);
          setIsExistingUser(exists);
          if (exists) {
            setFormStep("passwordInput");
            activeFieldName.current = "password";
          } else {
            setShowPrivacyModal(true);
          }
        } catch (error) {
          setEmailError(
            error instanceof Error ? error.message : "이메일 확인 중 오류 발생"
          );
        } finally {
          setIsCheckingEmail(false);
          shouldMaintainFocus.current = true;
        }
      },
      [email, setEmailError, resetFormErrors]
    );

    const handleGoBack = useCallback(() => {
      setFormStep("emailInput");
      setIsExistingUser(null);
      resetFormErrors();
      setPassword("");
      setUsername("");
      setPasswordError("");
      setUsernameError("");
      activeFieldName.current = "email";
      shouldMaintainFocus.current = true;
    }, [
      resetFormErrors,
      setPassword,
      setUsername,
      setPasswordError,
      setUsernameError,
    ]);

    const handleInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        activeFieldName.current = name as keyof typeof inputRefs.current;
        shouldMaintainFocus.current = true;

        if (name === "email") setEmail(value);
        if (name === "password") setPassword(value);
        if (name === "username") setUsername(value);

        if (emailError && name === "email") setEmailError("");
        if (passwordError && name === "password") setPasswordError("");
        if (usernameError && name === "username") setUsernameError("");
      },
      [
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
      if (typeof window !== 'undefined' && window.ReactNativeWebView) {
        setIsNativeApp(true);
      }
    }, []);

    useEffect(() => {
      if (
        email === "" &&
        (formStep === "passwordInput" || formStep === "signupInput")
      ) {
        handleGoBack();
      }
    }, [email, formStep, handleGoBack]);

    useEffect(() => {
      if (
        animationStage === "formVisible" &&
        shouldMaintainFocus.current &&
        activeFieldName.current &&
        !isCheckingEmail
      ) {
        const inputRef = inputRefs.current[activeFieldName.current];
        if (inputRef) {
          requestAnimationFrame(() => {
            inputRef.focus();
            shouldMaintainFocus.current = false;
          });
        }
      }
    }, [animationStage, formStep, isCheckingEmail]);

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
        setFormStep("emailInput");
        setIsExistingUser(null);
      }
    }, [isContentVisible]);

    const handleAgree = useCallback(() => {
      setShowPrivacyModal(false);
      setFormStep("signupInput");
      activeFieldName.current = "username";
      shouldMaintainFocus.current = true;
    }, []);

    const handleDisagree = useCallback(() => {
      setShowPrivacyModal(false);
      setFormStep("emailInput");
      activeFieldName.current = "email";
      shouldMaintainFocus.current = true;
    }, []);

    const handleAppleLoginRequest = async () => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: "APPLE_LOGIN_REQUEST" })
        );
      } else {
        await supabase.auth.signInWithOAuth({ provider: "apple" });
      }
    };

    return (
      <div className={
        isNativeApp 
          ? "w-full h-full mx-auto p-4 flex flex-col items-center justify-start pt-16"
          : "w-full max-w-md mx-auto p-2 flex flex-col items-center justify-start h-full pt-16 md:pt-24"
      }>
        <motion.div
          className={isNativeApp ? "w-full mb-8 px-4" : "w-full mb-8"}
          variants={titleVariants}
          initial="initial"
          animate={animationStage}
          style={{ y: 0 }}
        >
          <ThreeDTitle
            onInitialSpinComplete={handleInitialSpinComplete}
            isContentVisible={isContentVisible}
          />
        </motion.div>

        {/* ▼▼▼ 이 div를 motion.div로 바꾸고 layout prop을 추가합니다 ▼▼▼ */}
        <motion.div 
          layout 
          className={isNativeApp ? "w-full px-4 mb-4 h-12" : "w-full mb-4 h-12 -mt-6"}
        >
          <AnimatePresence>
            {authMessage && !authError && (
              <motion.div
                key="authMessage"
                layout // 자식 요소에도 layout을 추가하여 더 부드러운 애니메이션을 만듭니다.
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 w-full rounded-md text-sm font-mono bg-green-500/30 text-green-200"
              >
                {authMessage}
              </motion.div>
            )}
            {authError && !emailError && (
              <motion.div
                key="authError"
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 w-full rounded-md text-sm font-mono bg-red-500/30 text-red-200"
              >
                {authError}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {animationStage === "buttonsVisible" && (
          <motion.div
          className={
            isNativeApp 
              ? "absolute top-32 left-10 text-gray-300 font-mono text-md"
              : "absolute top-32 left-10 text-gray-300 font-mono text-md"
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
            univoice
          </motion.div>
        )}

<motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={
            isNativeApp 
              ? "w-full relative"
              : "w-full relative"
          }
          style={isNativeApp ? undefined : { minHeight: "350px" }}
        >
          <AnimatePresence mode="wait">
            {animationStage === "buttonsVisible" && (
              <motion.div
                key="initialButtons"
                className={
                  isNativeApp 
                    ? "flex flex-col items-center w-full"
                    : "flex flex-col items-center w-full"
                }
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div variants={itemVariants} className="w-full">
                <div className={
                    isNativeApp 
                      ? "relative duration-300 ease-in-out hover:scale-[1.02] p-[16px_28px]"
                      : "relative duration-300 ease-in-out hover:scale-[1.02] p-[12px_24px]"
                  }>
                    <svg
                      viewBox="0 0 100 100"
                      xmlns="http://www.w3.org/2000/svg"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full rounded-[50px] opacity-40 overflow-hidden pointer-events-none"
                      style={{
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        mixBlendMode: "overlay",
                      }}
                    >
                      <filter id="buttonNoiseFilterLogin">
                        <feTurbulence
                          type="fractalNoise"
                          baseFrequency="1"
                          numOctaves="4"
                          stitchTiles="stitch"
                        />
                      </filter>
                      <rect
                        width="100%"
                        height="100%"
                        filter="url(#buttonNoiseFilterLogin)"
                      />
                    </svg>
                    <button
                      onClick={showEmailForm}
                      className={
                        isNativeApp 
                          ? "relative flex items-center justify-between gap-4 w-full h-16 text-lg leading-none text-[#131313] whitespace-nowrap focus:outline-none transition-transform duration-300 ease-in-out"
                          : "relative flex items-center justify-between gap-4 w-full h-14 text-lg leading-none text-[#131313] whitespace-nowrap focus:outline-none transition-transform duration-300 ease-in-out"
                      }
                    >
                      <span className="font-semibold text-gray-100 transition-colors duration-300 ease-in-out pl-2">
                        Get Started
                      </span>
                      <span className="relative z-10 flex items-center justify-center rounded-full h-full aspect-square bg-transparent text-gray-100 transition-transform duration-300 ease-in-out">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path
                            fillRule="evenodd"
                            d="M13.147.829h-11v2h9.606L.672 13.91l1.414 1.415 11.06-11.061v9.565h2v-13z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                      </span>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {animationStage === "formVisible" && (
              <motion.div
              key={formStep}
              className={isNativeApp ? "w-full px-0" : "w-full"}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
                {formStep === "emailInput" && (
                  <motion.form
                  onSubmit={handleEmailSubmit}
                  className={isNativeApp ? "space-y-6" : "space-y-4"}
                >
                    <motion.div
                      variants={itemVariants}
                      className="h-6"
                    ></motion.div>
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="email"
                        className="block text-sm font-mono text-gray-300 mb-1"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={email}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        ref={(el) => setRef(el, "email")}
                        required
                        autoComplete="email"
                        placeholder="이메일 주소"
                        className={`w-full px-3 py-2 bg-transparent backdrop-blur-sm border rounded-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 ${
                          emailError ? "border-red-500" : "border-gray-600"
                        }`}
                      />
                      {emailError && (
                        <p className="text-red-400 text-xs mt-1 font-mono">
                          {emailError}
                        </p>
                      )}
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <button
                        type="submit"
                        disabled={isCheckingEmail}
                        className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black text-sm font-mono py-3 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200 flex items-center justify-center"
                      >
                        {isCheckingEmail ? "확인 중..." : "계속하기"}
                        {!isCheckingEmail && (
                          <ChevronRight className="w-4 h-4 ml-1" />
                        )}
                      </button>
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <div className="flex items-center my-2">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-xs font-mono">
                          OR
                        </span>
                        <div className="flex-grow border-t border-gray-600"></div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAppleLoginRequest}
                        disabled={authLoading}
                        className="w-full bg-white hover:bg-gray-200 text-black font-semibold text-sm font-sans py-3 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 transition duration-200 flex items-center justify-center gap-2"
                      >
                        {/* 2. 기존 svg 태그 대신 FaApple 컴포넌트를 사용합니다. */}
                        <AppleIcon className="w-5 h-5" />
                        <span>Apple로 계속하기</span>
                      </button>
                    </motion.div>
                  </motion.form>
                )}

                {formStep === "passwordInput" && isExistingUser === true && (
                  <motion.form onSubmit={handleLogin} className="space-y-4">
                    <motion.div variants={itemVariants}>
                      <button
                        type="button"
                        onClick={handleGoBack}
                        className="flex items-center text-sm text-gray-400 hover:text-gray-200 font-mono mb-2"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                      </button>
                    </motion.div>
                    <motion.div
                      variants={itemVariants}
                      className="text-gray-300 font-mono text-sm mb-2"
                    >
                      &nbsp;&nbsp;아이디:&nbsp;
                      <span className="font-semibold text-white">{email}</span>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="password"
                        className="block text-sm font-mono text-gray-300 mb-1"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        ref={(el) => setRef(el, "password")}
                        required
                        autoComplete="current-password"
                        placeholder="비밀번호"
                        className={`w-full px-3 py-2 bg-transparent border backdrop-blur-sm rounded-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 ${
                          passwordError ? "border-red-500" : "border-gray-600"
                        }`}
                      />
                      {passwordError && (
                        <p className="text-red-400 text-xs mt-1 font-mono">
                          {passwordError}
                        </p>
                      )}
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black text-sm font-mono py-3 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200"
                      >
                        {authLoading ? "로그인 중..." : "Sign In"}
                      </button>
                    </motion.div>
                  </motion.form>
                )}

                {formStep === "signupInput" && isExistingUser === false && (
                  <motion.form onSubmit={handleSignUp} className="space-y-4">
                    <motion.div variants={itemVariants}>
                      <button
                        type="button"
                        onClick={handleGoBack}
                        className="flex items-center text-sm text-gray-400 hover:text-gray-200 font-mono mb-2"
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" /> 뒤로
                      </button>
                    </motion.div>
                    <motion.div
                      variants={itemVariants}
                      className="text-gray-300 font-mono text-sm mb-2"
                    >
                      회원가입:
                      <span className="font-semibold text-white">{email}</span>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="username"
                        className="block text-sm font-mono text-gray-300 mb-1"
                      >
                        Name
                      </label>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        value={username}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        ref={(el) => setRef(el, "username")}
                        required
                        className={`w-full px-3 py-2 bg-transparent border rounded-md backdrop-blur-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 ${
                          usernameError ? "border-red-500" : "border-gray-600"
                        }`}
                        placeholder="닉네임"
                      />
                      {usernameError && (
                        <p className="text-red-400 text-xs mt-1 font-mono">
                          {usernameError}
                        </p>
                      )}
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="password"
                        className="block text-sm font-mono text-gray-300 mb-1"
                      >
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        ref={(el) => setRef(el, "password")}
                        required
                        autoComplete="new-password"
                        minLength={6}
                        className={`w-full px-3 py-2 bg-transparent border rounded-md text-white font-mono backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-gray-200 ${
                          passwordError ? "border-red-500" : "border-gray-600"
                        }`}
                        placeholder="비밀번호 (6자 이상)"
                      />
                      {passwordError && (
                        <p className="text-red-400 text-xs mt-1 font-mono">
                          {passwordError}
                        </p>
                      )}
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <button
                        type="submit"
                        disabled={authLoading}
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
        </motion.div>

        <PrivacyPolicyModal
          isOpen={showPrivacyModal}
          onAgree={handleAgree}
          onDisagree={handleDisagree}
        />
      </div>
    );
  }
);

LoginForm.displayName = "LoginForm";
export default LoginForm;
