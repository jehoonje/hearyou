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
  const [contentHeight, setContentHeight] = useState(baseHeight);

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

      let newScale = 1;
      let newHeight = baseHeight;

      if (isNativeApp) {
        // 네이티브 앱: 너비를 화면에 맞추고 높이는 늘림
        newScale = parentWidth / baseWidth;
        
        // 높이를 화면에 맞춤 (비율 무시)
        newHeight = parentHeight / newScale;
        
        // 최소 높이 보장
        if (newHeight < baseHeight) {
          newHeight = baseHeight;
        }
      } else {
        // 웹 환경: 기존 방식
        const scaleX = parentWidth / baseWidth;
        const scaleY = parentHeight / baseHeight;
        newScale = Math.min(scaleX, scaleY);
      }
      
      setScale(newScale);
      setContentHeight(newHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [baseWidth, baseHeight, isNativeApp]);

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflow: 'hidden',
        backgroundColor: '#000', // 배경색 유지
      }}
    >
      <div
        style={{
          transformOrigin: 'top center',
          transform: `scale(${scale})`,
          width: `${baseWidth}px`,
          height: isNativeApp ? `${contentHeight}px` : `${baseHeight}px`,
        }}
      >
        {/* 네이티브 앱에서는 자식 요소를 감싸는 컨테이너 추가 */}
        {isNativeApp ? (
          <div style={{ 
            width: '100%', 
            height: '100%',
            position: 'relative',
            backgroundColor: '#000',
          }}>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ResponsiveWrapper;