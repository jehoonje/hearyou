'use client';
import { useState, useCallback, useEffect, useRef } from "react";
import ThreeScene from "../components/ThreeScene";
import LoadingScreen from "../components/ui/LoadingScreen";
import LoginForm from "../components/auth/LoginForm";
import VerificationModal from "../components/auth/VerificationModal";
import VoiceTrackerUI from "../components/voice/VoiceTrackerUI";
import { useAuth as useAppAuth } from "../hooks/useAuth";
import { useAudioAnalysis } from "../hooks/useAudioAnalysis";
import { useKeywords } from "../hooks/useKeywords";
import { Keyword } from "../types";
import { Session, User } from "@supabase/supabase-js"; // User, Session 임포트 확인

// Props 인터페이스 (AuthProvider에서 initialSession 관리 가정, 제거)
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
    console.log("Keyword saved callback triggered in MainContent:", savedKeyword);
    addOrUpdateKeyword(savedKeyword);
  }, [addOrUpdateKeyword]);

  const {
    volume,
    transcript,
    listening,
    newKeywords,
    error: audioError,
    toggleListening
  } = useAudioAnalysis(
    currentUser,
    handleKeywordSaved
  );

  const [isUIVisible, setIsUIVisible] = useState(true);
  const clickStartTimeRef = useRef(0);
  const clickStartPositionRef = useRef({ x: 0, y: 0 });
  const isDraggingForToggleRef = useRef(false);

  // UI 토글 핸들러 (data-interactive-ui 체크 강화)
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isLoading || !contentVisible || auth.showVerificationModal) return;
    // data-interactive-ui="true" 요소 또는 그 자식에서 시작된 이벤트는 무시
    const targetElement = event.target as Element;
    if (targetElement.closest('[data-interactive-ui="true"]')) {
        // console.log("Pointer down inside interactive UI, ignoring for toggle."); // 디버깅
        return;
    }
    clickStartTimeRef.current = Date.now();
    clickStartPositionRef.current = { x: event.clientX, y: event.clientY };
    isDraggingForToggleRef.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isLoading || !contentVisible || auth.showVerificationModal || clickStartTimeRef.current === 0 || isDraggingForToggleRef.current) return;
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
    if (isLoading || !contentVisible || auth.showVerificationModal || clickStartTimeRef.current === 0) return;

    const clickDuration = Date.now() - clickStartTimeRef.current;
    const targetElement = event.target as Element;
    // data-interactive-ui="true" 내부 클릭인지 다시 확인
    const clickedInsideInteractiveUI = targetElement.closest('[data-interactive-ui="true"]');

    if (!isDraggingForToggleRef.current && clickDuration < MAX_CLICK_DURATION && !clickedInsideInteractiveUI) {
       console.log("Toggling UI visibility");
       setIsUIVisible(prev => !prev);
    } else {
       console.log("UI toggle condition not met:", {
         isDragging: isDraggingForToggleRef.current,
         duration: clickDuration,
         insideUI: !!clickedInsideInteractiveUI
       });
    }

    clickStartTimeRef.current = 0;
    isDraggingForToggleRef.current = false;
  };


  useEffect(() => {
    // 로딩 처리 (변경 없음)
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

  console.log('%%% [MainContent] Passing volume to children:', volume);

  return (
    <div
      className="w-[375px] h-[668px] bg-black text-white mx-auto overflow-hidden relative font-mono"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      // onPointerLeave={handlePointerUp} // 필요시 사용
    >
      {isLoading && <LoadingScreen loadingProgress={loadingProgress} />}

      {auth.showVerificationModal &&
        <VerificationModal onComplete={auth.handleVerificationComplete} />
      }

      {/* 콘텐츠 영역 */}
      <div
        className={`w-full h-full relative transition-opacity duration-1000 ${
          contentVisible ? "opacity-100" : "opacity-0 pointer-events-none" // 로딩 중일 땐 이벤트 막기
        }`}
      >
        {/* 3D 배경 씬: 항상 뒤에 위치하며 이벤트는 UI 컨테이너를 통해 받음 */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <ThreeScene volume={volume} />
        </div>

        {/* ===================== 수정된 부분 ===================== */}
        {/* UI 요소 컨테이너: 기본적으로 이벤트를 통과시킴 (pointer-events-none 복원) */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${ // <-- pointer-events-none 복원!
            isUIVisible ? 'opacity-100' : 'opacity-0' // 숨겨질 때는 어차피 안보이므로 none 유지해도 됨
          }`}
        >
        {/* ====================================================== */}

          {!currentUser ? (
            // 로그인 폼 컨테이너: 이벤트를 받도록 설정
            <div
              // UI가 보일 때만 이벤트 받도록 pointer-events-auto 추가
              className={`absolute inset-0 flex items-center justify-center p-4 ${isUIVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}
              data-interactive-ui="true" // UI 토글 방지용
            >
              <LoginForm
                // ... LoginForm props ...
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
            // ===================== 수정된 부분 =====================
            // VoiceTrackerUI 컨테이너: 이벤트를 받도록 설정
             <div
               // UI가 보일 때만 이벤트 받도록 pointer-events-auto 추가
               className={`${isUIVisible ? 'pointer-events-auto' : 'pointer-events-none'}`} // <-- pointer-events-auto 추가!
               data-interactive-ui="true" // UI 토글 방지용
             >
            {/* ====================================================== */}
               <VoiceTrackerUI
                 // ... VoiceTrackerUI props ...
                 volume={volume}
                 transcript={transcript}
                 listening={listening}
                 newKeywords={newKeywords}
                 error={audioError}
                 toggleListening={toggleListening}
                 keywordList={keywordList}
                 userEmail={currentUser.email || ""}
                 onLogout={auth.handleLogout}
               />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ClientPage 컴포넌트 (AuthProvider에서 initialSession 처리 가정)
export default function ClientPage({ initialKeywords }: ClientPageProps) {
  return <MainContent initialKeywords={initialKeywords} />;
}