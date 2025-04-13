'use client';

import { useState, useCallback, useEffect, useRef } from "react";
import { Session } from '@supabase/supabase-js';
import ThreeScene from "../components/ThreeScene";
// import ThreeDTitle from "../components/auth/ThreeDTitle";
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

// --- 상수 정의 ---
const MAX_CLICK_DURATION = 300;
const MAX_CLICK_DRAG_THRESHOLD = 10;
// --- 상수 정의 끝 ---

function MainContent({ initialKeywords }: { initialKeywords: Keyword[] | null }) {
  // --- 상태 및 훅 (변경 없음) ---
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const auth = useAuth();
  const { keywordList, addOrUpdateKeyword } = useKeywords(auth.user, isLoading, initialKeywords);
  const handleKeywordSaved = useCallback((savedKeyword: Keyword) => {
    addOrUpdateKeyword(savedKeyword);
  }, [addOrUpdateKeyword]);
  const { volume, transcript, listening, newKeywords, error } = useAudioAnalysis(
    !!auth.user, isLoading, auth.user, handleKeywordSaved
  );
  const [isUIVisible, setIsUIVisible] = useState(true);
  const clickStartTimeRef = useRef(0);
  const clickStartPositionRef = useRef({ x: 0, y: 0 });
  const isDraggingForToggleRef = useRef(false);
  // --- 상태 및 훅 끝 ---

  // --- 이벤트 핸들러 수정 ---
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isLoading || !contentVisible || auth.showVerificationModal) return;
    clickStartTimeRef.current = Date.now();
    clickStartPositionRef.current = { x: event.clientX, y: event.clientY };
    isDraggingForToggleRef.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isLoading || !contentVisible || auth.showVerificationModal) return;
    if (clickStartTimeRef.current === 0 || isDraggingForToggleRef.current) return;

    const currentX = event.clientX;
    const currentY = event.clientY;
    const startX = clickStartPositionRef.current.x;
    const startY = clickStartPositionRef.current.y;

    const deltaX = Math.abs(currentX - startX);
    const deltaY = Math.abs(currentY - startY);
    if (deltaX > MAX_CLICK_DRAG_THRESHOLD || deltaY > MAX_CLICK_DRAG_THRESHOLD) {
      isDraggingForToggleRef.current = true;
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isLoading || !contentVisible || auth.showVerificationModal) return;
    if (clickStartTimeRef.current === 0) return;

    const clickDuration = Date.now() - clickStartTimeRef.current;
    const targetElement = event.target as Element; // 클릭된 실제 요소

    // *** 클릭 대상 확인 로직 추가 ***
    // 클릭된 요소 또는 그 조상 중에 data-interactive-ui 속성이 있는지 확인
    const clickedInsideInteractiveUI = targetElement.closest('[data-interactive-ui="true"]');

    // 토글 조건: 드래그 안 함 + 클릭 시간 짧음 + *인터랙티브 UI 내부 클릭 아님*
    if (!isDraggingForToggleRef.current && clickDuration < MAX_CLICK_DURATION && !clickedInsideInteractiveUI) {
      setIsUIVisible(prev => !prev);
    }

    // 상태 초기화
    clickStartTimeRef.current = 0;
    isDraggingForToggleRef.current = false;
  };
  // --- 이벤트 핸들러 수정 끝 ---


  // 로딩 처리 useEffect (변경 없음)
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
    <div
      className="w-[375px] h-[668px] bg-black text-white mx-auto overflow-hidden relative"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // 영역 벗어나도 Up 처리
    >
      {isLoading && <LoadingScreen loadingProgress={loadingProgress} />}

      {auth.showVerificationModal &&
        <VerificationModal onComplete={auth.handleVerificationComplete} />
      }

      <div
        className={`w-full h-full relative transition-opacity duration-1000 ${
          contentVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* 3D 배경 씬 */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <ThreeScene volume={auth.user ? volume : 0} />
        </div>

        {/* UI 요소들을 감싸는 컨테이너 */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
            isUIVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* UI 컴포넌트들에만 조건부로 pointer-events-auto 적용 및 data 속성 추가 */}
          {!auth.user ? (
            // 로그인 폼 컨테이너
            <div
              className={`absolute inset-0 flex items-center justify-center p-4 ${isUIVisible ? 'pointer-events-auto' : ''}`}
              data-interactive-ui="true" // *** 식별자 추가 ***
            >
              <LoginForm
                // ... props
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
                isContentVisible={contentVisible}
              />
            </div>
          ) : (
            // VoiceTrackerUI 컨테이너
             <div
               className={`${isUIVisible ? 'pointer-events-auto' : ''}`}
               data-interactive-ui="true" // *** 식별자 추가 ***
             >
               <VoiceTrackerUI
                 // ... props
                 volume={volume}
                 transcript={transcript}
                 listening={listening}
                 newKeywords={newKeywords}
                 keywordList={keywordList}
                 error={error}
                 userEmail={auth.user.email || ""}
                 onLogout={auth.handleLogout}
               />
            </div>
          )}
        </div>
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

