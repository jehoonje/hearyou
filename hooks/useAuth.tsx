'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { supabase } from '../lib/supabase'; // 공유 클라이언트 import


export function useAuth(initialSession: Session | null = null) {
  const searchParams = useSearchParams();

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

  // 메시지 자동 제거를 위한 타이머 ref
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // 메시지 설정 함수 (3초 후 자동 제거)
  const setAuthMessageWithTimer = useCallback((message: string) => {
    setAuthMessage(message);
    
    // 기존 타이머 제거
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    
    // 3초 후 메시지 제거
    messageTimerRef.current = setTimeout(() => {
      setAuthMessage(null);
      messageTimerRef.current = null;
    }, 3000);
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

  useEffect(() => {
    // 네이티브 Apple 인증 데이터 처리 함수
    const handleNativeAuth = async (data: { token?: string; error?: string }) => {
      console.log('[useAuth] 네이티브 인증 데이터 수신:', data);
      
      if (data.error) {
        console.error('[useAuth] Apple 로그인 오류:', data.error);
        setAuthError(data.error);
        setAuthLoading(false);
        return;
      }

      if (data.token) {
        console.log('[useAuth] Apple 토큰으로 Supabase 인증 시작');
        setAuthLoading(true);

        try {
          const { data: authData, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: data.token,
          });

          if (error) {
            console.error('[useAuth] Supabase Apple 인증 오류:', error);
            setAuthError('Apple 계정으로 로그인하는 중 문제가 발생했습니다.');
          } else {
            console.log('[useAuth] Apple 로그인 성공:', authData);
            setAuthError(null);
            // setUser는 onAuthStateChange에서 자동으로 처리됨
          }
        } catch (error: any) {
          console.error('[useAuth] Apple 로그인 처리 중 오류:', error);
          setAuthError(error.message || 'Apple 로그인 중 오류가 발생했습니다.');
        } finally {
          setAuthLoading(false);
        }
      }
    };

    // nativeauth 이벤트 리스너 등록
    const handleNativeAuthEvent = (event: CustomEvent) => {
      const authData = event.detail;
      console.log('[useAuth] nativeauth 이벤트 수신:', authData);
      handleNativeAuth(authData);
    };

    console.log('[useAuth] nativeauth 이벤트 리스너 등록');
    window.addEventListener('nativeauth', handleNativeAuthEvent as EventListener);
    
    // 전역 함수도 설정 (호환성을 위해)
    window.handleNativeAuth = handleNativeAuth;

    return () => {
      console.log('[useAuth] nativeauth 이벤트 리스너 제거');
      window.removeEventListener('nativeauth', handleNativeAuthEvent as EventListener);
      delete window.handleNativeAuth;
    };
  }, [supabase.auth]);

  // 사용자 상태 확인 및 인증 상태 감지
  useEffect(() => {
    // URL 파라미터에서 메시지 가져오기
    const urlMessage = searchParams.get('message');
    if (urlMessage) {
      setAuthMessageWithTimer(urlMessage);
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
      // 타이머 정리
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, [searchParams, initialSession, supabase.auth, refreshSession, setAuthMessageWithTimer]);

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
        console.log('회원가입 시도:', { email, username });
        
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: { 
              username: username.trim() 
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          },
        });
  
        if (error) {
          console.error('회원가입 에러:', error);
          if (error.message.includes('already registered')) {
            setEmailError('이미 등록된 이메일 주소입니다');
          } else {
            setAuthError(error.message);
          }
        } else {
          console.log('회원가입 성공');
          
          // 회원가입 성공 시
          justSignedUpRef.current = true;
          
          // 성공 메시지 설정 (타이머 없이)
          setAuthMessage('회원가입이 완료되었습니다! 이메일을 확인하여 계정을 활성화해주세요.');
          
          // 모달 표시
          setShowVerificationModal(true);
          
          // 여기서는 폼 초기화나 authView 변경을 하지 않음!
          // 모달이 닫힐 때 처리하도록 함
        }
      } catch (err: any) {
        console.error('회원가입 예외 발생:', err);
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
      
      // 추가 상태 초기화
      setEmail('');
      setPassword('');
      setUsername('');
      setAuthView('login');
      setAuthMessage('');
      setAuthError(null);
      justSignedUpRef.current = false;
      
    } catch (error: any) {
      setAuthError(error.message || '로그아웃에 실패했습니다.');
      // 에러가 있어도 로컬 상태는 초기화
      setUser(null);
    }
  }, [supabase.auth]);

  // 회원가입 완료 후 처리
  const handleVerificationComplete = useCallback(() => {
    console.log('이메일 확인 모달 닫기');
    
    setShowVerificationModal(false);
    
    // 모달이 닫힌 후에 폼 초기화 및 첫 화면으로 이동
    setEmail('');
    setPassword('');
    setUsername('');
    setAuthView('login');
    
    // 메시지는 유지하되, 타이머 설정
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    
    // 5초 후 메시지 제거 (모달 닫힌 후 충분히 볼 수 있도록)
    messageTimerRef.current = setTimeout(() => {
      setAuthMessage(null);
      messageTimerRef.current = null;
    }, 5000);
    
    justSignedUpRef.current = false;
  }, []);

  return {
    user,
    authView,
    setAuthView,
    authLoading,
    authError,
    authMessage,
    setAuthMessage: setAuthMessageWithTimer, // 타이머 버전으로 대체
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