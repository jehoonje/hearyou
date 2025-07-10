'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// 싱글톤 Auth 매니저
class AuthManager {
  private static instance: AuthManager;
  private authSubscription: any = null;
  private listeners: Set<(event: string, session: Session | null) => void> = new Set();
  private currentSession: Session | null = null;
  private currentUser: User | null = null;
  private isInitialized = false;

  static getInstance() {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('[AuthManager] 초기화 시작');
    this.isInitialized = true;

    // 초기 세션 가져오기
    try {
      const { data: { session } } = await supabase.auth.getSession();
      this.currentSession = session;
      this.currentUser = session?.user || null;
    } catch (error) {
      console.error('[AuthManager] 초기 세션 로드 실패:', error);
    }

    // Auth 상태 변경 리스너 등록 (한 번만)
    if (!this.authSubscription) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        // INITIAL_SESSION은 로그 없이 무시
        if (event === 'INITIAL_SESSION') {
          return;
        }
        
        console.log('[AuthManager] 인증 상태 변경:', event);
        
        this.currentSession = session;
        this.currentUser = session?.user || null;
        
        // 모든 리스너에 이벤트 전달
        this.listeners.forEach(listener => {
          try {
            listener(event, session);
          } catch (error) {
            console.error('[AuthManager] 리스너 실행 오류:', error);
          }
        });
      });

      this.authSubscription = authListener;
    }
  }

  addListener(listener: (event: string, session: Session | null) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getCurrentSession() {
    return this.currentSession;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  cleanup() {
    if (this.authSubscription) {
      this.authSubscription.subscription.unsubscribe();
      this.authSubscription = null;
    }
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// 전역 인스턴스
const authManager = AuthManager.getInstance();

// 싱글톤 이벤트 매니저 (기존 코드 재사용)
class AuthEventManager {
  private static instance: AuthEventManager;
  private isListenerRegistered = false;
  private callbacks: Set<(data: any) => void> = new Set();

  static getInstance() {
    if (!AuthEventManager.instance) {
      AuthEventManager.instance = new AuthEventManager();
    }
    return AuthEventManager.instance;
  }

  registerCallback(callback: (data: any) => void) {
    this.callbacks.add(callback);
    
    if (!this.isListenerRegistered) {
      this.setupListener();
    }
    
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.removeListener();
      }
    };
  }

  private setupListener() {
    if (this.isListenerRegistered) return;
    
    console.log('[AuthEventManager] nativeauth 이벤트 리스너 등록');
    window.addEventListener('nativeauth', this.handleNativeAuth as EventListener);
    window.handleNativeAuth = this.handleNativeAuth;
    this.isListenerRegistered = true;
  }

  private removeListener() {
    if (!this.isListenerRegistered) return;
    
    console.log('[AuthEventManager] nativeauth 이벤트 리스너 제거');
    window.removeEventListener('nativeauth', this.handleNativeAuth as EventListener);
    delete window.handleNativeAuth;
    this.isListenerRegistered = false;
  }

  private handleNativeAuth = (event: Event | any) => {
    const data = event.detail || event;
    console.log('[AuthEventManager] nativeauth 이벤트 수신:', data);
    
    this.callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[AuthEventManager] 콜백 실행 오류:', error);
      }
    });
  };
}

const authEventManager = AuthEventManager.getInstance();

export function useAuth(initialSession: Session | null = null) {
  const searchParams = useSearchParams();

  // 인증 상태 관리
  const [user, setUser] = useState<User | null>(() => {
    // 초기값은 AuthManager나 initialSession에서 가져옴
    return authManager.getCurrentUser() || initialSession?.user || null;
  });
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

  // refs
  const justSignedUpRef = useRef(false);
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
    
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    
    messageTimerRef.current = setTimeout(() => {
      setAuthMessage(null);
      messageTimerRef.current = null;
    }, 3000);
  }, []);

  // AuthManager 초기화 및 리스너 등록
  useEffect(() => {
    let mounted = true;

    // AuthManager 초기화
    authManager.initialize();

    // Auth 상태 변경 리스너 등록
    const unsubscribe = authManager.addListener((event, session) => {
      if (!mounted) return;

      setUser(session?.user || null);
      
      if (event === 'SIGNED_IN' && session?.user) {
        if (justSignedUpRef.current && !session.user.email_confirmed_at) {
          setShowVerificationModal(true);
          justSignedUpRef.current = false;
        }
      } else if (event === 'SIGNED_OUT') {
        setShowVerificationModal(false);
        setAuthView('login');
        justSignedUpRef.current = false;
      }
    });

    // URL 파라미터 처리
    const urlMessage = searchParams?.get('message');
    if (urlMessage && mounted) {
      setAuthMessageWithTimer(urlMessage);
    }

    return () => {
      mounted = false;
      unsubscribe();
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, [searchParams, setAuthMessageWithTimer]);

  // 네이티브 인증 처리
  useEffect(() => {
    const handleNativeAuth = async (data: { token?: string; error?: string }) => {
      console.log('[useAuth] 네이티브 인증 데이터 처리');
      
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
            console.log('[useAuth] Apple 로그인 성공');
            setAuthError(null);
          }
        } catch (error: any) {
          console.error('[useAuth] Apple 로그인 처리 중 오류:', error);
          setAuthError(error.message || 'Apple 로그인 중 오류가 발생했습니다.');
        } finally {
          setAuthLoading(false);
        }
      }
    };

    // 싱글톤 이벤트 매니저에 콜백 등록
    const unregister = authEventManager.registerCallback(handleNativeAuth);
    
    return unregister;
  }, []);

  // 로그인 처리
  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      resetFormErrors();

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
          justSignedUpRef.current = false;
        }
      } catch (err: any) {
        setAuthError(err.message || '로그인 중 오류가 발생했습니다.');
      } finally {
        setAuthLoading(false);
      }
    },
    [email, password, resetFormErrors, validateEmail]
  );

  // 회원가입 처리
  const handleSignUp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      resetFormErrors();
  
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
        console.log('[useAuth] 회원가입 시도');
        
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
          console.error('[useAuth] 회원가입 에러:', error);
          if (error.message.includes('already registered')) {
            setEmailError('이미 등록된 이메일 주소입니다');
          } else {
            setAuthError(error.message);
          }
        } else {
          console.log('[useAuth] 회원가입 성공');
          justSignedUpRef.current = true;
          setAuthMessage('회원가입이 완료되었습니다! 이메일을 확인하여 계정을 활성화해주세요.');
          setShowVerificationModal(true);
        }
      } catch (err: any) {
        console.error('[useAuth] 회원가입 예외:', err);
        setAuthError(err.message || '회원가입 중 오류가 발생했습니다.');
      } finally {
        setAuthLoading(false);
      }
    },
    [email, password, username, resetFormErrors, validateEmail]
  );
  
  // 로그아웃 처리
  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setEmail('');
      setPassword('');
      setUsername('');
      setAuthView('login');
      setAuthMessage('');
      setAuthError(null);
      justSignedUpRef.current = false;
    } catch (error: any) {
      setAuthError(error.message || '로그아웃에 실패했습니다.');
      setUser(null);
    }
  }, []);

  // 회원가입 완료 후 처리
  const handleVerificationComplete = useCallback(() => {
    console.log('[useAuth] 이메일 확인 모달 닫기');
    
    setShowVerificationModal(false);
    setEmail('');
    setPassword('');
    setUsername('');
    setAuthView('login');
    
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    
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
    setAuthMessage: setAuthMessageWithTimer,
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