"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import ThreeScene from "../components/ThreeScene";
import LoadingScreen from "../components/ui/LoadingScreen";
import LoginForm from "../components/auth/LoginForm";
import VerificationModal from "../components/auth/VerificationModal";
import VoiceTrackerUI from "../components/voice/VoiceTrackerUI";
import GradientBackground from "../components/GradientBackground";
import InAppBrowserBanner from "../components/InAppBrowserBanner";
import { useAuth } from "../app/contexts/AuthContext";
import { useAudioAnalysis } from "../hooks/useAudioAnalysis";
import { useKeywords } from "../hooks/useKeywords";
import { Keyword } from "../types";
import { usePushNotifications } from './hooks/usePushNotifications';
import ResponsiveWrapper from "../components/ResponsiveWrapper";
import { Session, User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import TutorialOverlay from "../components/ui/TutorialOverlay";

// Props 인터페이스
interface ClientPageProps {
  initialKeywords: Keyword[] | null;
}

const MAX_CLICK_DURATION = 300;
const MAX_CLICK_DRAG_THRESHOLD = 10;

// 인앱 브라우저 감지 함수 (변경 없음)
const detectInAppBrowser = (): string | null => {
  if (typeof window === "undefined" || !navigator || !navigator.userAgent) {
    return null;
  }
  const ua = navigator.userAgent;
  if (/Instagram/i.test(ua)) return "인스타그램";
  if (/KAKAOTALK/i.test(ua)) return "카카오톡";
  if (/FBAN|FBAV/i.test(ua)) return "페이스북";
  if (/NAVER\(inapp/i.test(ua)) return "네이버앱";
  if (/wv\)/i.test(ua)) return "앱";
  return null;
};

function MainContent({
  initialKeywords,
}: {
  initialKeywords: Keyword[] | null;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [contentVisible, setContentVisible] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [showInAppBanner, setShowInAppBanner] = useState<boolean>(false);
  const [detectedAppName, setDetectedAppName] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // *** 튜토리얼 상태 추가 ***
  const [showTutorial, setShowTutorial] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [deviceType, setDeviceType] = useState<"phone" | "tablet" | "desktop">(
    "phone"
  );

  usePushNotifications(); // 여기서 훅 사용

  useEffect(() => {
    if (window.ReactNativeWebView) {
      setIsNativeApp(true);
      
      // CSS 변수로 안전 영역 설정
      document.documentElement.style.setProperty('--sat', `env(safe-area-inset-top, 0px)`);
      document.documentElement.style.setProperty('--sab', `env(safe-area-inset-bottom, 0px)`);
      document.documentElement.style.setProperty('--sal', `env(safe-area-inset-left, 0px)`);
      document.documentElement.style.setProperty('--sar', `env(safe-area-inset-right, 0px)`);
    }
  }, []);
  

  useEffect(() => {
    if (window.ReactNativeWebView) {
      setIsNativeApp(true);

      // 디바이스 타입 감지
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (
        (width >= 768 && height >= 1024) ||
        (width >= 1024 && height >= 768) ||
        navigator.userAgent.match(/iPad/i)
      ) {
        setDeviceType("tablet");
      }
    }
  }, []);

  useEffect(() => {
    // 컴포넌트가 마운트되면 window.ReactNativeWebView 객체가 있는지 확인
    if (window.ReactNativeWebView) {
      setIsNativeApp(true);
    }
  }, []); // 이 useEffect는 한 번만 실행됩니다.

  useEffect(() => {
    // window.ReactNativeWebView 객체가 있는지 확인하여 앱 환경인지 판별
    // isNativeApp 상태를 사용하여 조건 확인 가능
    if (isNativeApp) {
      const message = {
        type: "loading_progress",
        payload: {
          progress: loadingProgress,
        },
      };
      // JSON 문자열 형태로 메시지 전송
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }
    }
  }, [loadingProgress, isNativeApp]);

  useEffect(() => {
    setIsMounted(true);
    const appName = detectInAppBrowser();
    if (appName) {
      setDetectedAppName(appName);
      setShowInAppBanner(true);
    }
  }, []);

  const handleCloseBanner = useCallback(() => {
    setShowInAppBanner(false);
  }, []);

  const auth = useAuth();
  const currentUser: User | null = auth.user;

  const { keywordList, addOrUpdateKeyword } = useKeywords(
    currentUser,
    isLoading,
    initialKeywords
  );

  const handleKeywordSaved = useCallback(
    (savedKeyword: Keyword | string) => {
      addOrUpdateKeyword(savedKeyword);
    },
    [addOrUpdateKeyword]
  );

  const {
    volume,
    transcript,
    listening,
    newKeywords,
    error: audioError,
    toggleListening,
  } = useAudioAnalysis(currentUser, handleKeywordSaved);

  const [isUIVisible, setIsUIVisible] = useState(true);
  const clickStartTimeRef = useRef(0);
  const clickStartPositionRef = useRef({ x: 0, y: 0 });
  const isDraggingForToggleRef = useRef(false);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // *** 튜토리얼 활성 시 배경 클릭으로 UI 토글 방지 ***
    if (
      isLoading ||
      !contentVisible ||
      auth.showVerificationModal ||
      showTutorial
    )
      return;
    const targetElement = event.target as Element;
    if (
      targetElement.closest('[data-interactive-ui="true"]') ||
      targetElement.closest('[data-banner-area="true"]')
    ) {
      return;
    }
    clickStartTimeRef.current = Date.now();
    clickStartPositionRef.current = { x: event.clientX, y: event.clientY };
    isDraggingForToggleRef.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    // *** 튜토리얼 활성 시 이동으로 드래그 상태 변경 방지 ***
    if (
      isLoading ||
      !contentVisible ||
      auth.showVerificationModal ||
      showTutorial ||
      clickStartTimeRef.current === 0 ||
      isDraggingForToggleRef.current
    )
      return;
    const currentX = event.clientX;
    const currentY = event.clientY;
    const startX = clickStartPositionRef.current.x;
    const startY = clickStartPositionRef.current.y;
    const deltaX = Math.abs(currentX - startX);
    const deltaY = Math.abs(currentY - startY);
    if (
      deltaX > MAX_CLICK_DRAG_THRESHOLD ||
      deltaY > MAX_CLICK_DRAG_THRESHOLD
    ) {
      isDraggingForToggleRef.current = true;
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    // *** 튜토리얼 활성 시 클릭으로 UI 토글 방지 ***
    if (
      isLoading ||
      !contentVisible ||
      auth.showVerificationModal ||
      showTutorial ||
      clickStartTimeRef.current === 0
    )
      return;

    const clickDuration = Date.now() - clickStartTimeRef.current;
    const targetElement = event.target as Element;
    const clickedInsideInteractiveUI = targetElement.closest(
      '[data-interactive-ui="true"]'
    );
    const clickedInsideBanner = targetElement.closest(
      '[data-banner-area="true"]'
    );

    if (
      !isDraggingForToggleRef.current &&
      clickDuration < MAX_CLICK_DURATION &&
      !clickedInsideInteractiveUI &&
      !clickedInsideBanner
    ) {
      setIsUIVisible((prev) => !prev);
    }

    clickStartTimeRef.current = 0;
    isDraggingForToggleRef.current = false;
  };

  const shouldRenderBanner = showInAppBanner;

  const handleTutorialComplete = useCallback(() => {
    try {
      // 로컬 스토리지에 'tutorialCompleted' 값을 'true'로 저장
      localStorage.setItem("tutorialCompleted", "true");
      console.log("튜토리얼 완료 상태 저장됨"); // 확인용 로그
    } catch (error) {
      console.error(
        "튜토리얼 완료 상태 저장 중 localStorage 접근 오류:",
        error
      );
    } finally {
      // 로컬 스토리지 저장 성공 여부와 관계없이 튜토리얼은 숨김
      setShowTutorial(false);
    }
  }, []);

  // *** 👇 튜토리얼 표시 로직 수정 👇 ***
  useEffect(() => {
    // 데모 사용자는 튜토리얼을 보지 않음
    if (currentUser && contentVisible) {
      let shouldShow = true;
      try {
        const tutorialCompleted = localStorage.getItem("tutorialCompleted");
        if (tutorialCompleted === "true") {
          shouldShow = false;
        }
      } catch (error) {
        console.error("튜토리얼 완료 상태 확인 중 오류:", error);
      }
      setShowTutorial(shouldShow);
    } else {
      setShowTutorial(false);
    }
  }, [currentUser, contentVisible, auth.isDemoUser]);

  useEffect(() => {
    // --- Loading logic (변경 없음) ---
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
    <ResponsiveWrapper baseWidth={400} baseHeight={668}>
      <div
        className={
          isNativeApp 
            ? "w-full h-full bg-black text-white overflow-hidden relative font-mono"
            : "w-[400px] h-[668px] bg-black text-white mx-auto overflow-hidden relative font-mono"
        }
        style={isNativeApp ? {
          width: '100%',
          height: '100%',
          position: 'relative'
        } : undefined}
        // *** 튜토리얼 활성 시에는 onPointer 이벤트들이 위쪽 조건문에서 막히므로 여기 로직은 유지 ***
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        data-banner-area={showInAppBanner ? "true" : undefined}
      >
        {/* 인앱 브라우저 배너 (변경 없음) */}
        {shouldRenderBanner && (
          <InAppBrowserBanner
            appName={detectedAppName ?? undefined}
            onClose={handleCloseBanner}
          />
        )}

        {/* Gradient Background (변경 없음) */}
        <AnimatePresence>
          {!currentUser && <GradientBackground key="gradient-background" />}
        </AnimatePresence>

        {/* Loading Screen (변경 없음) */}
        {isLoading && !isNativeApp && (
          <LoadingScreen loadingProgress={loadingProgress} />
        )}

        {/* Verification Modal (변경 없음) */}
        {auth.showVerificationModal && (
          <VerificationModal onComplete={auth.handleVerificationComplete} />
        )}

        {/* Main Content Area (변경 없음) */}
        <div
          className={`w-full h-full absolute inset-0 transition-opacity duration-1000 ${
            contentVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* 3D Background Scene (변경 없음) */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            {currentUser ? <ThreeScene volume={volume} /> : <div></div>}
          </div>

          {/* UI Elements Container (변경 없음) */}
          <div
            // *** 튜토리얼 활성 시에는 isUIVisible과 관계없이 보이도록 할 수 있으나, 여기서는 기존 로직 유지 ***
            // *** 튜토리얼 오버레이가 최상단에 오므로 하위 UI의 투명도/이벤트는 문제되지 않음 ***
            className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
              isUIVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {!currentUser ? (
              // Login Form (변경 없음)
              <div
                className={`absolute inset-0 flex items-center justify-center p-4 ${
                  isUIVisible ? "pointer-events-auto" : "pointer-events-none"
                }`}
                data-interactive-ui="true"
              >
                <LoginForm
                  authView={auth.authView}
                  authMessage={auth.authMessage || ""}
                  authError={auth.authError || null}
                  email={auth.email}
                  setEmail={auth.setEmail}
                  password={auth.password}
                  setPassword={auth.setPassword}
                  username={auth.username}
                  setUsername={auth.setUsername}
                  emailError={auth.emailError || null}
                  setEmailError={auth.setEmailError}
                  passwordError={auth.passwordError || null}
                  setPasswordError={auth.setPasswordError}
                  usernameError={auth.usernameError || null}
                  setUsernameError={auth.setUsernameError}
                  authLoading={auth.authLoading}
                  handleLogin={auth.handleLogin}
                  handleSignUp={auth.handleSignUp}
                  resetFormErrors={auth.resetFormErrors}
                  user={auth.user}
                  isContentVisible={contentVisible}
                  showVerificationModal={auth.showVerificationModal}
                  handleVerificationComplete={auth.handleVerificationComplete}
                />
              </div>
            ) : (
              // VoiceTrackerUI Container (변경 없음)
              <div
                className={`${
                  isUIVisible ? "pointer-events-auto" : "pointer-events-none"
                }`}
                data-interactive-ui="true" // 이 속성은 유지 (튜토리얼 제외 영역 식별용)
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
                  // *** VoiceTrackerUI 자체에 data-tutorial-target 속성은 불필요 ***
                  // *** VoiceTrackerUI 내부 요소에 지정할 것임 ***
                />
              </div>
            )}
          </div>
        </div>

        {/* *** 튜토리얼 오버레이 조건부 렌더링 (로직 수정됨) *** */}
        {/* contentVisible이 true이고 showTutorial이 true일 때만 렌더링 (로그인 여부는 useEffect에서 이미 체크) */}
        <AnimatePresence>
          {contentVisible && showTutorial && (
            <TutorialOverlay onComplete={handleTutorialComplete} />
          )}
        </AnimatePresence>
      </div>
    </ResponsiveWrapper>
  );
}

// ClientPage component (변경 없음)
export default function ClientPage({ initialKeywords }: ClientPageProps) {
  return <MainContent initialKeywords={initialKeywords} />;
}
