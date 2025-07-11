// src/app/contexts/AuthContext.tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { supabase } from '../../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  isDemoUser: boolean;
  authView: 'login' | 'signup';
  setAuthView: (view: 'login' | 'signup') => void;
  authMessage: string;
  setAuthMessage: (message: string) => void;
  authError: string | null;
  setAuthError: (error: string | null) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  username: string;
  setUsername: (username: string) => void;
  emailError: string | null;
  setEmailError: (error: string | null) => void;
  passwordError: string | null;
  setPasswordError: (error: string | null) => void;
  usernameError: string | null;
  setUsernameError: (error: string | null) => void;
  authLoading: boolean;
  setAuthLoading: (loading: boolean) => void;
  showVerificationModal: boolean;
  setShowVerificationModal: (show: boolean) => void;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  handleSignUp: (e: React.FormEvent) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleVerificationComplete: () => void;
  resetFormErrors: () => void;
  startDemoSession: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ 
  children,
  initialSession 
}: { 
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isDemoUser, setIsDemoUser] = useState(false); 
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  
  // Auth listener 초기화 여부 추적
  const authListenerInitialized = useRef(false);
  const nativeAuthHandlerRef = useRef<((data: any) => void) | null>(null);

  const resetFormErrors = useCallback(() => {
    setEmailError(null);
    setPasswordError(null);
    setUsernameError(null);
    setAuthError(null);
  }, []);

  // 데모 세션 시작 함수
  const startDemoSession = useCallback(() => {
    console.log('[AuthContext] 데모 세션 시작');
    
    // 폼 초기화
    setEmail('');
    setPassword('');
    setUsername('');
    resetFormErrors();
    
    // 데모 사용자 설정
    const demoUser = {
      id: 'demo-user-' + Date.now(),
      email: 'demo@univoice.app',
      email_confirmed_at: new Date().toISOString(),
      user_metadata: { username: '체험 사용자' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;
    
    setUser(demoUser);
    setIsDemoUser(true);
    setSession(null);
    setAuthView('login');
    setAuthMessage('체험 모드로 시작되었습니다. 데이터는 저장되지 않습니다.');
    setAuthError(null);
  }, [resetFormErrors]);

  // Auth 상태 변경 리스너 - 한 번만 등록
  useEffect(() => {
    // 이미 초기화되었거나 데모 사용자면 스킵
    if (authListenerInitialized.current || isDemoUser) {
      return;
    }

    console.log('[AuthContext] auth 리스너 등록');
    authListenerInitialized.current = true;
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION은 무시
      if (event === 'INITIAL_SESSION') {
        return;
      }
      
      console.log('[AuthContext] 인증 상태 변경:', event, session?.user?.email);
      
      // 데모 상태가 아닌 경우에만 업데이트
      if (!isDemoUser) {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthLoading(false);
        setAuthError(null);
      }
    });

    return () => {
      console.log('[AuthContext] auth 리스너 정리');
      subscription.unsubscribe();
      authListenerInitialized.current = false;
    };
  }, []); // isDemoUser 의존성 제거

  // 네이티브 앱과의 통신을 위한 리스너 - 한 번만 등록
  useEffect(() => {
    // 네이티브 인증 처리 함수
    const handleNativeAuth = async (data: { token?: string; nonce?: string; error?: string }) => {
      console.log('[AuthContext] handleNativeAuth 호출됨:', data);
      
      if (data.error) {
        console.error('[AuthContext] Native auth error:', data.error);
        setAuthError(data.error);
        setAuthLoading(false);
        return;
      }

      if (data.token && data.nonce) {
        console.log('[AuthContext] Apple 토큰 처리 시작');
        setAuthLoading(true);
        setAuthError(null);

        try {
          const { data: authData, error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: data.token,
            nonce: data.nonce,
          });

          if (error) {
            console.error('[AuthContext] Supabase Apple 인증 오류:', error);
            setAuthError('Apple 계정으로 로그인하는 중 문제가 발생했습니다: ' + error.message);
          } else {
            console.log('[AuthContext] Apple 로그인 성공!', authData);
          }
        } catch (error: any) {
          console.error('[AuthContext] Apple 로그인 처리 중 오류:', error);
          setAuthError(error.message || 'Apple 로그인 중 오류가 발생했습니다.');
        } finally {
          setAuthLoading(false);
        }
      }
    };

    // 이전 핸들러가 있으면 먼저 제거
    if (nativeAuthHandlerRef.current) {
      window.removeEventListener('nativeauth', nativeAuthHandlerRef.current as EventListener);
    }

    // 새 핸들러 등록
    nativeAuthHandlerRef.current = handleNativeAuth;
    window.handleNativeAuth = handleNativeAuth;

    const handleNativeAuthEvent = (event: CustomEvent) => {
      console.log('[AuthContext] nativeauth 이벤트 수신:', event.detail);
      handleNativeAuth(event.detail);
    };

    window.addEventListener('nativeauth', handleNativeAuthEvent as EventListener);

    console.log('[AuthContext] Native auth 리스너 등록 완료');

    return () => {
      delete window.handleNativeAuth;
      window.removeEventListener('nativeauth', handleNativeAuthEvent as EventListener);
      nativeAuthHandlerRef.current = null;
      console.log('[AuthContext] Native auth 리스너 정리 완료');
    };
  }, []); // 빈 의존성 배열

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 데모 사용자인 경우 먼저 데모 세션 종료
    if (isDemoUser) {
      setIsDemoUser(false);
      setUser(null);
      setAuthMessage('');
    }
    
    resetFormErrors();
    setAuthLoading(true);

    try {
      console.log('[AuthContext] 로그인 시도:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      console.log('[AuthContext] 로그인 성공');
      setIsDemoUser(false);
      
    } catch (error) {
      console.error('[AuthContext] 로그인 오류:', error);
      setAuthError(error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authLoading) {
      console.log('[AuthContext] 이미 회원가입 처리 중입니다.');
      return;
    }
    
    // 데모 사용자인 경우 먼저 데모 세션 종료
    if (isDemoUser) {
      setIsDemoUser(false);
      setUser(null);
      setAuthMessage('');
    }
    
    resetFormErrors();
    setAuthLoading(true);

    try {
      console.log('[AuthContext] 회원가입 시도:', email);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (error) throw error;
      
      console.log('[AuthContext] 회원가입 성공');
      setShowVerificationModal(true);
      setIsDemoUser(false);
      
    } catch (error) {
      console.error('[AuthContext] 회원가입 오류:', error);
      setAuthError(error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (isDemoUser) {
        // 데모 사용자 로그아웃
        console.log('[AuthContext] 데모 세션 종료');
        setIsDemoUser(false);
        setUser(null);
        setSession(null);
        setEmail('');
        setPassword('');
        setUsername('');
        setAuthView('login');
        setAuthMessage('');
        setAuthError(null);
        return;
      }

      console.log('[AuthContext] 로그아웃 시작');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('[AuthContext] 로그아웃 성공');
      
      // 상태 초기화
      setUser(null);
      setSession(null);
      setEmail('');
      setPassword('');
      setUsername('');
      setAuthView('login');
      setAuthMessage('');
      setAuthError(null);
      setIsDemoUser(false);
      
    } catch (error) {
      console.error('[AuthContext] 로그아웃 오류:', error);
    }
  };

  const handleVerificationComplete = useCallback(() => {
    setShowVerificationModal(false);
    setAuthView('login');
    setAuthMessage('인증 후 뒤로가기 하여 로그인 해주세요.');
  }, []);

  const value = {
    user,
    session,
    isDemoUser,
    authView,
    setAuthView,
    authMessage,
    setAuthMessage,
    authError,
    setAuthError,
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
    setAuthLoading,
    showVerificationModal,
    setShowVerificationModal,
    handleLogin,
    handleSignUp,
    handleLogout,
    handleVerificationComplete,
    resetFormErrors,
    startDemoSession,
  };

  return (
    <AuthContext.Provider value={value}>
      <div suppressHydrationWarning>
        {children}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}