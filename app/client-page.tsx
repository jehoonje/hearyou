"use client";

import { useState, useEffect, useRef } from "react";
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

interface ClientPageProps {
  initialSession: Session | null;
  initialKeywords: Keyword[] | null;
}

export default function ClientPage({ initialSession, initialKeywords }: ClientPageProps) {
  // 로딩 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 인증 관련 상태 및 함수 (초기 세션 전달)
  const auth = useAuth(initialSession);
  
  // 키워드 관련 상태 관리
  const { keywordList } = useKeywords(auth.user, isLoading);
  
  // 오디오 분석 관련 상태 관리
  const { volume, transcript, listening, newKeywords, error } = useAudioAnalysis(
    !!auth.user, 
    isLoading
  );

  // 시뮬레이션된 로딩 진행 처리
  useEffect(() => {
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

  return (
    <div className="w-[375px] h-[668px] bg-black text-white mx-auto overflow-hidden relative">
      {/* 로딩 화면 */}
      {isLoading && <LoadingScreen loadingProgress={loadingProgress} />}

      {/* 이메일 확인 모달 */}
      {auth.showVerificationModal && 
        <VerificationModal onComplete={auth.handleVerificationComplete} />
      }

      {/* 메인 콘텐츠 영역 */}
      <div
        className={`w-full h-full relative transition-opacity duration-1000 ${
          contentVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* ThreeScene 배경 */}
        <div className="absolute inset-0 w-full h-full">
          <ThreeScene volume={auth.user ? volume : 0} />
        </div>

        {/* 로그인 상태에 따라 다른 UI 표시 */}
        {!auth.user ? (
          // 비로그인 상태: 로그인 컴포넌트
          <div className="absolute bg-transparent inset-0 flex items-center justify-center p-4 pointer-events-auto">
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
          // 로그인 상태: Voice Tracker UI
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
