import { useRef, useEffect, useCallback, memo, ChangeEvent, FocusEvent, useState } from 'react';
import { AuthState } from '../../types'; // Assuming this path is correct
import ThreeDTitle from './ThreeDTitle';
import { motion, AnimatePresence } from 'framer-motion'; // Import framer-motion

// Interface definition remains the same
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

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  exit: { opacity: 0, transition: { staggerChildren: 0.05, staggerDirection: -1 } } // Exit stagger
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } } // Exit animation for items fading out
};

const titleVariants = {
  initial: { y: 120 },
  buttonsVisible: { y: 0, transition: { type: 'spring', stiffness: 100 } }, // Move up
  formVisible: { y: 0, transition: { type: 'spring', stiffness: 100 } } // Move slightly more or stay
};

const LoginForm = memo<LoginFormProps>(({
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
  resetFormErrors
}) => {
  const inputRefs = useRef<{
    email: HTMLInputElement | null;
    password: HTMLInputElement | null;
    username: HTMLInputElement | null;
  }>({ email: null, password: null, username: null });

  const shouldMaintainFocus = useRef(false);
  const activeFieldName = useRef<keyof typeof inputRefs.current | null>(null);

  const [animationStage, setAnimationStage] = useState<'initial' | 'buttonsVisible' | 'formVisible'>('initial');
  console.log(`LoginForm Render - animationStage: ${animationStage}, isContentVisible: ${isContentVisible}`); // 렌더링 시 상태 로그

  const handleInitialSpinComplete = useCallback(() => {
    console.log("LoginForm: handleInitialSpinComplete called");
    // 상태 업데이트 전 확인: 초기 상태('initial')일 때만 버튼 표시 단계로 진행
    if (animationStage === 'initial') {
        setTimeout(() => {
          console.log("LoginForm: Setting animationStage from 'initial' to 'buttonsVisible'");
          setAnimationStage('buttonsVisible');
        }, 100); // Small delay
    } else {
        console.warn(`LoginForm: handleInitialSpinComplete called but animationStage is already ${animationStage}. Skipping stage change.`);
    }
  }, [animationStage]); // animationStage를 의존성 배열에 포함

  const showLoginForm = useCallback(() => {
    console.log("LoginForm: showLoginForm called (Sign In button clicked)");
    // 버튼 표시 단계('buttonsVisible')에서만 폼 표시 단계로 진행
    if (animationStage === 'buttonsVisible') {
        console.log("LoginForm: Setting animationStage from 'buttonsVisible' to 'formVisible'");
        setAnimationStage('formVisible');
        resetFormErrors();
        setAuthView("login"); // Sign In 버튼은 로그인 폼으로 연결
    } else {
        console.warn(`LoginForm: showLoginForm called but animationStage is ${animationStage}. Skipping stage change.`);
    }
  }, [animationStage, resetFormErrors, setAuthView]); // 필요한 의존성 추가

  const handleSetAuthView = useCallback((view: "login" | "signup") => {
      console.log(`LoginForm: handleSetAuthView called with ${view}. Current stage: ${animationStage}`);
      // 폼이 보이는 상태('formVisible')에서만 뷰 전환 로직 실행
      if (animationStage === 'formVisible') {
          setAuthView(view);
          resetFormErrors();
      } else {
          console.warn(`LoginForm: Cannot switch auth view when stage is ${animationStage}`);
      }
  }, [animationStage, setAuthView, resetFormErrors]); // 필요한 의존성 추가

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    activeFieldName.current = name as keyof typeof inputRefs.current;
    shouldMaintainFocus.current = true; // 입력 시 포커스 유지 플래그 설정

    if (name === 'email') {
      setEmail(value);
      if (emailError) setEmailError("");
    } else if (name === 'password') {
      setPassword(value);
      if (passwordError) setPasswordError("");
    } else if (name === 'username' && authView === 'signup') {
      setUsername(value);
      if (usernameError) setUsernameError("");
    }
  }, [authView, emailError, passwordError, usernameError, setEmail, setPassword, setUsername, setEmailError, setPasswordError, setUsernameError]); // 필요한 모든 의존성 포함

  const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
    activeFieldName.current = e.target.name as keyof typeof inputRefs.current;
    shouldMaintainFocus.current = true; // 포커스 받았을 때도 플래그 설정
  }, []);

  useEffect(() => {
    // 포커스 유지 로직: animationStage가 'formVisible'로 변경되었을 때 실행
    console.log(`LoginForm Focus Effect: animationStage changed to ${animationStage}`);
    if (animationStage === 'formVisible' && shouldMaintainFocus.current && activeFieldName.current) {
      const inputRef = inputRefs.current[activeFieldName.current];
      if (inputRef) {
        requestAnimationFrame(() => {
          console.log(`LoginForm Focus Effect: Focusing on ${activeFieldName.current}`);
          inputRef.focus();
          const length = inputRef.value.length;
          if (inputRef.type !== 'email') {
             try {
               inputRef.setSelectionRange(length, length);
             } catch (err) {
               console.warn("Could not set selection range", err);
             }
          }
          shouldMaintainFocus.current = false; // 포커스 설정 후 플래그 리셋
        });
      } else {
         shouldMaintainFocus.current = false; // 참조 없으면 리셋
      }
    } else if (animationStage !== 'formVisible') {
       // 폼이 안보이면 포커스 관련 상태 초기화
       shouldMaintainFocus.current = false;
       activeFieldName.current = null;
    }
  }, [animationStage]); // animationStage 변경 시에만 실행


  const setRef = useCallback((element: HTMLInputElement | null, name: keyof typeof inputRefs.current) => {
    inputRefs.current[name] = element;
  }, []);


  useEffect(() => {
    // 콘텐츠 표시 상태 변경 감지
    console.log(`LoginForm Visibility Effect: isContentVisible changed to ${isContentVisible}`);
    if (!isContentVisible) {
       console.log("LoginForm: isContentVisible is false. Resetting animationStage to 'initial'.");
       // 콘텐츠가 숨겨질 때 애니메이션 상태를 확실히 초기화
       setAnimationStage('initial');
    }
    // isContentVisible가 true가 되면 ThreeDTitle 내부의 useEffect가 애니메이션 시작을 처리
  }, [isContentVisible]);


  return (
    // Outer container: Added h-full and justify-center for vertical centering
    <div className="w-full max-w-md mx-auto p-6 flex flex-col items-center justify-center h-full">

      {/* Animated Title Container */}
      <motion.div
        className="w-full" // Ensure it takes width for centering canvas
        variants={titleVariants}
        initial="initial" // Always start from initial state visually
        animate={animationStage} // Animate 'y' based on stage
      >
         <ThreeDTitle
          onInitialSpinComplete={handleInitialSpinComplete}
          isContentVisible={isContentVisible} // Pass content visibility state
        />
      </motion.div>

      {/* Messages (Appear above animated content) */}
       {authMessage && !authError && ( // Show only if no error
         <motion.div
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }} // Add exit animation for messages
           className="mb-4 p-3 w-full rounded-md text-sm font-mono bg-green-500/30 text-green-200"
         >
           {authMessage}
         </motion.div>
       )}
       {authError && (
         <motion.div
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }} // Add exit animation for messages
           className="mb-4 p-3 w-full rounded-md text-sm font-mono bg-red-500/30 text-red-200"
         >
           {authError}
         </motion.div>
       )}


      {/* Container for elements that animate in/out */}
      {/* Increased margin-top (mt-8) and adjusted min-height */}
      <div className="w-full mt-8 relative" style={{ minHeight: '280px' }}>
        <AnimatePresence mode='wait'> {/* Use mode='wait' for smoother transitions */}

          {/* Initial Buttons */}
          {animationStage === 'buttonsVisible' && (
            <motion.div
              key="initialButtons"
              className="flex flex-col items-center space-y-4 w-full"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit" // Use the exit variant defined in containerVariants
            >
              <motion.button
                variants={itemVariants} // Apply item animation
                onClick={showLoginForm} // Use callback to show login form
                className="w-full max-w-xs bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black text-sm font-mono py-3 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE4848] transition duration-200"
              >
                Sign In
              </motion.button>
              <motion.button
                variants={itemVariants} // Apply item animation
                disabled // Placeholder for Apple login
                className="w-full max-w-xs bg-[#333] hover:bg-gray-200 text-white hover:text-black text-sm font-mono py-3 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-40 transition duration-200 flex items-center justify-center space-x-2"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 16 16" > <path d="M8.082 1.86a5.05 5.05 0 0 1 4.216 2.457.06.06 0 0 0 .09.016 4.81 4.81 0 0 0 1.78-1.984 7.3 7.3 0 0 0-1.748-.749 4.94 4.94 0 0 0-4.348-.738zM7.918.145a6.04 6.04 0 0 0-4.29 2.159 5.36 5.36 0 0 0-1.765 3.999 5.42 5.42 0 0 0 1.614 3.64c.45.425.94.785 1.459 1.091a4.99 4.99 0 0 0 5.032-.006c.518-.306 1.008-.666 1.458-1.091a5.42 5.42 0 0 0 1.614-3.64 5.36 5.36 0 0 0-1.765-3.999A6.04 6.04 0 0 0 7.918.145zm-.645 11.635a3.05 3.05 0 0 1-1.928-.939 3.05 3.05 0 0 1-.939-1.928 1.35 1.35 0 0 1 .06-.402 1.3 1.3 0 0 1 .45-.738c.23-.22.51-.38.81-.48.3-.1.62-.14.94-.14s.64.04.94.14c.3.1.58.26.81.48.23.21.39.47.45.738.06.13.09.27.06.402a3.05 3.05 0 0 1-.939 1.928 3.05 3.05 0 0 1-1.928.939z"/> </svg>
                 <span>Sign in with Apple</span>
              </motion.button>
            </motion.div>
          )}

          {/* Login/Signup Form */}
          {animationStage === 'formVisible' && (
            <motion.div
              key="authForm"
              className="w-full"
              variants={containerVariants} // Apply container variants for fade-in
              initial="hidden"
              animate="visible"
              exit="exit" // Apply exit animation
            >
              {authView === "login" ? (
                // --- Login Form ---
                <motion.form
                  onSubmit={handleLogin}
                  className="space-y-4"
                  // Variants applied to parent motion.div, no need here unless overriding
                >
                  <motion.div variants={itemVariants}>
                    <label htmlFor="email" className="block text-sm font-mono text-gray-300 mb-1">Email</label>
                    <input
                      id="email" name="email" type="email" value={email}
                      onChange={handleInputChange} onFocus={handleFocus} ref={(el) => setRef(el, 'email')}
                      required autoComplete="email" placeholder="이메일 주소"
                      className="w-full px-3 py-2 bg-transparent backdrop-blur-sm border rounded-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 border-gray-600"
                    />
                    {emailError && <p className="text-red-400 text-xs mt-1 font-mono">{emailError}</p>}
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="password" className="block text-sm font-mono text-gray-300 mb-1">Password</label>
                    <input
                      id="password" name="password" type="password" value={password}
                      onChange={handleInputChange} onFocus={handleFocus} ref={(el) => setRef(el, 'password')}
                      required autoComplete="current-password" placeholder="비밀번호"
                      className="w-full px-3 py-2 bg-transparent border backdrop-blur-sm rounded-md text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 border-gray-600"
                    />
                    {passwordError && <p className="text-red-400 text-xs mt-1 font-mono">{passwordError}</p>}
                  </motion.div>

                  {/* Submit button */}
                  <motion.div variants={itemVariants} layout /* Animate layout changes & fade */ >
                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black text-xs font-mono py-4 px-4 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE4848] disabled:opacity-50 transition duration-200"
                      >
                        {authLoading ? "Pending..." : "Sign In"}
                      </button>
                  </motion.div>

                  {/* Toggle button */}
                  <motion.div
                     className="text-center mt-4"
                     variants={itemVariants} // Also animate this toggle button
                  >
                    <button
                      type="button"
                      onClick={() => handleSetAuthView("signup")} // Use callback
                      className="text-gray-400 hover:text-gray-300 font-mono text-sm"
                    >
                      계정이 없으신가요? 회원가입
                    </button>
                  </motion.div>
                </motion.form>

              ) : (
                // --- Signup Form ---
                <motion.form
                    onSubmit={handleSignUp}
                    className="space-y-4"
                    // Variants applied to parent motion.div
                >
                   <motion.div variants={itemVariants}>
                    <label htmlFor="username" className="block text-sm font-mono text-gray-300 mb-1">Name</label>
                    <input
                      id="username" name="username" type="text" value={username}
                      onChange={handleInputChange} onFocus={handleFocus} ref={(el) => setRef(el, 'username')}
                      required
                      className="w-full px-3 py-2 bg-transparent border rounded-md backdrop-blur-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-gray-200 border-gray-600"
                      placeholder="" // Consider adding placeholder like "이름"
                    />
                    {usernameError && <p className="text-red-400 text-xs mt-1 font-mono">{usernameError}</p>}
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="email" className="block text-sm font-mono text-gray-300 mb-1">Email</label>
                    <input
                      id="email" name="email" type="email" value={email}
                      onChange={handleInputChange} onFocus={handleFocus} ref={(el) => setRef(el, 'email')}
                      required autoComplete="email"
                      className="w-full px-3 py-2 bg-black/30 border rounded-md text-white font-mono backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-gray-200 border-gray-600"
                      placeholder="" // Consider adding placeholder like "이메일 주소"
                    />
                    {emailError && <p className="text-red-400 text-xs mt-1 font-mono">{emailError}</p>}
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <label htmlFor="password" className="block text-sm font-mono text-gray-300 mb-1">Password</label>
                    <input
                      id="password" name="password" type="password" value={password}
                      onChange={handleInputChange} onFocus={handleFocus} ref={(el) => setRef(el, 'password')}
                      required autoComplete="new-password" minLength={6}
                      className="w-full px-3 py-2 bg-black/30 border rounded-md text-white font-mono backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-gray-200 border-gray-600"
                      placeholder="" // Consider adding placeholder like "비밀번호 (6자 이상)"
                    />
                    {passwordError && <p className="text-red-400 text-xs mt-1 font-mono">{passwordError}</p>}
                  </motion.div>

                  {/* Submit button */}
                   <motion.div variants={itemVariants} layout /* Animate layout changes & fade */ >
                        <button
                            type="submit"
                            disabled={authLoading}
                            className="w-full bg-[#FE4848] hover:bg-gray-200 text-white hover:text-black font-mono py-2 px-4 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition duration-200" // Ring color was blue, might want #FE4848?
                        >
                            {authLoading ? "처리 중..." : "Create account"}
                        </button>
                    </motion.div>

                  {/* Toggle button */}
                   <motion.div
                       className="text-center mt-4"
                       variants={itemVariants} // Also animate this toggle button
                   >
                        <button
                          type="button"
                          onClick={() => handleSetAuthView("login")} // Use callback
                          className="text-gray-400 hover:text-gray-300 font-mono text-sm"
                        >
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
});

LoginForm.displayName = 'LoginForm';
export default LoginForm;