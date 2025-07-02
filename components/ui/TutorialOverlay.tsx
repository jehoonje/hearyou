// src/components/ui/TutorialOverlay.tsx

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../../app/contexts/LanguageContext";
import type { Translations } from "../../types/i18n";

interface TutorialStep {
  step: number;
  target: string; // data-tutorial-target 값
  textKey: keyof Translations["tutorial"]; 
  positionClasses: string; // Tailwind CSS 클래스로 위치 지정 (예: 'top-10 left-10')
}

interface TutorialOverlayProps {
  onComplete: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { t } = useLanguage();

  // 튜토리얼 단계 정의 (번역 키를 사용)
  const tutorialSteps: TutorialStep[] = useMemo(() => [
    {
      step: 1,
      target: "mic-button",
      textKey: "step1" as keyof typeof t.tutorial,
      positionClasses: "top-16 w-80", // 예시 위치
    },
    {
      step: 2,
      target: "transcript-display",
      textKey: "step2" as keyof typeof t.tutorial,
      positionClasses: "bottom-1/4 w-80", // 예시 위치
    },
    {
      step: 3,
      target: "match-button-area",
      textKey: "step3" as keyof typeof t.tutorial,
      positionClasses: "top-16 center w-80", // 예시 위치
    },
    {
      step: 4,
      target: "match-button-area",
      textKey: "step4" as keyof typeof t.tutorial,
      positionClasses: "top-16 center w-80", // 예시 위치
    },
  ], [t.tutorial]);

  const currentStepData = useMemo(
    () => tutorialSteps[currentStepIndex],
    [currentStepIndex, tutorialSteps]
  );

  // *** 👇 페이드 인/아웃 애니메이션 variants 정의 👇 ***
  const overlayFadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const stepFadeVariants = {
    hidden: { opacity: 0 }, // y 속성 제거 (순수 페이드)
    visible: { opacity: 1 }, // y 속성 제거
    exit: { opacity: 0 }, // y 속성 제거
  };

  const handleNext = () => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete(); // 마지막 단계면 완료 처리
    }
  };

  // --- 타겟 하이라이트 로직 (선택적, 주석 처리됨) ---
  useEffect(() => {
    // 이전 하이라이트 제거
    document
      .querySelectorAll(".tutorial-highlight")
      .forEach((el) => el.classList.remove("tutorial-highlight"));

    // 현재 단계의 타겟 요소 찾기
    const targetElement = document.querySelector<HTMLElement>(
      `[data-tutorial-target="${currentStepData.target}"]`
    );

    if (targetElement) {
      // 타겟 요소에 하이라이트 클래스 추가
      targetElement.classList.add("tutorial-highlight");
      // (선택 사항) 하이라이트 요소가 보이도록 스크롤
      // targetElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    // 클린업 함수: 컴포넌트 언마운트 또는 스텝 변경 시 하이라이트 제거
    return () => {
      if (targetElement) {
        targetElement.classList.remove("tutorial-highlight");
      } else {
        // 스텝 변경 시 targetElement가 null일 수 있으므로 querySelectorAll로 한번 더 제거 시도
        document
          .querySelectorAll(".tutorial-highlight")
          .forEach((el) => el.classList.remove("tutorial-highlight"));
      }
    };
  }, [currentStepData]);

  return (
    // *** 👇 최상위 div를 motion.div로 변경하고 애니메이션 적용 👇 ***
    <motion.div
      className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center pointer-events-none" // 배경은 이벤트 통과하도록 none
      variants={overlayFadeVariants} // 전체 오버레이 페이드 variants 적용
      initial="hidden"
      animate="visible"
      exit="hidden"
      transition={{ duration: 0.4 }} // 전체 오버레이 전환 속도
    >
      {/* 👇 단계별 콘텐츠 전환 애니메이션 👇 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStepData.step} // key는 유지해야 전환 애니메이션 작동
          variants={stepFadeVariants} // 단계별 콘텐츠 페이드 variants 적용
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.3 }} // 단계별 전환 속도
          className={`absolute bg-gradient-to-br from-purple-600/80 to-blue-500/80 backdrop-blur-sm p-4 rounded-lg shadow-lg text-white font-mono text-sm border border-blue-400/50 ${currentStepData.positionClasses} pointer-events-auto w-[93%]`} // 설명 박스는 이벤트 받아야 함
        >
          <p className="mb-4 whitespace-pre-line">{t.tutorial[currentStepData.textKey]}</p>
          <div className="flex justify-end">
            <button
              onClick={handleNext}
              className="bg-white text-purple-700 px-4 py-1 rounded font-semibold hover:bg-gray-200 transition-colors text-xs"
            >
              {currentStepIndex < tutorialSteps.length - 1
                ? t.tutorial.next
                : t.tutorial.start}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
      {/* 하이라이트 CSS 주석 (변경 없음) */}
    </motion.div>
  );
};

export default TutorialOverlay;