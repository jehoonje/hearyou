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
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  // 네이티브 앱 환경 감지 및 안전 영역 설정
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      setIsNativeApp(true);
      
      // CSS 환경 변수에서 안전 영역 값 가져오기
      const computedStyle = getComputedStyle(document.documentElement);
      const safeTop = parseInt(computedStyle.getPropertyValue('--sat') || '0');
      const safeBottom = parseInt(computedStyle.getPropertyValue('--sab') || '0');
      const safeLeft = parseInt(computedStyle.getPropertyValue('--sal') || '0');
      const safeRight = parseInt(computedStyle.getPropertyValue('--sar') || '0');
      
      setSafeAreaInsets({
        top: safeTop || 0,
        bottom: safeBottom || 0,
        left: safeLeft || 0,
        right: safeRight || 0
      });

      // 네이티브 앱에서 안전 영역 정보 받기
      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'safe_area_insets') {
            setSafeAreaInsets(data.payload);
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
        // 네이티브 앱: 스케일링 없이 전체 화면 사용
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
    // 네이티브 앱: 전체 화면 사용 with 안전 영역
    return (
      <div
        ref={wrapperRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: `${safeAreaInsets.top}px`,
            left: `${safeAreaInsets.left}px`,
            right: `${safeAreaInsets.right}px`,
            bottom: `${safeAreaInsets.bottom}px`,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
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