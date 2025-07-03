// components/auth/LoginForm.tsx

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
import { FaApple } from "react-icons/fa";
import { AuthState } from "../../types";
import ThreeDTitle from "./ThreeDTitle";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import PrivacyPolicyModal from "../PrivacyPolicyModal";
import { useAuth } from "../../app/contexts/AuthContext";
import { useLanguage } from "../../app/contexts/LanguageContext";

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
  onDemoLogin?: () => void;
  handleVerificationComplete: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, y: -80, transition: { staggerChildren: 0.1 } },
  exit: {
    opacity: 0,
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 70 },
  formVisible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const titleVariants = {
  initial: { y: "20vh" },
  buttonsVisible: {
    y: "-30vh",
    transition: { type: "spring", stiffness: 100 },
  },
  formVisible: {
    y: "0vh",
    transition: { type: "spring", stiffness: 100 },
  },
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

    const { t, language } = useLanguage();

    const { startDemoSession, isDemoUser, handleLogout } = useAuth();

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

    // prefers-reduced-motion 지원
    const shouldReduceMotion = useReducedMotion();

    // 타이틀 클릭 시 홈 이동
    const handleTitleClick = useCallback(() => {
      window.location.href = "/";
    }, []);

    // 타이틀 애니메이션 완료 후 버튼 노출
    const handleInitialSpinComplete = useCallback(() => {
      if (animationStage === "initial") {
        setAnimationStage("buttonsVisible");
      }
    }, [animationStage]);

    // 이메일 입력 폼 노출
    const showEmailForm = useCallback(() => {
      if (animationStage === "buttonsVisible") {
        if (isDemoUser) handleLogout();
        setAnimationStage("formVisible");
        setFormStep("emailInput");
        setIsExistingUser(null);
        resetFormErrors();
        setPassword("");
        setUsername("");
        activeFieldName.current = "email";
        shouldMaintainFocus.current = true;
      }
    }, [
      animationStage,
      resetFormErrors,
      setPassword,
      setUsername,
      isDemoUser,
      handleLogout,
    ]);

    // 이메일 제출
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

    // 뒤로가기
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

    // 입력값 변경
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

    // 포커스 관리
    const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
      activeFieldName.current = e.target.name as keyof typeof inputRefs.current;
      shouldMaintainFocus.current = true;
    }, []);

    // 네이티브 앱 감지
    useEffect(() => {
      if (typeof window !== "undefined" && window.ReactNativeWebView) {
        setIsNativeApp(true);
      }
    }, []);

    // 이메일이 비어있으면 폼 초기화
    useEffect(() => {
      if (
        email === "" &&
        (formStep === "passwordInput" || formStep === "signupInput")
      ) {
        handleGoBack();
      }
    }, [email, formStep, handleGoBack]);

    // 포커스 자동 이동
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

    // ref 할당
    const setRef = useCallback(
      (
        element: HTMLInputElement | null,
        name: keyof typeof inputRefs.current
      ) => {
        inputRefs.current[name] = element;
      },
      []
    );

    // 컨텐츠 숨김 시 상태 초기화
    useEffect(() => {
      if (!isContentVisible) {
        setAnimationStage("initial");
        setFormStep("emailInput");
        setIsExistingUser(null);
      }
    }, [isContentVisible]);

    // 개인정보 동의
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

    // 애플 로그인
    const handleAppleLoginRequest = async () => {
      if (isDemoUser) {
        await handleLogout();
      }
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: "APPLE_LOGIN_REQUEST" })
        );
      } else {
        await supabase.auth.signInWithOAuth({ provider: "apple" });
      }
    };

    // prefers-reduced-motion 적용
    const getMotionProps = (variant: string) => {
      if (shouldReduceMotion) {
        return { y: 0, opacity: 1, transition: { duration: 0 } };
      }
      return titleVariants[variant as keyof typeof titleVariants];
    };

    return (
      <div
        className={
          isNativeApp
            ? "w-full h-full mx-auto p-4 flex flex-col items-center justify-start pt-16"
            : "w-full max-w-md mx-auto p-2 flex flex-col items-center justify-start h-full pt-16 md:pt-24"
        }
      >
        <motion.div
          className={isNativeApp ? "w-full mb-8 px-4" : "w-full mb-8"}
          variants={titleVariants}
          initial="initial"
          animate={animationStage}
          style={{
            y: 0,
            willChange: "transform",
            cursor: "pointer",
          }}
          onClick={handleTitleClick}
          aria-label={language === "ko" ? "홈으로 이동" : "Go to home"}
          role="banner"
        >
          <ThreeDTitle
            onInitialSpinComplete={handleInitialSpinComplete}
            isContentVisible={isContentVisible}
          />
        </motion.div>

        <motion.div
          layout
          className={
            isNativeApp ? "w-full px-4 mb-4 h-12" : "w-full mb-4 h-12 -mt-6"
          }
        >
          <AnimatePresence>
            {authMessage && !authError && (
              <motion.div
                key="authMessage"
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 w-full rounded-md text-sm font-mono bg-green-500/30 text-green-200"
                role="status"
                aria-live="polite"
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
                role="alert"
                aria-live="assertive"
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
            aria-hidden="true"
          >
            univoice
          </motion.div>
        )}

        <motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={isNativeApp ? "w-full relative" : "w-full relative"}
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
                  <div
                    className={
                      isNativeApp
                        ? "relative duration-300 ease-in-out hover:scale-[1.02] p-[16px_28px]"
                        : "relative duration-300 ease-in-out hover:scale-[1.02] p-[12px_24px]"
                    }
                  >
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
                      aria-label={t.common.getStarted}
                    >
                      <span className="font-semibold text-gray-100 transition-colors duration-300 ease-in-out pl-2">
                        {t.common.getStarted}
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
                    aria-label={
                      language === "ko" ? "이메일 입력 폼" : "Email input form"
                    }
                  >
                    <motion.div variants={itemVariants} className="h-6" />
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="email"
                        className="block text-sm font-mono text-gray-300 mb-1"
                      >
                        {t.common.email}
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
                        placeholder={t.auth.emailPlaceholder}
                        className={`w-full px-3 py-2 bg-transparent backdrop-blur-sm border rounded-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 ${
                          emailError ? "border-red-500" : "border-gray-600"
                        }`}
                        aria-invalid={!!emailError}
                        aria-describedby={
                          emailError ? "email-error" : undefined
                        }
                      />
                      {emailError && (
                        <p
                          id="email-error"
                          className="text-red-400 text-xs mt-1 font-mono"
                          role="alert"
                        >
                          {emailError}
                        </p>
                      )}
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <button
                        type="submit"
                        disabled={isCheckingEmail}
                        className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black text-sm font-mono py-3 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200 flex items-center justify-center"
                        aria-busy={isCheckingEmail}
                      >
                        {isCheckingEmail
                          ? language === "ko"
                            ? "확인 중..."
                            : "Checking..."
                          : t.common.continue}
                        {!isCheckingEmail && (
                          <ChevronRight className="w-4 h-4 ml-1" />
                        )}
                      </button>
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <div className="flex items-center my-2">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-xs font-mono">
                          {t.common.or}
                        </span>
                        <div className="flex-grow border-t border-gray-600"></div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAppleLoginRequest}
                        disabled={authLoading}
                        className="w-full bg-white hover:bg-gray-200 text-black font-semibold text-sm font-sans py-3 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 transition duration-200 flex items-center justify-center gap-2"
                        aria-label={t.auth.continueWithApple}
                      >
                        <AppleIcon className="w-5 h-5" />
                        <span>{t.auth.continueWithApple}</span>
                      </button>

                      <button
                        type="button"
                        onClick={startDemoSession}
                        className="w-full mt-3 bg-transparent border border-gray-500 hover:bg-gray-800 text-gray-300 hover:text-white font-mono text-sm py-3 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 transition duration-200 flex items-center justify-center gap-2"
                        aria-label={t.auth.quickTour}
                      >
                        <span>{t.auth.quickTour}</span>
                      </button>
                    </motion.div>
                  </motion.form>
                )}

                {formStep === "passwordInput" && isExistingUser === true && (
                  <motion.form
                    onSubmit={handleLogin}
                    className="space-y-4"
                    aria-label={
                      language === "ko"
                        ? "비밀번호 입력 폼"
                        : "Password input form"
                    }
                  >
                    <motion.div variants={itemVariants}>
                      <button
                        type="button"
                        onClick={handleGoBack}
                        className="flex items-center text-sm text-gray-400 hover:text-gray-200 font-mono mb-2"
                        aria-label={t.common.back}
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" /> {t.common.back}
                      </button>
                    </motion.div>
                    <motion.div
                      variants={itemVariants}
                      className="text-gray-300 font-mono text-sm mb-2"
                    >
                      &nbsp;&nbsp;{t.auth.accountInfo}&nbsp;
                      <span className="font-semibold text-white">{email}</span>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="password"
                        className="block text-sm font-mono text-gray-300 mb-1"
                      >
                        {t.common.password}
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
                        placeholder={t.auth.passwordPlaceholder}
                        className={`w-full px-3 py-2 bg-transparent border backdrop-blur-sm rounded-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 ${
                          passwordError ? "border-red-500" : "border-gray-600"
                        }`}
                        aria-invalid={!!passwordError}
                        aria-describedby={
                          passwordError ? "password-error" : undefined
                        }
                      />
                      {passwordError && (
                        <p
                          id="password-error"
                          className="text-red-400 text-xs mt-1 font-mono"
                          role="alert"
                        >
                          {passwordError}
                        </p>
                      )}
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black font-mono py-3 px-4 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200"
                        aria-busy={authLoading}
                      >
                        {authLoading
                          ? t.auth.signupProcessing
                          : t.auth.createAccount}
                      </button>
                    </motion.div>
                  </motion.form>
                )}

                {formStep === "signupInput" && isExistingUser === false && (
                  <motion.form
                    onSubmit={handleSignUp}
                    className="space-y-4"
                    aria-label={
                      language === "ko" ? "회원가입 폼" : "Sign up form"
                    }
                  >
                    <motion.div variants={itemVariants}>
                      <button
                        type="button"
                        onClick={handleGoBack}
                        className="flex items-center text-sm text-gray-400 hover:text-gray-200 font-mono mb-2"
                        aria-label={t.common.back}
                      >
                        <ArrowLeft className="w-4 h-4 mr-1" /> {t.common.back}
                      </button>
                    </motion.div>
                    <motion.div
                      variants={itemVariants}
                      className="text-gray-300 font-mono text-sm mb-2"
                    >
                      {t.auth.signupInfo}
                      <span className="font-semibold text-white">{email}</span>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="username"
                        className="block text-sm font-mono text-gray-300 mb-1"
                      >
                        {t.common.name}
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
                        placeholder={t.auth.namePlaceholder}
                        aria-invalid={!!usernameError}
                        aria-describedby={
                          usernameError ? "username-error" : undefined
                        }
                      />
                      {usernameError && (
                        <p
                          id="username-error"
                          className="text-red-400 text-xs mt-1 font-mono"
                          role="alert"
                        >
                          {usernameError}
                        </p>
                      )}
                    </motion.div>
                    <motion.div variants={itemVariants}>
                      <label
                        htmlFor="password"
                        className="block text-sm font-mono text-gray-300 mb-1"
                      >
                        {t.common.password}
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
                        placeholder={t.auth.passwordHint}
                        aria-invalid={!!passwordError}
                        aria-describedby={
                          passwordError ? "signup-password-error" : undefined
                        }
                      />
                      {passwordError && (
                        <p
                          id="signup-password-error"
                          className="text-red-400 text-xs mt-1 font-mono"
                          role="alert"
                        >
                          {passwordError}
                        </p>
                      )}
                    </motion.div>
                    <motion.div variants={itemVariants} layout>
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black font-mono py-3 px-4 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200"
                        aria-busy={authLoading}
                      >
                        {authLoading
                          ? t.auth.signupProcessing
                          : t.auth.createAccount}
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
