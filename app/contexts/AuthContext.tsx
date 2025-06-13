'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { supabase } from '../../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
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
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ 
  children,
  initialSession 
}: { 
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(initialSession);
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

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthContext] 인증 상태 변경:', _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setAuthLoading(false);
      setAuthError(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 네이티브 앱과의 통신을 위한 리스너 - 수정된 버전
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
            nonce: data.nonce, // nonce 추가
          });

          if (error) {
            console.error('[AuthContext] Supabase Apple 인증 오류:', error);
            setAuthError('Apple 계정으로 로그인하는 중 문제가 발생했습니다: ' + error.message);
          } else {
            console.log('[AuthContext] Apple 로그인 성공!', authData);
            // 성공 시 onAuthStateChange가 자동으로 처리
          }
        } catch (error: any) {
          console.error('[AuthContext] Apple 로그인 처리 중 오류:', error);
          setAuthError(error.message || 'Apple 로그인 중 오류가 발생했습니다.');
        } finally {
          setAuthLoading(false);
        }
      }
    };

    // 전역 함수로 등록
    window.handleNativeAuth = handleNativeAuth;

    // 이벤트 리스너로도 등록 (이중 안전장치)
    const handleNativeAuthEvent = (event: CustomEvent) => {
      console.log('[AuthContext] nativeauth 이벤트 수신:', event.detail);
      handleNativeAuth(event.detail);
    };

    window.addEventListener('nativeauth', handleNativeAuthEvent as EventListener);

    // 디버깅을 위한 로그
    console.log('[AuthContext] Native auth 리스너 등록 완료');

    return () => {
      delete window.handleNativeAuth;
      window.removeEventListener('nativeauth', handleNativeAuthEvent as EventListener);
    };
  }, []);

  const resetFormErrors = () => {
    setEmailError(null);
    setPasswordError(null);
    setUsernameError(null);
    setAuthError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormErrors();
    setAuthLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormErrors();
    setAuthLoading(true);

    try {
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
      setShowVerificationModal(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // 상태 초기화
      setUser(null);
      setSession(null);
      setEmail('');
      setPassword('');
      setUsername('');
      setAuthView('login');
      setAuthMessage('');
      setAuthError(null);
      
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleVerificationComplete = () => {
    setShowVerificationModal(false);
    setAuthView('login');
    setAuthMessage('이메일 인증이 완료되었습니다. 로그인해주세요.');
  };

  const value = {
    user,
    session,
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