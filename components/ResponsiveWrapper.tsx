'use client';

import { useState, useLayoutEffect, useRef, ReactNode, useEffect } from 'react';

interface ResponsiveWrapperProps {
  children: ReactNode;
  baseWidth: number;
  baseHeight: number;
}

const ResponsiveWrapper = ({ children, baseWidth, baseHeight }: ResponsiveWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isNativeApp, setIsNativeApp] = useState(false);

  // 네이티브 앱 환경 감지
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      setIsNativeApp(true);
    }
  }, []);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!wrapperRef.current) return;

      const parentWidth = wrapperRef.current.clientWidth;
      const parentHeight = wrapperRef.current.clientHeight;

      if (isNativeApp) {
        // 네이티브 앱: 모든 디바이스에서 스케일링 없이 전체 화면 사용
        setScale(1);
      } else {
        // 웹 환경: 기존 스케일링 방식
        const scaleX = parentWidth / baseWidth;
        const scaleY = parentHeight / baseHeight;
        setScale(Math.min(scaleX, scaleY));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [baseWidth, baseHeight, isNativeApp]);

  if (isNativeApp) {
    // 네이티브 앱: 모든 디바이스(iPhone, iPad)에서 전체 화면 사용
    return (
      <div
        ref={wrapperRef}
        style={{
          width: '100vw',
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        {children}
      </div>
    );
  }

  // 웹 환경: 기존 스케일링 방식
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