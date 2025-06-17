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
      
      // 네이티브 앱에서 안전 영역 정보 받기
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'safe_area_insets') {
            // 안전 영역 정보 활용
            document.documentElement.style.setProperty('--safe-area-top', `${data.payload.top}px`);
            document.documentElement.style.setProperty('--safe-area-bottom', `${data.payload.bottom}px`);
          }
        } catch (e) {
          console.error('Message parsing error:', e);
        }
      };
      
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, []);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!wrapperRef.current) return;

      const parentWidth = wrapperRef.current.clientWidth;
      const parentHeight = wrapperRef.current.clientHeight;

      if (isNativeApp) {
        // 네이티브 앱: 스케일링 없이 100% 사용
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

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [baseWidth, baseHeight, isNativeApp]);

  if (isNativeApp) {
    // 네이티브 앱: 스케일링 없이 전체 화면 사용
    return (
      <div
        ref={wrapperRef}
        style={{
          width: '100vw',
          height: '100dvh', // 동적 뷰포트 높이 (iOS 15+)
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