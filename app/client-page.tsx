'use client';
import { useState, useCallback, useEffect, useRef } from "react";
import ThreeScene from "../components/ThreeScene"; // 경로 확인
import LoadingScreen from "../components/ui/LoadingScreen"; // 경로 확인
import LoginForm from "../components/auth/LoginForm"; // 경로 확인
import VerificationModal from "../components/auth/VerificationModal"; // 경로 확인
import VoiceTrackerUI from "../components/voice/VoiceTrackerUI"; // 경로 확인
import { useAuth as useAppAuth } from "../hooks/useAuth"; // 경로 확인
import { useAudioAnalysis } from "../hooks/useAudioAnalysis"; // 경로 확인
import { useKeywords } from "../hooks/useKeywords"; // 경로 확인
import { Keyword } from "../types"; // 경로 확인
import { User } from "@supabase/supabase-js";

interface ClientPageProps {
  initialKeywords: Keyword[] | null;
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

  const { keywordList, addOrUpdateKeyword } = useKeywords(currentUser, isLoading, initialKeywords);

  const handleKeywordSaved = useCallback((savedKeyword: Keyword) => {
    addOrUpdateKeyword(savedKeyword);
  }, [addOrUpdateKeyword]);

  // useAudioAnalysis 호출 (인자 2개)
  const {
    volume,
    transcript,
    listening,
    newKeywords,
    error,
    toggleListening // toggleListening 받기
   } = useAudioAnalysis(
    currentUser,
    handleKeywordSaved
  );

  const [isUIVisible, setIsUIVisible] = useState(true);
  const clickStartTimeRef = useRef(0);
  const clickStartPositionRef = useRef({ x: 0, y: 0 });
  const isDraggingForToggleRef = useRef(false);

  // --- 이벤트 핸들러 ---
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
     const clickedInsideInteractiveUI = targetElement.closest('.interactive-ui-element'); // 예시 클래스

     if (!isDraggingForToggleRef.current && clickDuration < MAX_CLICK_DURATION && !clickedInsideInteractiveUI) {
       setIsUIVisible(prev => !prev);
     }
     clickStartTimeRef.current = 0;
     isDraggingForToggleRef.current = false;
   };

  // --- 로딩 useEffect ---
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

   // --- 로깅 ---
   console.log('%%% [Parent] Rendering with auth.user:', currentUser);
   console.log('%%% [Parent] Rendering with volume state:', volume);

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
        {/* 3D 배경 씬 */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <ThreeScene volume={currentUser ? volume : 0} />
        </div>

        {/* UI 요소들을 감싸는 컨테이너 */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
            isUIVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* 로그인 상태에 따른 UI 렌더링 */}
          {!currentUser ? (
            // 로그인 폼
            <div
              className={`interactive-ui-element absolute inset-0 flex items-center justify-center p-4 ${isUIVisible ? 'pointer-events-auto' : ''}`}
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
                user={currentUser}
                isContentVisible={contentVisible}
              />
            </div>
          ) : (
            // VoiceTrackerUI 컨테이너
             <div
               className={`interactive-ui-element ${isUIVisible ? 'pointer-events-auto' : ''}`}
             >
               {/* <<< VoiceTrackerUI에 필요한 모든 props 전달 (toggleListening 포함) >>> */}
               <VoiceTrackerUI
                 volume={volume}
                 transcript={transcript}
                 listening={listening}
                 newKeywords={newKeywords}
                 keywordList={keywordList}
                 error={error}
                 userEmail={currentUser.email || ""}
                 onLogout={auth.handleLogout}
                 toggleListening={toggleListening} // <<< 전달 >>>
               />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientPage({ initialKeywords }: ClientPageProps) {
  // initialSession prop은 더 이상 사용되지 않음
  return <MainContent initialKeywords={initialKeywords} />;
}