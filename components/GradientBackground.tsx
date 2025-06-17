import React, { useState, useEffect, useRef } from 'react';
import styles from './GradientBackground.module.css';
import { motion } from 'framer-motion'; 

// 애니메이션 Variants 정의
const backgroundVariants = {
  initial: { // 나타날 때 초기 상태 (필요 없다면 animate와 동일하게)
    opacity: 1,
  },
  animate: { // 화면에 보이는 상태
    opacity: 1,
    transition: { duration: 0.5 } // 나타날 때 페이드인 효과 (선택 사항)
  },
  exit: { // 사라질 때 애니메이션 (페이드 아웃)
    opacity: 0,
    transition: { duration: 0.8 } // 사라지는 시간 (예: 0.8초)
  }
};


const GradientBackground: React.FC = () => {
  const noiseFilterId = 'noiseFilter';
  const gooFilterId = 'goo'; // Goo 필터 ID
  
  const [isNativeApp, setIsNativeApp] = useState(false);

  // Refs for DOM elements
  const containerRef = useRef<HTMLDivElement>(null);
  const interBubbleRef = useRef<HTMLDivElement>(null);

  // Refs for animation state (useRef avoids re-renders in animation loop)
  const curX = useRef(0);
  const curY = useRef(0);
  const tgX = useRef(0);
  const tgY = useRef(0);
  const isInside = useRef(false);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      setIsNativeApp(true);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const interBubble = interBubbleRef.current;

    if (!container || !interBubble) {
      console.error("Container or interactive bubble element not found.");
      return;
    }

    // Animation loop function
    const move = () => {
      if (!isInside.current) {
         // Smoothly return to center or initial position when mouse leaves
         tgX.current = container.offsetWidth / 2; // Example: target center X
         tgY.current = container.offsetHeight / 2; // Example: target center Y
      }

      curX.current += (tgX.current - curX.current) / 15;
      curY.current += (tgY.current - curY.current) / 15;

      // Apply transform directly using style
      interBubble.style.transform = `translate(${Math.round(curX.current)}px, ${Math.round(curY.current)}px)`;

      animationFrameId.current = requestAnimationFrame(move);
    };


    const handleMouseEnter = (event: MouseEvent) => {
      isInside.current = true;
      const rect = container.getBoundingClientRect();
      // Initial target position when entering
      tgX.current = event.clientX - rect.left - interBubble.offsetWidth / 2;
      tgY.current = event.clientY - rect.top - interBubble.offsetHeight / 2;
    };

    const handleMouseLeave = () => {
      isInside.current = false;
      // Target will be updated in move() to return to center/initial
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isInside.current) {
        const rect = container.getBoundingClientRect();
        // Update target position based on mouse, centering the bubble on cursor
        tgX.current = event.clientX - rect.left - interBubble.offsetWidth / 2;
        tgY.current = event.clientY - rect.top - interBubble.offsetHeight / 2;
      }
    };

    // Add event listeners
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mousemove', handleMouseMove);

    // Start the animation loop
    move();

    // Cleanup function
    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    // --- Ref 추가 ---
    <motion.div
      className={`${styles.backgroundContainer} ${isNativeApp ? 'fixed inset-0' : ''}`}
      ref={containerRef}
      aria-hidden="true"
      variants={backgroundVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* --- Goo 필터 SVG 정의 --- */}
      <svg xmlns="http://www.w3.org/2000/svg" className={styles.svgGooFilter}>
        <defs>
          <filter id={gooFilterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 18 -8" /* 새 코드의 값 */
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className={styles.gradientBg}>
        <div className={styles.gradientsContainer}>
          <div className={styles.g1}></div>
          <div className={styles.g2}></div>
          <div className={styles.g3}></div>
          <div className={styles.g4}></div>
          <div className={styles.g5}></div>
          {/* --- 인터랙티브 블롭 div 추가 및 Ref 연결 --- */}
          <div className={styles.interactive} ref={interBubbleRef}></div>
        </div>
      </div>

      {/* --- 기존 노이즈 오버레이 SVG 유지 --- */}
      <svg viewBox="0 0 100% 100%" xmlns='http://www.w3.org/2000/svg' className={styles.noise}>
        <filter id={noiseFilterId}>
          <feTurbulence
            type='fractalNoise'
            baseFrequency='0.7' /* 기존 값 유지 */
            numOctaves='3'      /* 기존 값 유지 */
            stitchTiles='stitch'
          />
        </filter>
        <rect
          width='100%'
          height='100%'
          preserveAspectRatio="xMidYMid slice"
          filter={`url(#${noiseFilterId})`}
        />
      </svg>
    </motion.div>
  );
};

export default GradientBackground;