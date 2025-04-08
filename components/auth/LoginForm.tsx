import { useRef, useEffect, useCallback, memo, ChangeEvent, FocusEvent } from 'react';
import { AuthState } from '../../types';

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
}

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
  
  // 입력 변경 핸들러
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
  }, [email, password, username]);

  // 참조 설정 헬퍼 함수
  const setRef = useCallback((element: HTMLInputElement | null, name: keyof typeof inputRefs.current) => {
    inputRefs.current[name] = element;
  }, []);

  return (
    <div className="w-full max-w-md mx-auto bg-transparent backdrop-blur-md p-6 rounded-lg border border-gray-700/50 shadow-xl">
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
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-mono text-gray-300 mb-1">
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
            <label htmlFor="password" className="block text-sm font-mono text-gray-300 mb-1">
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
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-mono text-gray-300 mb-1">
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
            <label htmlFor="email" className="block text-sm font-mono text-gray-300 mb-1">
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
            <label htmlFor="password" className="block text-sm font-mono text-gray-300 mb-1">
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

LoginForm.displayName = 'LoginForm';
export default LoginForm;
