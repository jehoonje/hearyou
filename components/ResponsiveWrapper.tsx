"use client";

import { useState, useLayoutEffect, useRef, ReactNode, useEffect } from "react";

interface ResponsiveWrapperProps {
  children: ReactNode;
  baseWidth: number;
  baseHeight: number;
}

const ResponsiveWrapper = ({
  children,
  baseWidth,
  baseHeight,
}: ResponsiveWrapperProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isNativeApp, setIsNativeApp] = useState(false);

  // 네이티브 앱 환경 감지
  useEffect(() => {
    // React Native WebView 환경 체크
    if (typeof window !== "undefined" && window.ReactNativeWebView) {
      setIsNativeApp(true);
      console.log("Native app environment detected");
    }
  }, []);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!wrapperRef.current) return;

      const parentWidth = wrapperRef.current.clientWidth;
      const parentHeight = wrapperRef.current.clientHeight;

      let newScale = 1;

      if (isNativeApp) {
        // 네이티브 앱 환경: 높이를 화면에 맞추고 너비만 비율 유지
        const heightScale = parentHeight / baseHeight;
        const widthAtHeightScale = baseWidth * heightScale;

        // 너비가 화면을 벗어나는지 확인
        if (widthAtHeightScale <= parentWidth) {
          // 너비가 화면 안에 들어오면 높이 기준 스케일 사용
          newScale = heightScale;
        } else {
          // 너비가 벗어나면 너비 기준으로 스케일 조정
          newScale = parentWidth / baseWidth;
        }
      } else {
        // 웹 환경: 기존 방식 (레터박싱)
        const scaleX = parentWidth / baseWidth;
        const scaleY = parentHeight / baseHeight;
        newScale = Math.min(scaleX, scaleY);
      }

      setScale(newScale);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [baseWidth, baseHeight, isNativeApp]);

  // 메시지를 통해 네이티브 앱에 현재 스케일 정보 전송
  useEffect(() => {
    if (isNativeApp && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "scale_info",
          payload: {
            scale,
            contentWidth: baseWidth * scale,
            contentHeight: baseHeight * scale,
          },
        })
      );
    }
  }, [scale, isNativeApp, baseWidth, baseHeight]);

  // 네이티브 앱에서 스크롤 가능하도록 스타일 조정
  const wrapperStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: isNativeApp ? "flex-start" : "center", // 네이티브에서는 상단 정렬
    overflow: isNativeApp ? "auto" : "hidden", // 네이티브에서는 스크롤 허용
  };

  const contentStyle: React.CSSProperties = {
    transformOrigin: isNativeApp ? "top center" : "center center",
    transform: `scale(${scale})`,
    width: `${baseWidth}px`,
    height: `${baseHeight}px`,
    // 네이티브 앱에서 콘텐츠가 늘어날 수 있도록 최소 높이 설정
    minHeight: isNativeApp ? `${baseHeight}px` : undefined,
  };

  return (
    <div ref={wrapperRef} style={wrapperStyle}>
      <div style={contentStyle}>{children}</div>
    </div>
  );
};

export default ResponsiveWrapper;
