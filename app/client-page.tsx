// src/app/client-page.tsx 또는 유사 경로

'use client';
import { useState, useCallback, useEffect, useRef } from "react";
import ThreeScene from "../components/ThreeScene";
import LoadingScreen from "../components/ui/LoadingScreen";
import LoginForm from "../components/auth/LoginForm";
import VerificationModal from "../components/auth/VerificationModal";
import VoiceTrackerUI from "../components/voice/VoiceTrackerUI"; // 경로 확인 필요
import { useAuth as useAppAuth } from "../hooks/useAuth";
import { useAudioAnalysis } from "../hooks/useAudioAnalysis"; // 경로 확인 필요
import { useKeywords } from "../hooks/useKeywords"; // 경로 확인 필요
import { Keyword } from "../types"; // 경로 확인 필요
import { Session } from '@supabase/supabase-js';
import { User } from "@supabase/supabase-js";

// --- ClientPageProps 인터페이스 수정 ---
interface ClientPageProps {
  initialSession: Session | null; // Session 타입 또는 null 허용
  initialKeywords: Keyword[] | null; // Keyword 배열 또는 null 허용 (fetchKeywords 반환 타입에 맞춰 조정)
  // ... 기존에 다른 props가 있었다면 그대로 유지
}


const MAX_CLICK_DURATION = 300;
const MAX_CLICK_DRAG_THRESHOLD = 10;

function MainContent({ initialKeywords }: { initialKeywords: Keyword[] | null }) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const auth = useAppAuth();
  const currentUser: User | null = auth.user;

  // useKeywords 훅 (변경 없음)
  const { keywordList, addOrUpdateKeyword } = useKeywords(currentUser, isLoading, initialKeywords);

  // --- handleKeywordSaved 콜백 정의 ---
  // useAudioAnalysis 훅에 전달하기 위해 미리 정의합니다.
  const handleKeywordSaved = useCallback((savedKeyword: Keyword) => {
    console.log("Keyword saved callback triggered in MainContent:", savedKeyword);
    addOrUpdateKeyword(savedKeyword);
  }, [addOrUpdateKeyword]); // 의존성 배열 확인

  // --- 오디오 분석 상태 중앙 관리 ---
  // useAudioAnalysis 훅을 여기서 *단 한번만* 호출합니다.
  const {
    volume,
    transcript,
    listening,
    newKeywords,
    error: audioError, // 에러 상태 이름 변경 (다른 error와 구분)
    toggleListening // 녹음 시작/중지 함수 가져오기
  } = useAudioAnalysis(
    currentUser,        // 현재 사용자 정보 전달
    handleKeywordSaved  // 키워드 저장 콜백 전달
  );
  // --- 오디오 분석 상태 중앙 관리 끝 ---


  const [isUIVisible, setIsUIVisible] = useState(true);
  const clickStartTimeRef = useRef(0);
  const clickStartPositionRef = useRef({ x: 0, y: 0 });
  const isDraggingForToggleRef = useRef(false);

  // UI 토글 로직 핸들러들 (변경 없음)
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
    const targetElement = event.target as Element;
    const clickedInsideInteractiveUI = targetElement.closest('[data-interactive-ui="true"]');
    if (!isDraggingForToggleRef.current && clickDuration < MAX_CLICK_DURATION && !clickedInsideInteractiveUI) {
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

  // 디버깅: MainContent에서 관리되는 volume 상태 확인
  console.log('%%% [MainContent] Passing volume to children:', volume);

  return (
    <div
      className="w-[375px] h-[668px] bg-black text-white mx-auto overflow-hidden relative font-mono"
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
          contentVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* 3D 배경 씬: 중앙에서 관리되는 volume 상태 전달 */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <ThreeScene volume={volume} />
        </div>

        {/* UI 요소 컨테이너 */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
            isUIVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {!currentUser ? (
            // 로그인 폼 컨테이너 (변경 없음)
            <div
              className={`absolute inset-0 flex items-center justify-center p-4 ${isUIVisible ? 'pointer-events-auto' : ''}`}
              data-interactive-ui="true"
            >
              <LoginForm
                authView={auth.authView}
                setAuthView={auth.setAuthView}
                authMessage={auth.authMessage || ''}
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
               className={`${isUIVisible ? '' : ''}`}
               data-interactive-ui="true"
             >
               {/* VoiceTrackerUI에 중앙 관리되는 상태 및 함수 전달 */}
               <VoiceTrackerUI
                 // 오디오 관련 상태 전달
                 volume={volume}
                 transcript={transcript}
                 listening={listening}
                 newKeywords={newKeywords}
                 error={audioError} // 이름 변경된 에러 상태 전달
                 toggleListening={toggleListening} // 녹음 토글 함수 전달

                 // 기타 필요한 props 전달
                 keywordList={keywordList}
                 userEmail={currentUser.email || ""}
                 onLogout={auth.handleLogout}
                 // 만약 VoiceTrackerUI 내부에서 user 객체가 필요하다면:
                 // user={currentUser}
               />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ClientPage 컴포넌트 (변경 없음)
export default function ClientPage({ initialKeywords }: ClientPageProps) {
  return <MainContent initialKeywords={initialKeywords} />;
}