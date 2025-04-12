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
    addOrUpdateKeyword(savedKeyword);
  }, [addOrUpdateKeyword]);

  // 오디오 분석 관련 상태 관리
  const { volume, transcript, listening, newKeywords, error } = useAudioAnalysis(
    !!auth.user,
    isLoading,
    auth.user,
    handleKeywordSaved
  );

  // UI 토글 상태 및 로직
  const [isUIVisible, setIsUIVisible] = useState(true);
  const clickStartTimeRef = useRef(0);
  const clickStartPositionRef = useRef({ x: 0, y: 0 });
  const isDraggingForToggleRef = useRef(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isLoading || !contentVisible || auth.showVerificationModal) return;
    // event.target을 확인하여 실제 UI 요소에서 시작된 이벤트인지 확인 가능 (필요시)
    // console.log('Pointer Down Target:', event.target);

    clickStartTimeRef.current = Date.now();
    clickStartPositionRef.current = { x: event.clientX, y: event.clientY };
    isDraggingForToggleRef.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isLoading || !contentVisible || auth.showVerificationModal) return;
    if (clickStartTimeRef.current === 0) return;
    if (isDraggingForToggleRef.current) return;

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

    // 드래그하지 않았고, 클릭 시간이 짧으면 UI 토글
    // 추가 조건: 클릭 이벤트가 UI 요소 내부(자식 포함)에서 발생했는지 확인 (선택적)
    // event.target을 사용하여 이것이 실제 UI 요소인지, 아니면 빈 배경인지 구분 가능
    // 예: if (!isDraggingForToggleRef.current && clickDuration < MAX_CLICK_DURATION && event.target === event.currentTarget) { ... }
    // 위 예시는 클릭이 정확히 최상위 div에서 발생했을 때만 토글 (배경 클릭 시)

    if (!isDraggingForToggleRef.current && clickDuration < MAX_CLICK_DURATION) {
        // 배경 클릭 시에만 토글하도록 하려면 event.target 비교 로직 추가 필요
        // 지금은 영역 내 어디든 짧은 클릭 시 토글
        setIsUIVisible(prev => !prev);
    }

    clickStartTimeRef.current = 0;
    isDraggingForToggleRef.current = false;
  };

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
      onPointerLeave={handlePointerUp}
    >
      {isLoading && <LoadingScreen loadingProgress={loadingProgress} />}

      {auth.showVerificationModal &&
        <VerificationModal onComplete={auth.handleVerificationComplete} />
      }

      <div
        className={`w-full h-full relative transition-opacity duration-1000 ${
          contentVisible ? "opacity-100" : "opacity-0 pointer-events-none" // 로딩 후 컨텐츠 보일때만 이벤트 받음
        }`}
      >
        {/* 3D 배경 씬 */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <ThreeScene volume={auth.user ? volume : 0} />
        </div>

        {/* UI 요소들을 감싸는 컨테이너 (페이드 효과 + 이벤트 통과 기본 설정) */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${ // 기본적으로 none
            isUIVisible ? 'opacity-100' : 'opacity-0' // 투명도만 제어
          }`}
        >
          {/* UI 컴포넌트들에만 조건부로 pointer-events-auto 적용 */}
          {!auth.user ? (
            // 로그인 폼 컨테이너
            <div className={`absolute inset-0 flex items-center justify-center p-4 ${isUIVisible ? 'pointer-events-auto' : ''}`}>
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
            // VoiceTrackerUI 컨테이너 (필요하다면 div로 감싸고 클래스 적용)
             <div className={`${isUIVisible ? 'pointer-events-auto' : ''}`}>
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