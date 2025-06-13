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
import { AuthState } from "../../types";
import ThreeDTitle from "./ThreeDTitle";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import PrivacyPolicyModal from "../PrivacyPolicyModal";

interface LoginFormProps extends AuthState {
  authView: 'login' | 'signup';
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
  // 부모로부터 받을 props 추가
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
    showVerificationModal, // prop 사용
    handleVerificationComplete, // prop 사용
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

    const handleTitleClick = useCallback(() => {
      window.location.href = "/";
    }, []);

    const handleInitialSpinComplete = useCallback(() => {
      if (animationStage === "initial") {
        setTimeout(() => setAnimationStage("buttonsVisible"), 100);
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
          setEmailError(error instanceof Error ? error.message : "이메일 확인 중 오류 발생");
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
    }, [resetFormErrors, setPassword, setUsername, setPasswordError, setUsernameError]);

    const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        activeFieldName.current = name as keyof typeof inputRefs.current;
        shouldMaintainFocus.current = true;

        if (name === "email") setEmail(value);
        if (name === "password") setPassword(value);
        if (name === "username") setUsername(value);
        
        if (emailError && name === 'email') setEmailError('');
        if (passwordError && name === 'password') setPasswordError('');
        if (usernameError && name === 'username') setUsernameError('');
      },
      [ emailError, passwordError, usernameError, setEmail, setPassword, setUsername, setEmailError, setPasswordError, setUsernameError ]
    );

    const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
      activeFieldName.current = e.target.name as keyof typeof inputRefs.current;
      shouldMaintainFocus.current = true;
    }, []);

    useEffect(() => {
      if (email === '' && (formStep === 'passwordInput' || formStep === 'signupInput')) {
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
      (element: HTMLInputElement | null, name: keyof typeof inputRefs.current) => {
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
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "APPLE_LOGIN_REQUEST" }));
      } else {
        await supabase.auth.signInWithOAuth({ provider: 'apple' });
      }
    };

    return (
      <div className="w-full max-w-md mx-auto p-2 flex flex-col items-center justify-start h-full pt-16 md:pt-24">
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

        <div className="w-full mb-4 h-12 -mt-6"> 
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

        {animationStage === "buttonsVisible" && (
          <motion.div
            className="absolute top-32 left-10 text-gray-300 font-mono text-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            univoice
          </motion.div>
        )}

        <div className="w-full relative" style={{ minHeight: "350px" }}>
          <AnimatePresence mode="wait">
            {animationStage === "buttonsVisible" && (
              <motion.div
                key="initialButtons"
                className="flex flex-col items-center w-full"
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <motion.div variants={itemVariants} className="w-full">
                  <div className="relative duration-300 ease-in-out hover:scale-[1.02] p-[12px_24px]">
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
                      className="relative flex items-center justify-between gap-4 w-full h-14 text-lg leading-none text-[#131313] whitespace-nowrap focus:outline-none transition-transform duration-300 ease-in-out"
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
                className="w-full"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {formStep === "emailInput" && (
                  <motion.form
                    onSubmit={handleEmailSubmit}
                    className="space-y-4"
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
                        <svg
                          role="img"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M12.152 6.896c-.922 0-2.016.516-2.884 1.484-.943.951-1.635 2.412-1.635 3.84 0 2.333 1.139 3.527 2.246 3.527.422 0 1.25-.281 2.047-.352v-1.922c-.242.035-.555.088-.832.088-.588 0-.922-.316-.922-.848V9.328c0-.422.334-.78.88-.78.21 0 .488.053.801.123v-1.775Z M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0Zm4.857 16.354c-.21.438-.516.88-1.023 1.22-.588.422-1.14.6-1.9.6-.967 0-1.725-.387-2.45-.988-.71-.588-1.22-1.469-1.375-2.282h1.83c.123.532.472.93.9.93.516 0 .88-.334 1.344-.672a27.03 27.03 0 0 0 1.626-1.453c.612-.66.922-1.363.922-2.125 0-1.22-.6-2.247-1.848-2.247-.453 0-1.023.225-1.574.588-.71.531-1.122 1.332-1.122 2.333h-1.834c0-1.332.555-2.613 1.543-3.48.975-.856 2.25-1.31 3.736-1.31.856 0 1.76.28 2.45.832.68.548 1.054 1.363 1.054 2.333 0 .8-.28 1.516-.832 2.14-.54.613-1.363 1.4-2.27 2.172-.088.07-.152.122-.21.187.734.035 1.554.156 1.988.588.352.367.488.82.488 1.254 0 .043-.012.088-.012.133a.85.85 0 0 1-.168.43Zm-8.42-3.438c-.012-2.112 1.3-3.875 3.48-3.875 1.012 0 1.9.351 2.535 1.023v-1.11h1.666v5.828c0 .088 0 .188.012.297H12.92c-.012-.11-.012-.21-.012-.297v-.951c-.68.78-1.636 1.206-2.75 1.206-2.08 0-3.56-1.726-3.56-3.922Z" />
                        </svg>
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
                        <ArrowLeft className="w-4 h-4 mr-1" /> 뒤로
                      </button>
                    </motion.div>
                    <motion.div
                      variants={itemVariants}
                      className="text-gray-300 font-mono text-sm mb-2"
                    >
                      로그인:
                      <span className="font-semibold text-white">
                        {email}
                      </span>
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
                      <span className="font-semibold text-white">
                        {email}
                      </span>
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
        </div>

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