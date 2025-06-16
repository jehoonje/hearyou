import { memo, useEffect, useRef } from 'react';

// CSS 클래스를 사용하기 위한 스타일 태그 추가
// 실제 프로젝트에서는 .css 파일로 분리하는 것이 좋습니다.
const styles = `
  .particle {
    transform-style: preserve-3d;
    position: absolute;
    width: 2px;
    height: 2px;
    border-radius: 50%;
    will-change: transform, opacity;
    mix-blend-mode: plus-lighter;
    background: hsl(4, 100%, 66%);
  }
`;

interface LoadingScreenProps {
  loadingProgress: number;
}

// 파티클의 현재 상태를 관리하기 위한 인터페이스
interface ParticleState {
  element: HTMLDivElement;
  gridX: number;
  gridY: number;
  currentX: number;
  currentY: number;
  scale: number;
  followStrength: number;
}

const LoadingScreen = memo<LoadingScreenProps>(({ loadingProgress }) => {
  const creatureRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  // 파티클 상태를 더 효율적으로 관리하기 위해 ref 수정
  const particlesState = useRef<ParticleState[]>([]);
  
  // Easing(선형 보간에 사용할 값)을 추가하여 부드러운 움직임 구현
  const easing = 0.08;

  useEffect(() => {
    if (!creatureRef.current) return;

    // 스타일 시트 동적 추가
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const rows = 6;
    const particleCount = rows * rows;
    
    // --- 초기 로딩 속도 개선 ---
    // 1. DocumentFragment를 사용하여 DOM 조작 최소화
    const fragment = document.createDocumentFragment();
    particlesState.current = [];
    creatureRef.current.innerHTML = '';
    
    for (let i = 0; i < particleCount; i++) {
      const div = document.createElement('div');
      // 2. 반복적인 스타일링 대신 CSS 클래스 사용
      div.className = 'particle'; 
      fragment.appendChild(div);

      // 파티클의 초기 위치 및 상태 계산
      const x = i % rows;
      const y = Math.floor(i / rows);
      const centerX = (rows - 1) / 2;
      const centerY = (rows - 1) / 2;
      
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      const maxDistance = Math.sqrt(2) * ((rows - 1) / 2);
      const normalizedDistance = maxDistance > 0 ? distance / maxDistance : 0;
      
      const gridX = (x - centerX) * 10;
      const gridY = (y - centerY) * 10;
      
      const scale = 1 + (3 - 1) * (1 - normalizedDistance);
      const opacity = 0.1 + (1 - 0.1) * (1 - normalizedDistance);
      const lightness = 20 + (80 - 20) * (1 - normalizedDistance);
      const shadowSize = 1 + (8 - 1) * (1 - normalizedDistance);
      
      div.style.left = '65px';
      div.style.top = '65px';
      div.style.opacity = String(opacity);
      div.style.background = `hsl(4, 70%, ${lightness}%)`;
      div.style.boxShadow = `0px 0px ${shadowSize}em 0px hsl(4, 100%, 66%)`;
      div.style.zIndex = String(Math.round(particleCount - distance * 10));
      
      // 초기 transform 설정
      div.style.transform = `translate(${gridX}px, ${gridY}px) scale(${scale})`;
      
      // 파티클 상태 저장
      particlesState.current.push({
        element: div,
        gridX,
        gridY,
        currentX: gridX, // 현재 위치를 초기 그리드 위치로 설정
        currentY: gridY,
        scale,
        followStrength: 1 - (distance / maxDistance) * 0.7, // 따라오는 강도
      });
    }

    // 3. DocumentFragment를 한번에 DOM에 추가하여 Reflow/Repaint 최소화
    creatureRef.current.appendChild(fragment);

    // --- animate 함수 로직 변경 ---
    const cursor = { x: 0, y: 0 };

    const animate = (currentTime: number) => {
      // 애니메이션 파라미터 (이 값들을 조절하여 모양과 속도를 변경할 수 있습니다)
      const pathWidth = 60; // 8자의 전체 너비
      const pathHeight = 25; // 8자의 전체 높이
      const animationSpeed = 0.0012; // 애니메이션 속도

      // 1. 8자 경로 생성
      // x는 한 주기로, y는 두 주기로 움직여 8자 모양을 만듭니다.
      cursor.x = pathWidth * Math.sin(currentTime * animationSpeed);
      cursor.y = pathHeight * Math.sin(currentTime * animationSpeed * 2);

      // 2. 모으고 퍼뜨리기 (Gather & Disperse)
      // 커서의 x좌표(중심으로부터의 가로 거리)를 이용해 '퍼지는 정도'를 계산합니다.
      // |cursor.x|가 최대일 때(양 끝) spreadAmount는 0, |cursor.x|가 0일 때(중앙) spreadAmount는 1이 됩니다.
      const spreadAmount = 1 - Math.abs(cursor.x) / pathWidth;

      particlesState.current.forEach(p => {
        // 3. 파티클 목표 위치 계산 변경
        // spreadAmount가 0이면 모든 파티클이 커서 위치로, 1이면 그리드 위치만큼 넓게 퍼집니다.
        const targetX = cursor.x + p.gridX * spreadAmount;
        const targetY = cursor.y + p.gridY * spreadAmount;
        
        // 선형 보간(Lerp)을 사용하여 현재 위치에서 목표 위치로 부드럽게 이동
        p.currentX += (targetX - p.currentX) * easing;
        p.currentY += (targetY - p.currentY) * easing;
        
        // 계산된 위치를 transform 스타일에 적용
        p.element.style.transform = `translate(${p.currentX}px, ${p.currentY}px) scale(${p.scale})`;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      document.head.removeChild(styleSheet);
    };
  }, [easing]);// easing이 변경될 일은 없지만 의존성 배열에 명시

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700">
      <div className="relative flex flex-col items-center justify-center">
        <div className="relative mb-8">
          <div ref={creatureRef} className="relative" style={{ width: '130px', height: '80px' }}></div>
        </div>
        <p className="text-lg font-mono text-gray-400">{Math.round(loadingProgress)}%</p>
      </div>
    </div>
  );
});

LoadingScreen.displayName = 'LoadingScreen';
export default LoadingScreen;