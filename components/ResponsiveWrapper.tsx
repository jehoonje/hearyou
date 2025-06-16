'use client';

import { useState, useLayoutEffect, useRef, ReactNode } from 'react';

// 컴포넌트가 받을 props 타입 정의
interface ResponsiveWrapperProps {
  children: ReactNode; // 내부에 어떤 자식 요소든 받을 수 있도록 ReactNode 타입 사용
  baseWidth: number;   // 기준이 될 콘텐츠의 너비
  baseHeight: number;  // 기준이 될 콘텐츠의 높이
}

const ResponsiveWrapper = ({ children, baseWidth, baseHeight }: ResponsiveWrapperProps) => {
  // 래퍼 요소와 콘텐츠 요소의 참조를 위해 useRef 사용
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // 계산된 scale 값을 저장할 state
  const [scale, setScale] = useState(1);

  // useLayoutEffect는 렌더링 후 화면에 그려지기 전에 동기적으로 실행되어,
  // 화면 깜빡임 없이 스케일 조정을 적용하기에 적합합니다.
  useLayoutEffect(() => {
    const handleResize = () => {
      if (!wrapperRef.current) return;

      // 래퍼(부모)의 현재 너비와 높이 가져오기
      const parentWidth = wrapperRef.current.clientWidth;
      const parentHeight = wrapperRef.current.clientHeight;

      // 너비와 높이에 대한 스케일 비율 계산
      const scaleX = parentWidth / baseWidth;
      const scaleY = parentHeight / baseHeight;

      // 더 작은 비율을 선택하여 콘텐츠가 래퍼 안에 완전히 들어오도록 함 (Letterboxing)
      const newScale = Math.min(scaleX, scaleY);
      
      setScale(newScale);
    };

    // 처음 마운트될 때와 창 크기가 변경될 때 handleResize 함수 실행
    handleResize();
    window.addEventListener('resize', handleResize);

    // 컴포넌트가 언마운트될 때 이벤트 리스너 정리
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [baseWidth, baseHeight]); // 기준 너비/높이가 바뀔 때만 effect 재실행

  return (
    // 1. 전체 화면을 채우고, flex를 이용해 자식 요소를 중앙 정렬하는 래퍼
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden', // 스케일 조정 시 넘치는 부분 숨김
      }}
    >
      {/* 2. 실제 콘텐츠를 담는 부분 */}
      <div
        style={{
          // transform-origin을 중앙으로 설정하여 중앙을 기준으로 크기가 조절되도록 함
          transformOrigin: 'center center',
          // 계산된 scale 값을 transform 속성에 적용
          transform: `scale(${scale})`,
          // 자식 요소들이 scale의 영향을 받도록 하기 위해 필요
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