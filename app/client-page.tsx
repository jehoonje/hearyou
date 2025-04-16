'use client';
import { useState, useCallback, useEffect, useRef } from "react";
import ThreeScene from "../components/ThreeScene"; // 경로 확인
import LoadingScreen from "../components/ui/LoadingScreen"; // 경로 확인
import LoginForm from "../components/auth/LoginForm"; // 경로 확인
import VerificationModal from "../components/auth/VerificationModal"; // 경로 확인
import VoiceTrackerUI from "../components/voice/VoiceTrackerUI"; // 경로 확인
import { useAuth as useAppAuth } from "../hooks/useAuth"; // 경로 확인
import { useAudioAnalysis } from "../hooks/useAudioAnalysis"; // 경로 확인 (useEffect 의존성 [isAnalysisActive] 버전)
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

  // useAudioAnalysis 호출 (수정된 버전 사용)
  const {
    volume,
    transcript,
    listening,
    newKeywords,
    error,
    toggleListening
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
     // interactive-ui-element 클래스를 가진 요소 내부에서 시작된 이벤트는 무시 (버튼 클릭 등)
     if ((event.target as Element).closest('.interactive-ui-element')) return;
     clickStartTimeRef.current = Date.now();
     clickStartPositionRef.current = { x: event.clientX, y: event.clientY };
     isDraggingForToggleRef.current = false;
   };

   const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
     if (isLoading || !contentVisible || auth.showVerificationModal) return;
     if (clickStartTimeRef.current === 0 || isDraggingForToggleRef.current) return;
     if ((event.target as Element).closest('.interactive-ui-element')) return; // 인터랙티브 요소 위에서는 무시
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
     // interactive-ui-element 클래스를 가진 요소 내부에서 발생한 클릭은 UI 토글 무시
     const clickedInsideInteractiveUI = (event.target as Element).closest('.interactive-ui-element');
     const clickDuration = Date.now() - clickStartTimeRef.current;

     if (!isDraggingForToggleRef.current && clickDuration < MAX_CLICK_DURATION && !clickedInsideInteractiveUI) {
       setIsUIVisible(prev => !prev);
       console.log("UI Visibility Toggled:", !isUIVisible); // 토글 상태 로깅
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
    // 최상위 div에는 포인터 핸들러 연결
    <div
      className="w-[375px] h-[668px] bg-black text-white mx-auto overflow-hidden relative font-mono"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // 영역 벗어나도 Up 처리되도록 Leave에도 연결
    >
      {isLoading && <LoadingScreen loadingProgress={loadingProgress} />}

      {auth.showVerificationModal &&
        <VerificationModal onComplete={auth.handleVerificationComplete} />
      }

      {/* contentVisible로 전체 컨텐츠 표시 여부 제어 */}
      <div
        className={`w-full h-full relative transition-opacity duration-1000 ${
          contentVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* 3D 배경 씬 (항상 인터랙션 불가) */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <ThreeScene volume={currentUser ? volume : 0} />
        </div>

        {/* UI 요소들을 감싸는 컨테이너: isUIVisible 상태에 따라 인터랙션 제어 */}
        <div
          // <<<--- className 수정: isUIVisible에 따라 pointer-events 변경 --->>>
          className={`absolute inset-0 transition-opacity duration-500 ${
            isUIVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* 로그인 상태에 따른 UI 렌더링 */}
          {!currentUser ? (
            // 로그인 폼 컨테이너 (이제 부모 div가 pointer-events 관리)
            <div
              className={`interactive-ui-element absolute inset-0 flex items-center justify-center p-4`} // pointer-events 클래스 제거
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
            // VoiceTrackerUI 컨테이너 (이제 부모 div가 pointer-events 관리)
             <div
               className={`interactive-ui-element`} // pointer-events 클래스 제거
             >
               {/* VoiceTrackerUI에 prop 전달 */}
               <VoiceTrackerUI
                 volume={volume}
                 transcript={transcript}
                 listening={listening}
                 newKeywords={newKeywords}
                 keywordList={keywordList}
                 error={error}
                 userEmail={currentUser.email || ""}
                 onLogout={auth.handleLogout}
                 toggleListening={toggleListening} // toggleListening 전달 확인
               />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientPage({ initialKeywords }: ClientPageProps) {
  return <MainContent initialKeywords={initialKeywords} />;
}