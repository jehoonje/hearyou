'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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

  const supabase = createClientComponentClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

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
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleVerificationComplete = () => {
    setShowVerificationModal(false);
    setAuthView('login');
    setAuthMessage('이메일 인증이 완료되었습니다. 로그인해주세요.');
  };

  useEffect(() => {
    // 네이티브 앱으로부터 인증 데이터를 받기 위한 전역 함수 정의
    window.handleNativeAuth = async (data: { token?: string; error?: string }) => {
      // 1. 네이티브에서 에러를 보냈을 경우 처리
      if (data.error) {
        console.error('[WebView] 네이티브로부터 로그인 오류 수신:', data.error);
        setAuthError(data.error);
        return;
      }

      // 2. 네이티브에서 토큰을 보냈을 경우 처리
      if (data.token) {
        console.log('[WebView] 네이티브로부터 Apple 인증 토큰 수신');
        setAuthLoading(true);

        const { error: supabaseError } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: data.token,
        });

        if (supabaseError) {
          console.error('[WebView] Supabase Apple 로그인 오류:', supabaseError.message);
          setAuthError('Apple 계정으로 로그인하는 중 문제가 발생했습니다.');
        } else {
          console.log('[WebView] Supabase 로그인 성공!');
        }
        setAuthLoading(false);
      }
    };

    return () => {
      delete window.handleNativeAuth;
    };
  }, [supabase.auth, setAuthLoading, setAuthError]);

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
