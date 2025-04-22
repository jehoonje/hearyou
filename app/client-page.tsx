'use client';
import { useState, useCallback, useEffect, useRef } from "react";
import ThreeScene from "../components/ThreeScene";
import LoadingScreen from "../components/ui/LoadingScreen";
import LoginForm from "../components/auth/LoginForm";
import VerificationModal from "../components/auth/VerificationModal";
import VoiceTrackerUI from "../components/voice/VoiceTrackerUI";
import GradientBackground from "../components/GradientBackground"; // Ensure import is correct
import { useAuth as useAppAuth } from "../hooks/useAuth";
import { useAudioAnalysis } from "../hooks/useAudioAnalysis";
import { useKeywords } from "../hooks/useKeywords";
import { Keyword } from "../types";
import { Session, User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from 'framer-motion'; 

// Props 인터페이스
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
  const currentUser: User | null = auth.user; // Get the current user

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

  // --- UI Toggle Handlers (handlePointerDown, handlePointerMove, handlePointerUp) remain the same ---
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isLoading || !contentVisible || auth.showVerificationModal) return;
    const targetElement = event.target as Element;
    if (targetElement.closest('[data-interactive-ui="true"]')) {
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
    // --- Loading logic remains the same ---
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
    >
      {/* 1. Gradient Background: 로그인하지 않았을 때만 렌더링 */}
      <AnimatePresence> {/* AnimatePresence 추가 */}
        {!currentUser && (
          // key prop는 AnimatePresence가 자식 변경을 감지하는 데 도움이 될 수 있습니다.
          <GradientBackground key="gradient-background" />
        )}
      </AnimatePresence>

      {/* 2. Loading Screen */}
      {isLoading && <LoadingScreen loadingProgress={loadingProgress} />}

      {/* 3. Verification Modal */}
      {auth.showVerificationModal &&
        <VerificationModal onComplete={auth.handleVerificationComplete} />
      }

      {/* 4. Main Content Area */}
      <div
        className={`w-full h-full absolute inset-0 transition-opacity duration-1000 ${
          contentVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* 4-1. 3D Background Scene */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          {currentUser ? (<ThreeScene volume={volume} />) : (<div></div>)}
        </div>

        {/* 4-2. UI Elements Container */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
            isUIVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {!currentUser ? (
            // Login Form Container
             <div
              className={`absolute inset-0 flex items-center justify-center p-4 ${isUIVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}
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
                isContentVisible={contentVisible} // LoginForm 애니메이션 시작 제어용
              />
            </div>
          ) : (
            // VoiceTrackerUI Container
            <div
              className={`${isUIVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}
              data-interactive-ui="true"
            >
              <VoiceTrackerUI
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

// ClientPage component remains the same
export default function ClientPage({ initialKeywords }: ClientPageProps) {
  return <MainContent initialKeywords={initialKeywords} />;
}