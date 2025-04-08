"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Session } from '@supabase/supabase-js';
import ThreeScene from "../components/ThreeScene";
import LoadingScreen from "../components/ui/LoadingScreen";
import LoginForm from "../components/auth/LoginForm";
import VerificationModal from "../components/auth/VerificationModal";
import VoiceTrackerUI from "../components/voice/VoiceTrackerUI";
import { useAuth } from "../hooks/useAuth";
import { useAudioAnalysis } from "../hooks/useAudioAnalysis";
import { useKeywords } from "../hooks/useKeywords";
import { Keyword } from "../types";
import { AuthProvider } from './contexts/AuthContext';

interface ClientPageProps {
  initialSession: Session | null;
  initialKeywords: Keyword[] | null;
}

function MainContent({ initialKeywords }: { initialKeywords: Keyword[] | null }) {
  // 로딩 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 인증 관련 상태 및 함수
  const auth = useAuth();
  
  // 키워드 관련 상태 관리
  const { keywordList, addOrUpdateKeyword } = useKeywords(auth.user, isLoading, initialKeywords);

  // 키워드 저장 시 즉시 UI에 반영하는 콜백 함수
  const handleKeywordSaved = useCallback((savedKeyword: Keyword) => {
    console.log('키워드 저장 완료, UI 즉시 업데이트:', savedKeyword);
    // 저장된 키워드를 즉시 UI에 반영
    addOrUpdateKeyword(savedKeyword);
  }, [addOrUpdateKeyword]);

  // 오디오 분석 관련 상태 관리 - 사용자 객체 전달
  const { volume, transcript, listening, newKeywords, error } = useAudioAnalysis(
    !!auth.user, 
    isLoading,
    auth.user,  // 사용자 객체 전달
    handleKeywordSaved
  );

  // 시뮬레이션된 로딩 진행 처리
  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress > 100) {
        currentProgress = 100;
        clearInterval(interval);

        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);

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

  return (
    <div className="w-[375px] h-[668px] bg-black text-white mx-auto overflow-hidden relative">
      {isLoading && <LoadingScreen loadingProgress={loadingProgress} />}

      {auth.showVerificationModal && 
        <VerificationModal onComplete={auth.handleVerificationComplete} />
      }

      <div
        className={`w-full h-full relative transition-opacity duration-1000 ${
          contentVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute inset-0 w-full h-full">
          <ThreeScene volume={auth.user ? volume : 0} />
        </div>

        {!auth.user ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto">
            <LoginForm
              authView={auth.authView}
              setAuthView={auth.setAuthView}
              authMessage={auth.authMessage}
              authError={auth.authError}
              email={auth.email}
              setEmail={auth.setEmail}
              password={auth.password}
              setPassword={auth.setPassword}
              username={auth.username}
              setUsername={auth.setUsername}
              emailError={auth.emailError}
              setEmailError={auth.setEmailError}
              passwordError={auth.passwordError}
              setPasswordError={auth.setPasswordError}
              usernameError={auth.usernameError}
              setUsernameError={auth.setUsernameError}
              authLoading={auth.authLoading}
              handleLogin={auth.handleLogin}
              handleSignUp={auth.handleSignUp}
              resetFormErrors={auth.resetFormErrors}
              user={auth.user}
            />
          </div>
        ) : (
          <VoiceTrackerUI
            volume={volume}
            transcript={transcript}
            listening={listening}
            newKeywords={newKeywords}
            keywordList={keywordList}
            error={error}
            userEmail={auth.user.email || ""}
            onLogout={auth.handleLogout}
          />
        )}
      </div>
    </div>
  );
}

export default function ClientPage({ initialSession, initialKeywords }: ClientPageProps) {
  return (
    <AuthProvider initialSession={initialSession}>
      <MainContent initialKeywords={initialKeywords} />
    </AuthProvider>
  );
}
