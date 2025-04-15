'use client';
import { useState, useCallback, useEffect, useRef } from "react";
// import { Session } from '@supabase/supabase-js'; // Session 타입 불필요해질 수 있음
import ThreeScene from "../components/ThreeScene";
import LoadingScreen from "../components/ui/LoadingScreen";
import LoginForm from "../components/auth/LoginForm";
import VerificationModal from "../components/auth/VerificationModal";
import VoiceTrackerUI from "../components/voice/VoiceTrackerUI";
// import { useAuth } from "../hooks/useAuth"; // AuthContext 기반 useAuth 대신 새 훅 사용
import { useAuth as useAppAuth } from "../hooks/useAuth"; // 새로 만든 useAuth 훅 임포트 (이름 충돌 방지)
import { useAudioAnalysis } from "../hooks/useAudioAnalysis";
import { useKeywords } from "../hooks/useKeywords";
import { Keyword } from "../types";
// import { AuthProvider } from './contexts/AuthContext'; // AuthProvider 불필요해질 수 있음

interface ClientPageProps {
  initialSession?: any; // useAuth 훅이 initialSession을 사용하지 않는다면 제거 가능
  initialKeywords: Keyword[] | null;
}

// --- 상수 정의 ---
const MAX_CLICK_DURATION = 300;
const MAX_CLICK_DRAG_THRESHOLD = 10;
// --- 상수 정의 끝 ---

// MainContent 컴포넌트는 useAuth 대신 useAppAuth 사용하도록 수정 필요
function MainContent({ initialKeywords }: { initialKeywords: Keyword[] | null }) {
  // --- 상태 및 훅 수정 ---
  const [isLoading, setIsLoading] = useState(true); // 로딩 상태는 유지
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // *** 변경된 useAuth 훅 사용 ***
  const auth = useAppAuth(); // user, handleLogin, handleSignUp, etc. 포함

  // useKeywords는 auth.user를 받으므로 변경 없음 (단, user 타입 호환성 확인)
  const { keywordList, addOrUpdateKeyword } = useKeywords(auth.user, isLoading, initialKeywords);

  const handleKeywordSaved = useCallback((savedKeyword: Keyword) => {
    addOrUpdateKeyword(savedKeyword);
  }, [addOrUpdateKeyword]);

  // useAudioAnalysis는 auth.user를 받으므로 변경 없음 (단, user 타입 호환성 확인)
  const { volume, transcript, listening, newKeywords, error } = useAudioAnalysis(
    !!auth.user, // 인증 상태 확인
    isLoading,
    auth.user, // 현재 사용자 정보 전달
    handleKeywordSaved
  );

  const [isUIVisible, setIsUIVisible] = useState(true);
  const clickStartTimeRef = useRef(0);
  const clickStartPositionRef = useRef({ x: 0, y: 0 });
  const isDraggingForToggleRef = useRef(false);
  // --- 상태 및 훅 끝 ---

  // --- 이벤트 핸들러 (UI 토글 로직 - 변경 없음) ---
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
   // --- 이벤트 핸들러 끝 ---

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
       // 언마운트 시 오디오 분석 정리 등 필요 시 추가
     };
   }, []);


  return (
    <div
      className="w-[375px] h-[668px] bg-black text-white mx-auto overflow-hidden relative font-mono" // font-mono 추가 (전역 설정과 일치)
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp} // 영역 벗어나도 Up 처리
    >
      {isLoading && <LoadingScreen loadingProgress={loadingProgress} />}

       {/* VerificationModal은 useAppAuth 훅에서 관리 */}
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
           {/* auth.user 존재 여부에 따라 volume 전달 */}
          <ThreeScene volume={auth.user ? volume : 0} />
        </div>

        {/* UI 요소들을 감싸는 컨테이너 */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
            isUIVisible ? 'opacity-100' : 'opacity-0'
          }`}
           // data-interactive-ui 속성을 개별 컴포넌트 컨테이너로 이동
        >
          {/* UI 컴포넌트들에만 조건부로 pointer-events-auto 적용 및 data 속성 추가 */}
          {!auth.user ? (
            // 로그인 폼 컨테이너
            <div
               // UI 토글 시 pointer-events 제어 + 인터랙션 식별자
              className={`absolute inset-0 flex items-center justify-center p-4 ${isUIVisible ? 'pointer-events-auto' : ''}`}
              data-interactive-ui="true"
            >
               {/* LoginForm에 useAppAuth 훅에서 관리하는 상태 및 함수 전달 */}
              <LoginForm
                authView={auth.authView}
                setAuthView={auth.setAuthView}
                authMessage={auth.authMessage || ''} // null 대신 빈 문자열
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
                user={auth.user} // 필요 시 전달
                isContentVisible={contentVisible} // 필요 시 전달
              />
            </div>
          ) : (
            // VoiceTrackerUI 컨테이너
             <div
               // UI 토글 시 pointer-events 제어 + 인터랙션 식별자
               className={`${isUIVisible ? 'pointer-events-auto' : ''}`}
               data-interactive-ui="true"
             >
               {/* VoiceTrackerUI에 필요한 props 전달 */}
               <VoiceTrackerUI
                 volume={volume}
                 transcript={transcript}
                 listening={listening}
                 newKeywords={newKeywords}
                 keywordList={keywordList}
                 error={error} // useAudioAnalysis에서 오는 에러
                 userEmail={auth.user.email || ""}
                 onLogout={auth.handleLogout} // useAppAuth에서 오는 로그아웃 함수
               />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// AuthProvider 제거하고 MainContent 직접 렌더링
export default function ClientPage({ initialKeywords }: ClientPageProps) {
  // initialSession prop은 useAppAuth 훅 내부에서 처리하므로 제거 가능
  return <MainContent initialKeywords={initialKeywords} />;
}