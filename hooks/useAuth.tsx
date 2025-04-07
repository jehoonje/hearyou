import { useState, useCallback, useEffect } from 'react';
import { User, Session } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function useAuth(initialSession: Session | null = null) {
  const searchParams = useSearchParams();
  // 클라이언트 컴포넌트용 Supabase 클라이언트
  const supabase = createClientComponentClient();

  // 인증 상태 관리 (초기 세션 활용)
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
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

  // 이메일 형식 검증 함수
  const validateEmail = useCallback((email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }, []);

  // 폼 리셋 함수
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

    // 세션이 이미 있는 경우 추가 확인 불필요
    if (initialSession?.user) {
      setUser(initialSession.user);
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
  }, [searchParams, initialSession, supabase]);

  // 로그인 처리
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

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
  }, [email, password, resetFormErrors, validateEmail, supabase]);

  // 회원가입 처리
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

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
  }, [email, password, username, resetFormErrors, validateEmail, supabase]);

  // 로그아웃 처리
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  // 회원가입 완료 후 처리
  const handleVerificationComplete = useCallback(() => {
    setShowVerificationModal(false);
    setAuthView("login");
    setEmail("");
    setPassword("");
    setUsername("");
    setAuthMessage("회원가입이 완료되었습니다. 이메일 확인 후 로그인해주세요.");
  }, []);

  return {
    user,
    authView,
    setAuthView,
    authLoading,
    authError,
    authMessage,
    setAuthMessage,
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
    showVerificationModal,
    setShowVerificationModal,
    handleLogin,
    handleSignUp,
    handleLogout,
    resetFormErrors,
    handleVerificationComplete
  };
}
