'use client';
import { useState, useCallback, useEffect, useRef } from "react";
import ThreeScene from "../components/ThreeScene";
import LoadingScreen from "../components/ui/LoadingScreen";
import LoginForm from "../components/auth/LoginForm";
import VerificationModal from "../components/auth/VerificationModal";
import VoiceTrackerUI from "../components/voice/VoiceTrackerUI";
import GradientBackground from "../components/GradientBackground"; // Ensure import is correct
import InAppBrowserBanner from "../components/InAppBrowserBanner";
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

// **** 인앱 브라우저 감지 함수 ****
const detectInAppBrowser = (): string | null => {
  // 서버사이드 렌더링 환경에서는 navigator가 없으므로 확인
  if (typeof window === 'undefined' || !navigator || !navigator.userAgent) {
    return null;
  }
  const ua = navigator.userAgent;
  // 인스타그램 감지 (다른 앱 패턴 추가 가능)
  if (/Instagram/i.test(ua)) {
    return "인스타그램";
  }
  // 카카오톡 감지
  if (/KAKAOTALK/i.test(ua)) {
    return "카카오톡";
  }
  // 페이스북 감지
  if (/FBAN|FBAV/i.test(ua)) {
    return "페이스북";
  }
   // 네이버 앱 감지
   if (/NAVER\(inapp/i.test(ua)) {
    return "네이버앱";
  }
  // 안드로이드 웹뷰 감지 (좀 더 일반적)
  if (/wv\)/i.test(ua)) {
     // 다른 특정 앱 식별자가 없다면 일반 웹뷰로 간주 가능
     // 필요시 더 정교한 로직 추가
     return "앱"; // "앱" 또는 좀 더 구체적인 식별 시도
  }

  return null; // 인앱 브라우저가 아니거나 감지되지 않음
};


function MainContent({ initialKeywords }: { initialKeywords: Keyword[] | null }) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // **** 인앱 브라우저 감지 및 배너 상태 관리 ****
  const [showInAppBanner, setShowInAppBanner] = useState<boolean>(false); // 초기값은 항상 false
  const [detectedAppName, setDetectedAppName] = useState<string | null>(null); // 앱 이름 저장용 상태
  const [isMounted, setIsMounted] = useState(false); 

  useEffect(() => {
    // 컴포넌트가 클라이언트에서 마운트되었음을 표시
    setIsMounted(true);
    // 마운트 후에 인앱 브라우저 감지 실행
    const appName = detectInAppBrowser();
    if (appName) {
      setDetectedAppName(appName); // 감지된 앱 이름 저장
      setShowInAppBanner(true); // 배너 표시 상태 업데이트
    }
  }, []); // 빈 배열: 마운트 시 1회만 실행

  const handleCloseBanner = useCallback(() => {
    setShowInAppBanner(false);
  }, []);
  // ******************************************

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
    // **** 배너 클릭 시 UI 토글 방지 ****
    if (targetElement.closest('[data-interactive-ui="true"]') || targetElement.closest('[data-banner-area="true"]')) {
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
    // **** 배너 클릭 시 UI 토글 방지 ****
    const clickedInsideInteractiveUI = targetElement.closest('[data-interactive-ui="true"]');
    const clickedInsideBanner = targetElement.closest('[data-banner-area="true"]');

    if (!isDraggingForToggleRef.current && clickDuration < MAX_CLICK_DURATION && !clickedInsideInteractiveUI && !clickedInsideBanner) {
       console.log("Toggling UI visibility");
       setIsUIVisible(prev => !prev);
    } else {
       console.log("UI toggle condition not met:", {
         isDragging: isDraggingForToggleRef.current,
         duration: clickDuration,
         insideUI: !!clickedInsideInteractiveUI,
         insideBanner: !!clickedInsideBanner // 배너 클릭 여부 로그 추가
       });
    }

    clickStartTimeRef.current = 0;
    isDraggingForToggleRef.current = false;
  };

  const shouldRenderBanner = showInAppBanner; // isMounted && showInAppBanner; 로 해도 무방

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
    // **** 배너 클릭 방지를 위해 data-banner-area 추가 ****
    <div
      className="w-[375px] h-[668px] bg-black text-white mx-auto overflow-hidden relative font-mono"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-banner-area={showInAppBanner ? "true" : undefined} // 배너 표시될 때만 속성 추가
    >
      {/* 인앱 브라우저 안내 배너 (마운트 후 조건부 렌더링) */}
      {shouldRenderBanner && (
        <InAppBrowserBanner appName={detectedAppName ?? undefined} onClose={handleCloseBanner} />
      )}


      {/* 1. Gradient Background: 로그인하지 않았을 때만 렌더링 */}
      <AnimatePresence>
        {!currentUser && (
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