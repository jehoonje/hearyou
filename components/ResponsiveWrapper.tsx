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
  const [deviceType, setDeviceType] = useState<'phone' | 'tablet' | 'desktop'>('phone');

  // 디바이스 타입 감지
  const detectDeviceType = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;
    
    // iPad 감지 (가로/세로 모두 고려)
    if (
      (width >= 768 && height >= 1024) || 
      (width >= 1024 && height >= 768) ||
      (navigator.userAgent.match(/iPad/i)) ||
      (navigator.maxTouchPoints > 1 && !navigator.userAgent.match(/iPhone/i))
    ) {
      return 'tablet';
    }
    
    // 일반적인 태블릿 크기
    if (Math.min(width, height) >= 600) {
      return 'tablet';
    }
    
    return 'phone';
  };

  // 네이티브 앱 환경 및 디바이스 감지
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      setIsNativeApp(true);
      setDeviceType(detectDeviceType());
      
      // 디바이스 정보를 네이티브 앱에 전송
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'device_info',
        payload: {
          deviceType: detectDeviceType(),
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
        }
      }));
    }
  }, []);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!wrapperRef.current) return;

      const parentWidth = wrapperRef.current.clientWidth;
      const parentHeight = wrapperRef.current.clientHeight;
      const currentDeviceType = detectDeviceType();
      setDeviceType(currentDeviceType);

      if (isNativeApp) {
        if (currentDeviceType === 'tablet') {
          // 태블릿: 중앙에 적절한 크기로 표시
          const maxWidth = Math.min(parentWidth * 0.7, 600); // 최대 600px 또는 화면의 70%
          const scaleX = maxWidth / baseWidth;
          const scaleY = parentHeight * 0.9 / baseHeight; // 높이의 90% 사용
          setScale(Math.min(scaleX, scaleY));
        } else {
          // 폰: 전체 화면 사용
          setScale(1);
        }
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
    if (deviceType === 'tablet') {
      // 태블릿: 중앙 정렬된 스케일링 레이아웃
      return (
        <div
          ref={wrapperRef}
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#000',
            padding: '20px', // 여백 추가
          }}
        >
          <div
            style={{
              transformOrigin: 'center center',
              transform: `scale(${scale})`,
              width: `${baseWidth}px`,
              height: `${baseHeight}px`,
              boxShadow: deviceType === 'tablet' ? '0 0 50px rgba(255,255,255,0.1)' : 'none',
              borderRadius: deviceType === 'tablet' ? '20px' : '0',
              overflow: 'hidden',
            }}
          >
            {children}
          </div>
        </div>
      );
    }
    
    // 폰: 전체 화면 사용
    return (
      <div
        ref={wrapperRef}
        style={{
          width: '100vw',
          height: '100dvh',
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