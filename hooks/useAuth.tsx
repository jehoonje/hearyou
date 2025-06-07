'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

export function useAuth(initialSession: Session | null = null) {
  const searchParams = useSearchParams();
  const supabase = createClientComponentClient<Database>();

  // 인증 상태 관리
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // 로그인 폼 상태
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  // 폼 유효성 검사 상태
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // 이메일 확인 모달
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // 회원가입 직후 상태를 추적하는 ref 추가
  const justSignedUpRef = useRef(false);

  // 이메일 형식 검증 함수
  const validateEmail = useCallback((email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }, []);

  // 폼 리셋 함수
  const resetFormErrors = useCallback(() => {
    setEmailError('');
    setPasswordError('');
    setUsernameError('');
    setAuthError(null);
  }, []);

  // 세션 갱신 함수 (429 오류 처리 포함)
  const refreshSession = useCallback(
    async (retryDelay = 0): Promise<void> => {
      if (retryDelay) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          if (error.status === 429) {
            console.warn('429 Too Many Requests, 10초 후 재시도...');
            return refreshSession(10000); // 10초 대기 후 재시도
          }
          throw error;
        }
        setUser(session?.user || null);
      } catch (error: any) {
        console.error('세션 갱신 오류:', error.message);
        setAuthError(error.message || '세션 갱신에 실패했습니다.');
      }
    },
    [supabase.auth]
  );

  // 사용자 상태 확인 및 인증 상태 감지
  useEffect(() => {
    // URL 파라미터에서 메시지 가져오기
    const urlMessage = searchParams.get('message');
    if (urlMessage) {
      setAuthMessage(urlMessage);
    }

    // 초기 세션이 있으면 추가 확인 불필요
    if (initialSession?.user) {
      setUser(initialSession.user);
    } else {
      // 초기 세션 확인 (한 번만 실행)
      refreshSession();
    }

    // 인증 상태 변경 리스너
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event);
      setUser(session?.user || null);
      
      // SIGNED_IN 이벤트 처리 수정
      if (event === 'SIGNED_IN' && session?.user) {
        // 회원가입 직후이고, 이메일이 확인되지 않은 경우에만 모달 표시
        if (justSignedUpRef.current && !session.user.email_confirmed_at) {
          setShowVerificationModal(true);
          justSignedUpRef.current = false; // 플래그 리셋
        }
      } else if (event === 'SIGNED_OUT') {
        setShowVerificationModal(false);
        setAuthView('login');
        justSignedUpRef.current = false; // 로그아웃 시 플래그 리셋
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [searchParams, initialSession, supabase.auth, refreshSession]);

  // 로그인 처리
  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      resetFormErrors();

      // 입력값 검증
      if (!email.trim()) {
        setEmailError('이메일을 입력해주세요');
        return;
      }

      if (!validateEmail(email)) {
        setEmailError('유효한 이메일 주소를 입력하세요');
        return;
      }

      if (!password.trim()) {
        setPasswordError('비밀번호를 입력해주세요');
        return;
      }

      setAuthLoading(true);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login')) {
            setAuthError('이메일 또는 비밀번호가 올바르지 않습니다');
          } else {
            setAuthError(error.message);
          }
        } else {
          // 로그인 성공 시 회원가입 플래그가 false인지 확인
          justSignedUpRef.current = false;
        }
      } catch (err: any) {
        setAuthError(err.message || '로그인 중 오류가 발생했습니다.');
      } finally {
        setAuthLoading(false);
      }
    },
    [email, password, resetFormErrors, validateEmail, supabase.auth]
  );

  // 회원가입 처리
  const handleSignUp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      resetFormErrors();

      // 입력값 검증
      if (!email.trim()) {
        setEmailError('이메일을 입력해주세요');
        return;
      }

      if (!validateEmail(email)) {
        setEmailError('유효한 이메일 주소를 입력하세요');
        return;
      }

      if (!password.trim()) {
        setPasswordError('비밀번호를 입력해주세요');
        return;
      }

      if (!username.trim()) {
        setUsernameError('사용자 이름을 입력해주세요');
        return;
      }

      setAuthLoading(true);

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            setEmailError('이미 등록된 이메일 주소입니다');
          } else {
            setAuthError(error.message);
          }
        } else {
          // 회원가입 성공 시 플래그 설정
          justSignedUpRef.current = true;
          setAuthMessage('회원가입 성공! 이메일 인증을 완료해주세요.');
          setShowVerificationModal(true);
        }
      } catch (err: any) {
        setAuthError(err.message || '회원가입 중 오류가 발생했습니다.');
      } finally {
        setAuthLoading(false);
      }
    },
    [email, password, username, resetFormErrors, validateEmail, supabase.auth]
  );

  // 로그아웃 처리
  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      justSignedUpRef.current = false; // 로그아웃 시 플래그 리셋
    } catch (error: any) {
      setAuthError(error.message || '로그아웃에 실패했습니다.');
    }
  }, [supabase.auth]);

  // 회원가입 완료 후 처리
  const handleVerificationComplete = useCallback(() => {
    setShowVerificationModal(false);
    setAuthView('login');
    setEmail('');
    setPassword('');
    setUsername('');
    setAuthMessage('회원가입이 완료되었습니다. 이메일 확인 후 로그인해주세요.');
    justSignedUpRef.current = false; // 모달 닫을 때 플래그 리셋
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
    handleVerificationComplete,
  };
}