// ResponsiveWrapper.tsx

'use client';

import { useState, useLayoutEffect, useRef, ReactNode } from 'react';

// 컴포넌트가 받을 props 타입 정의
interface ResponsiveWrapperProps {
  children: ReactNode;
  baseWidth: number;
  baseHeight: number;
  fillMode?: boolean; // ✨ fillMode prop 추가 (optional)
}

const ResponsiveWrapper = ({
  children,
  baseWidth,
  baseHeight,
  fillMode = false, // ✨ 기본값을 false로 설정
}: ResponsiveWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    // ✨ fillMode가 true이면 스케일 계산 로직을 실행할 필요가 없음
    if (fillMode) return;

    const handleResize = () => {
      if (!wrapperRef.current) return;

      const parentWidth = wrapperRef.current.clientWidth;
      const parentHeight = wrapperRef.current.clientHeight;

      const scaleX = parentWidth / baseWidth;
      const scaleY = parentHeight / baseHeight;

      const newScale = Math.min(scaleX, scaleY);
      
      setScale(newScale);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [baseWidth, baseHeight, fillMode]); // ✨ 의존성 배열에 fillMode 추가

  // ✨ fillMode 값에 따라 다른 JSX를 반환
  if (fillMode) {
    // 네이티브 앱 환경: 스케일링 없이 화면을 꽉 채우는 컨테이너만 제공
    return (
      <div style={{ width: '100%', height: '100%' }}>
        {children}
      </div>
    );
  }

  // 데스크탑/모바일 웹 환경: 기존 스케일링 로직 유지
  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          transformOrigin: 'center center',
          transform: `scale(${scale})`,
          width: `${baseWidth}px`,
          height: `${baseHeight}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default ResponsiveWrapper;