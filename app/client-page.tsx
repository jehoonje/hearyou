"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import ThreeScene from "../components/ThreeScene";
import LoadingScreen from "../components/ui/LoadingScreen";
import LoginForm from "../components/auth/LoginForm";
import VerificationModal from "../components/auth/VerificationModal";
import VoiceTrackerUI from "../components/voice/VoiceTrackerUI";
import GradientBackground from "../components/GradientBackground";
import InAppBrowserBanner from "../components/InAppBrowserBanner";
import { useAuth as useAppAuth } from "../hooks/useAuth";
import { useAudioAnalysis } from "../hooks/useAudioAnalysis";
import { useKeywords } from "../hooks/useKeywords";
import { Keyword } from "../types";
import { Session, User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import TutorialOverlay from "../components/ui/TutorialOverlay"; // *** 튜토리얼 컴포넌트 임포트 ***

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

const BASE_WIDTH = 375;
const BASE_HEIGHT = 668;

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
  const [scale, setScale] = useState(1);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateScaleAndSize = () => {
      if (typeof window !== "undefined") {
        const { innerWidth, innerHeight } = window;
        setViewportSize({ width: innerWidth, height: innerHeight });
        const scaleX = innerWidth / BASE_WIDTH;
        const scaleY = innerHeight / BASE_HEIGHT;
        setScale(Math.min(scaleX, scaleY));
      }
    };
    updateScaleAndSize();
    window.addEventListener("resize", updateScaleAndSize);
    return () => window.removeEventListener("resize", updateScaleAndSize);
  }, []);

  useEffect(() => {
    // window.ReactNativeWebView 객체가 있는지 확인하여 앱 환경인지 판별
    if (window.ReactNativeWebView) {
      const message = {
        type: "loading_progress",
        payload: {
          progress: loadingProgress,
        },
      };
      // JSON 문자열 형태로 메시지 전송
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }, [loadingProgress]);

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

  const auth = useAppAuth();
  const currentUser: User | null = auth.user;

  const { keywordList, addOrUpdateKeyword } = useKeywords(
    currentUser,
    isLoading,
    initialKeywords
  );

  const handleKeywordSaved = useCallback(
    (savedKeyword: Keyword) => {
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
    // 사용자가 로그인했고, 메인 콘텐츠가 보이는 상태일 때만 확인
    if (currentUser && contentVisible) {
      let shouldShow = true; // 기본적으로 보여준다고 가정
      try {
        // 로컬 스토리지에서 'tutorialCompleted' 값 확인
        const tutorialCompleted = localStorage.getItem("tutorialCompleted");
        // 값이 'true'이면 튜토리얼을 보여주지 않음
        if (tutorialCompleted === "true") {
          shouldShow = false;
          console.log("튜토리얼 완료 기록 확인됨. 튜토리얼 숨김."); // 확인용 로그
        } else {
          console.log("튜토리얼 완료 기록 없음. 튜토리얼 표시."); // 확인용 로그
        }
      } catch (error) {
        console.error(
          "튜토리얼 완료 상태 확인 중 localStorage 접근 오류:",
          error
        );
        // 로컬 스토리지 접근 오류 시, 안전하게 튜토리얼을 보여주지 않도록 처리 (선택적)
        // 또는 오류 시에는 일단 보여주도록 할 수도 있음 (shouldShow = true 유지)
        // 여기서는 일단 보여주도록 유지 (기본값 true)
      }
      setShowTutorial(shouldShow);
    } else {
      // 로그아웃 상태거나 콘텐츠가 아직 안보이면 튜토리얼 숨김
      setShowTutorial(false);
    }
  }, [currentUser, contentVisible]);

  useEffect(() => {
    // --- Loading logic (변경 없음) ---
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 100) {
        // 100보다 크거나 같을 때로 조건 수정
        currentProgress = 100;
        clearInterval(interval);
        // setLoadingProgress(100)이 호출된 후 postMessage가 전송되도록 보장
        setLoadingProgress(100);

        loadingTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
          setTimeout(() => {
            setContentVisible(true);
          }, 300);
        }, 500);
      } else {
        setLoadingProgress(currentProgress);
      }
    }, 400);

    return () => {
      clearInterval(interval);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return (
    // ✨ 1. 최상위 div는 화면 전체를 채우는 컨테이너 역할을 합니다.

    <div
      className="w-screen h-screen bg-black text-white relative"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* ✨ 2. 3D 씬을 배경 레이어로 배치합니다. (z-0) */}

      <div className="absolute inset-0 z-0">
        {currentUser && viewportSize.width > 0 && (
          <ThreeScene volume={volume} /> // viewport prop은 이제 필요 없습니다.
        )}
      </div>

      {/* ✨ 3. 로딩, 배너, UI 등은 그 위의 레이어(z-10 이상)에 배치합니다. */}

      {isLoading && <LoadingScreen loadingProgress={loadingProgress} />}

      {/* ✨ 4. 스케일이 적용되는 UI 컨테이너 (포인터 이벤트 제어 필요) */}

      <div className="absolute inset-0 flex justify-center items-center z-10 pointer-events-none">
        <div
          style={{
            width: BASE_WIDTH,

            height: BASE_HEIGHT,

            transform: `scale(${scale})`,

            transformOrigin: "center center",
          }}
          // 이 컨테이너는 이벤트를 받지 않고 통과시킵니다.

          className="relative pointer-events-none"
        >
          <div
            className={`w-full h-full transition-opacity duration-1000 ${
              contentVisible ? "opacity-100" : "opacity-0" // pointer-events-none은 상위에서 관리
            }`}
          >
            {/* 배너, 모달 등 오버레이 UI는 클릭이 되어야 하므로 auto로 설정 */}

            {showInAppBanner && (
              <div className="pointer-events-auto">
                <InAppBrowserBanner
                  appName={detectedAppName ?? undefined}
                  onClose={handleCloseBanner}
                />
              </div>
            )}

            <AnimatePresence>
              {!currentUser && <GradientBackground key="gradient-background" />}
            </AnimatePresence>

            {auth.showVerificationModal && (
              <div className="pointer-events-auto">
                <VerificationModal
                  onComplete={auth.handleVerificationComplete}
                />
              </div>
            )}

            {/* ✨ 2. 실제 UI 컴포넌트를 감싸는 div에 pointer-events-auto를 적용합니다. */}

            <div
              className={`absolute inset-0 transition-opacity duration-500 ${
                isUIVisible ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {!currentUser ? (
                <div
                  className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto"
                  data-interactive-ui="true"
                >
                  <LoginForm
                    authView={auth.authView}
                    authMessage={auth.authMessage || ""}
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
                <div className="pointer-events-auto" data-interactive-ui="true">
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

          {/* 튜토리얼 오버레이도 전체를 덮으므로 auto가 필요 */}

          <AnimatePresence>
            {contentVisible && showTutorial && (
              <div className="pointer-events-auto">
                <TutorialOverlay onComplete={handleTutorialComplete} />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ClientPage component (변경 없음)
export default function ClientPage({ initialKeywords }: ClientPageProps) {
  return <MainContent initialKeywords={initialKeywords} />;
}
