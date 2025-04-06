"use client";

import { useEffect, useState, useCallback, useRef, memo, ChangeEvent, FocusEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ThreeScene from "../components/ThreeScene";
import { startAudioAnalysis } from "../utils/audioAnalyzer";
import { useAudioStore } from "../store/useAudioStore";
import { fetchKeywords, Keyword } from "../utils/fetchKeywords";
import { signIn, signUp, signOut } from "../lib/supabase";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

// LoginForm 컴포넌트의 props 타입 정의
interface LoginFormProps {
  authView: "login" | "signup";
  setAuthView: (view: "login" | "signup") => void;
  authMessage: string | null;
  authError: string | null;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  username: string;
  setUsername: (username: string) => void;
  emailError: string;
  setEmailError: (error: string) => void;
  passwordError: string;
  setPasswordError: (error: string) => void;
  usernameError: string;
  setUsernameError: (error: string) => void;
  authLoading: boolean;
  handleLogin: (e: React.FormEvent) => void;
  handleSignUp: (e: React.FormEvent) => void;
  resetFormErrors: () => void;
}

// LoginForm 컴포넌트 분리 - React.memo로 최적화
const LoginForm = memo<LoginFormProps>(({ 
  authView, 
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
  // 인풋 레퍼런스 생성
  const inputRefs = useRef<{
    email: HTMLInputElement | null;
    password: HTMLInputElement | null;
    username: HTMLInputElement | null;
  }>({
    email: null,
    password: null,
    username: null
  });

  // 상태 업데이트로 인한 포커스 손실 방지를 위한 플래그
  const shouldMaintainFocus = useRef(false);
  const activeFieldName = useRef<keyof typeof inputRefs.current | null>(null);
  
  // 입력 변경 핸들러 - useCallback으로 최적화
  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // 현재 활성화된 필드 기록
    activeFieldName.current = name as keyof typeof inputRefs.current;
    shouldMaintainFocus.current = true;
    
    // 상태 업데이트
    if (name === 'email') {
      setEmail(value);
      if (emailError) setEmailError("");
    } else if (name === 'password') {
      setPassword(value);
      if (passwordError) setPasswordError("");
    } else if (name === 'username') {
      setUsername(value);
      if (usernameError) setUsernameError("");
    }
  }, [emailError, passwordError, usernameError, setEmail, setPassword, setUsername, setEmailError, setPasswordError, setUsernameError]);

  // 포커스 이벤트 핸들러
  const handleFocus = useCallback((e: FocusEvent<HTMLInputElement>) => {
    activeFieldName.current = e.target.name as keyof typeof inputRefs.current;
  }, []);

  // 컴포넌트 렌더링 후 포커스 유지
  useEffect(() => {
    // 포커스를 유지해야 하는 경우에만 실행
    if (shouldMaintainFocus.current && activeFieldName.current) {
      const inputRef = inputRefs.current[activeFieldName.current];
      if (inputRef) {
        // requestAnimationFrame을 사용하여 브라우저 렌더링 주기에 맞춤
        requestAnimationFrame(() => {
          inputRef.focus();
          
          // 선택 영역 유지 (커서 위치 유지)
          const length = inputRef.value.length;
          if (inputRef.type !== 'email') {
            inputRef.setSelectionRange(length, length);
          }
          
          // 다음 입력을 위해 플래그 리셋
          shouldMaintainFocus.current = false;
        });
      }
    }
  }, [email, password, username]); // 입력값이 변경될 때만 실행

  // 참조 설정 헬퍼 함수
  const setRef = useCallback((element: HTMLInputElement | null, name: keyof typeof inputRefs.current) => {
    inputRefs.current[name] = element;
  }, []);

  return (
    <div className="w-full max-w-md mx-auto bg-black/70 backdrop-blur-md p-6 rounded-lg border border-gray-700/50 shadow-xl">
      <h1 className="text-2xl font-mono font-bold text-center mb-6 text-white">
        VOICE TRACKER
      </h1>

      {authMessage && (
        <div className="mb-4 p-3 rounded-md text-sm font-mono bg-green-500/30 text-green-200">
          {authMessage}
        </div>
      )}

      {authError && (
        <div className="mb-4 p-3 rounded-md text-sm font-mono bg-red-500/30 text-red-200">
          {authError}
        </div>
      )}

      {authView === "login" ? (
        // 로그인 폼
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-mono text-gray-300 mb-1"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={handleInputChange}
              onFocus={handleFocus}
              ref={(el) => setRef(el, 'email')}
              required
              autoComplete="email"
              className="w-full px-3 py-2 bg-black/30 border border-gray-700 rounded-md text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이메일 주소"
            />
            {emailError && (
              <p className="text-red-400 text-xs mt-1 font-mono">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-mono text-gray-300 mb-1"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={handleInputChange}
              onFocus={handleFocus}
              ref={(el) => setRef(el, 'password')}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 bg-black/30 border border-gray-700 rounded-md text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="비밀번호"
            />
            {passwordError && (
              <p className="text-red-400 text-xs mt-1 font-mono">
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition duration-200"
          >
            {authLoading ? "로그인 중..." : "로그인"}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setAuthView("signup");
                resetFormErrors();
              }}
              className="text-blue-400 hover:text-blue-300 font-mono text-sm"
            >
              계정이 없으신가요? 회원가입
            </button>
          </div>
        </form>
      ) : (
        // 회원가입 폼
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-mono text-gray-300 mb-1"
            >
              사용자 이름
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={handleInputChange}
              onFocus={handleFocus}
              ref={(el) => setRef(el, 'username')}
              required
              className="w-full px-3 py-2 bg-black/30 border border-gray-700 rounded-md text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="사용자 이름"
            />
            {usernameError && (
              <p className="text-red-400 text-xs mt-1 font-mono">
                {usernameError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-mono text-gray-300 mb-1"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={handleInputChange}
              onFocus={handleFocus}
              ref={(el) => setRef(el, 'email')}
              required
              autoComplete="email"
              className="w-full px-3 py-2 bg-black/30 border border-gray-700 rounded-md text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이메일 주소"
            />
            {emailError && (
              <p className="text-red-400 text-xs mt-1 font-mono">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-mono text-gray-300 mb-1"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={handleInputChange}
              onFocus={handleFocus}
              ref={(el) => setRef(el, 'password')}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 bg-black/30 border border-gray-700 rounded-md text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="비밀번호 (6자 이상)"
              minLength={6}
            />
            {passwordError && (
              <p className="text-red-400 text-xs mt-1 font-mono">
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition duration-200"
          >
            {authLoading ? "처리 중..." : "회원가입"}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setAuthView("login");
                resetFormErrors();
              }}
              className="text-blue-400 hover:text-blue-300 font-mono text-sm"
            >
              이미 계정이 있으신가요? 로그인
            </button>
          </div>
        </form>
      )}
    </div>
  );
});

// LoadingScreen 컴포넌트의 props 타입 정의
interface LoadingScreenProps {
  loadingProgress: number;
}

// 로딩 화면 컴포넌트 분리 - 재사용과 렌더링 최적화
const LoadingScreen = memo<LoadingScreenProps>(({ loadingProgress }) => (
  <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700">
    <div className="w-[200px] text-center">
      <h1 className="text-3xl font-mono font-bold mb-6 text-white tracking-wider">
        VOICE TRACKER
      </h1>

      <div className="mb-6 flex flex-col items-center">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500 opacity-75 animate-ping"></div>
          <div className="absolute inset-[25%] rounded-full bg-blue-500"></div>
        </div>
        <p className="text-sm font-mono text-gray-400 mb-2">
          시스템 초기화 중...
        </p>
      </div>

      <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${loadingProgress}%` }}
        ></div>
      </div>
      <p className="text-xs font-mono text-gray-500">
        {Math.round(loadingProgress)}%
      </p>
    </div>
  </div>
));

// 메인 컴포넌트
export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    volume,
    transcript,
    keywords,
    setVolume,
    setTranscript,
    setKeywords,
    clearKeywords,
  } = useAudioStore();

  // 로딩 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);

  // 인증 상태 관리
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<"login" | "signup">("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // 로그인 폼 상태
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  // 폼 유효성 검사 상태
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [usernameError, setUsernameError] = useState("");

  // 이메일 확인 모달
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const [keywordList, setKeywordList] = useState<Keyword[]>([]);
  const [stopAnalysis, setStopAnalysis] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [lastSoundTime, setLastSoundTime] = useState(Date.now());
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 새로 감지된 키워드 표시용
  const [newKeywords, setNewKeywords] = useState<string[]>([]);
  const [keywordTimerId, setKeywordTimerId] = useState<NodeJS.Timeout | null>(
    null
  );

  // 이메일 형식 검증 함수 - useCallback으로 최적화
  const validateEmail = useCallback((email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }, []);

  // 폼 리셋 함수 - useCallback으로 최적화
  const resetFormErrors = useCallback(() => {
    setEmailError("");
    setPasswordError("");
    setUsernameError("");
    setAuthError(null);
  }, []);

  // 사용자 상태 확인
  useEffect(() => {
    // URL 파라미터에서 메시지 가져오기
    const urlMessage = searchParams.get("message");
    if (urlMessage) {
      setAuthMessage(urlMessage);
    }

    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error("사용자 세션 확인 오류:", error);
        setUser(null);
      }
    };

    checkUser();

    // 인증 상태 변경 리스너
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [searchParams]);

  // 로그인 처리 - useCallback으로 최적화
  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormErrors();

    // 입력값 검증
    if (!email.trim()) {
      setEmailError("이메일을 입력해주세요");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("유효한 이메일 주소를 입력하세요");
      return;
    }

    if (!password.trim()) {
      setPasswordError("비밀번호를 입력해주세요");
      return;
    }

    setAuthLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        if (error.message.includes("Invalid login")) {
          setAuthError("이메일 또는 비밀번호가 올바르지 않습니다");
        } else {
          setAuthError(error.message);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setAuthLoading(false);
    }
  }, [email, password, resetFormErrors, validateEmail]);

  // 회원가입 처리 - useCallback으로 최적화
  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormErrors();

    // 입력값 검증
    let isValid = true;

    if (!username.trim()) {
      setUsernameError("사용자 이름을 입력해주세요");
      isValid = false;
    }

    if (!email.trim()) {
      setEmailError("이메일을 입력해주세요");
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError("유효한 이메일 주소를 입력하세요");
      isValid = false;
    }

    if (!password.trim()) {
      setPasswordError("비밀번호를 입력해주세요");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("비밀번호는 최소 6자 이상이어야 합니다");
      isValid = false;
    }

    if (!isValid) return;

    setAuthLoading(true);

    try {
      const { error } = await signUp(email, password, username);

      if (error) {
        if (error.message.includes("already registered")) {
          setEmailError("이미 등록된 이메일 주소입니다");
        } else {
          setAuthError(error.message);
        }
      } else {
        // 회원가입 성공 시 이메일 확인 모달 표시
        setShowVerificationModal(true);
      }
    } catch (err: any) {
      setAuthError(err.message || "회원가입 중 오류가 발생했습니다.");
    } finally {
      setAuthLoading(false);
    }
  }, [email, password, username, resetFormErrors, validateEmail]);

  // 로그아웃 처리 - useCallback으로 최적화
  const handleLogout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  // 시뮬레이션된 로딩 진행 처리
  useEffect(() => {
    // 점진적인 로딩 진행 시뮬레이션
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress > 100) {
        currentProgress = 100;
        clearInterval(interval);

        // 로딩 완료 후 약간의 지연 시간 추가 (UI/UX 개선)
        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);

          // 콘텐츠 페이드인 효과를 위한 지연
          setTimeout(() => {
            setContentVisible(true);
          }, 300);
        }, 500);
      }
      setLoadingProgress(Math.min(currentProgress, 100));
    }, 400);

    return () => {
      clearInterval(interval);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // 키워드 감지 시 이펙트 표시 - 디바운싱 적용
  useEffect(() => {
    if (keywordTimerId) {
      clearTimeout(keywordTimerId);
      setKeywordTimerId(null);
    }

    if (keywords.length > 0) {
      console.log("키워드 감지됨, UI 표시:", keywords);
      setNewKeywords([...keywords]);

      const timerId = setTimeout(() => {
        console.log("키워드 표시 시간 만료, 초기화");
        setNewKeywords([]);
        clearKeywords();
      }, 1000);

      setKeywordTimerId(timerId);
    }

    return () => {
      if (keywordTimerId) {
        clearTimeout(keywordTimerId);
      }
    };
  }, [keywords, clearKeywords]);

  // 음성 활동 감지 효과 - 스로틀링 적용
  useEffect(() => {
    if (volume > 15) {
      setListening(true);
      setLastSoundTime(Date.now());
    } else if (Date.now() - lastSoundTime > 1500) {
      setListening(false);
    }
  }, [volume]);

  // 오디오 분석 시작 - 의존성 최적화
  useEffect(() => {
    if (!isLoading && user) {
      const startAnalysis = async () => {
        try {
          const stop = await startAudioAnalysis(
            (volume) => setVolume(volume),
            (transcript) => setTranscript(transcript),
            (keywords) => setKeywords(keywords)
          );

          if (stop) {
            setStopAnalysis(() => stop);
            setListening(true);
            if (error) setError(null);
          }
        } catch (err: any) {
          const errorMessage =
            err.message ||
            "마이크 접근에 실패했습니다. 권한과 연결 상태를 확인해주세요.";
          setError(errorMessage);
          console.error(err);
        }
      };

      startAnalysis();
    }

    return () => {
      if (stopAnalysis) {
        stopAnalysis();
      }
    };
  }, [isLoading, user, setVolume, setTranscript, setKeywords, error]);

  // 키워드 목록 조회 함수 최적화
  const loadKeywords = useCallback(async () => {
    if (user) {
      const keywords = await fetchKeywords();
      if (keywords) {
        setKeywordList(keywords);
      }
    }
  }, [user]);

  // 주기적으로 키워드 목록 갱신 - 성능 최적화
  useEffect(() => {
    if (!isLoading && user) {
      loadKeywords();
      // 더 긴 간격으로 폴링하여 성능 향상
      const interval = setInterval(loadKeywords, 3000);
      return () => clearInterval(interval);
    }
  }, [isLoading, user, loadKeywords]);

  // 이메일 확인 모달 컴포넌트 - 메모이제이션
  const VerificationModal = memo(() => (
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
          onClick={() => {
            setShowVerificationModal(false);
            setAuthView("login");
            setEmail("");
            setPassword("");
            setUsername("");
            setAuthMessage(
              "회원가입이 완료되었습니다. 이메일 확인 후 로그인해주세요."
            );
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  ));

  return (
    <div className="w-[375px] h-[668px] bg-black text-white mx-auto overflow-hidden relative">
      {/* 로딩 화면 - 메모이제이션된 컴포넌트 사용 */}
      {isLoading && <LoadingScreen loadingProgress={loadingProgress} />}

      {/* 이메일 확인 모달 */}
      {showVerificationModal && <VerificationModal />}

      {/* 메인 콘텐츠 영역 */}
      <div
        className={`w-full h-full relative transition-opacity duration-1000 ${
          contentVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* ThreeScene 배경 - 절대 포지션으로 전체 영역 차지 */}
        <div className="absolute inset-0 w-full h-full">
          <ThreeScene volume={user ? volume : 0} />
        </div>

        {/* 로그인 상태에 따라 다른 UI 표시 */}
        {!user ? (
          // 비로그인 상태: 분리된 로그인 컴포넌트 사용
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto">
            <LoginForm
              authView={authView}
              setAuthView={setAuthView}
              authMessage={authMessage}
              authError={authError}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              username={username}
              setUsername={setUsername}
              emailError={emailError}
              setEmailError={setEmailError}
              passwordError={passwordError}
              setPasswordError={setPasswordError}
              usernameError={usernameError}
              setUsernameError={setUsernameError}
              authLoading={authLoading}
              handleLogin={handleLogin}
              handleSignUp={handleSignUp}
              resetFormErrors={resetFormErrors}
            />
          </div>
        ) : (
          // 로그인 상태: Voice Tracker UI 표시
          <div className="absolute inset-0 flex flex-col w-full h-full pointer-events-none">
            {/* 에러 메시지 - 포인터 이벤트 허용 */}
            {error && (
              <div className="sticky top-0 w-full bg-red-500 text-white p-2 text-center z-50 font-mono pointer-events-auto">
                {error}
              </div>
            )}

            {/* 상단 영역 - 포인터 이벤트 허용 */}
            <div className="p-4 flex-shrink-0 pointer-events-auto">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-mono font-bold flex items-center text-shadow">
                  Voice Tracker
                  {listening && (
                    <span
                      className="ml-2 inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"
                      title="음성 감지 중"
                    ></span>
                  )}
                </h1>

                <div className="flex items-center">
                  <span className="text-xs font-mono mr-2 text-gray-400">
                    {user.email?.split("@")[0]}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs bg-gray-800 hover:bg-gray-700 text-white font-mono py-1 px-2 rounded"
                  >
                    로그아웃
                  </button>
                </div>
              </div>

              {/* 인식된 음성 텍스트 */}
              <div
                className={`backdrop-blur-sm p-3 rounded-lg mb-4 transition-all duration-300 
                          ${
                            transcript
                              ? "border-blue-500 border"
                              : "border border-gray-700/50"
                          }`}
              >
                <h2 className="text-base font-mono font-semibold mb-1 text-shadow">
                  인식된 음성:
                </h2>
                <p
                  className={`text-sm font-mono min-h-[40px] rounded p-2 bg-black/20
                          ${
                            transcript ? "text-white" : "text-gray-400 italic"
                          }`}
                >
                  {transcript || "음성 대기 중... (말씀해 보세요)"}
                </p>
              </div>

              {/* 감지된 키워드 알림 */}
              {newKeywords.length > 0 && (
                <div className="backdrop-blur-lg bg-blue-500/30 p-3 rounded-lg mb-4 animate-pulse border border-blue-300">
                  <h2 className="text-base font-mono font-semibold text-shadow">
                    감지된 키워드:
                  </h2>
                  <p className="text-sm font-mono font-bold">
                    {newKeywords.join(", ")}
                  </p>
                </div>
              )}

              {/* 볼륨 레벨 표시 */}
              <div className="mt-4 text-xs flex items-center justify-between">
                <div className="text-gray-300 font-mono text-shadow">
                  볼륨 레벨:{" "}
                  <span
                    className={volume > 30 ? "text-green-400" : "text-gray-300"}
                  >
                    {Math.round(volume)}
                  </span>
                </div>
                <div className="w-24 h-2 bg-gray-800/70 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-100"
                    style={{ width: `${Math.min(100, volume * 2)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 중앙 여백 */}
            <div className="flex-grow"></div>

            {/* 하단 영역 - 포인터 이벤트 허용 */}
            <div className="p-4 flex-shrink-0 pointer-events-auto">
              <div className="bg-transparent p-3 rounded-lg border border-gray-700/50">
                <h2 className="text-base font-mono font-semibold mb-1 text-shadow">
                  기록된 키워드:
                </h2>
                {keywordList.length > 0 ? (
                  <ul className="mt-1 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900">
                    {keywordList.map((k) => (
                      <li
                        key={k.id}
                        className="text-sm font-mono flex justify-between items-center py-1 border-b border-gray-700/50"
                      >
                        <span className="text-shadow">{k.keyword}</span>
                        <span className="bg-blue-500/70 px-2 py-1 rounded-full text-xs">
                          {k.count}회
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm font-mono text-gray-400">
                    아직 기록된 키워드가 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
