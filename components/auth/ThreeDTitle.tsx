import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Text3D, Center, OrbitControls, useEnvironment } from '@react-three/drei';
import { useSpring, a, config as springConfig } from '@react-spring/three'; // spring과 animated 컴포넌트 임포트

const FONT_URL = '/fonts/helvetiker_regular.typeface.json'; // 폰트 경로 확인 필요

// MetalText 컴포넌트 Props 인터페이스
interface MetalTextProps {
  onAnimationComplete: () => void; // 애니메이션 완료 시 호출될 콜백
  isContentVisible: boolean; // 부모로부터 받은 콘텐츠 표시 상태
}

// MetalText 컴포넌트: 실제 3D 텍스트와 애니메이션 로직 담당
const MetalText: React.FC<MetalTextProps> = ({ onAnimationComplete, isContentVisible }) => {
  const envMapTexture = useEnvironment({ preset: 'city' }); // 환경 맵 로드 (반사 효과용)
  const groupRef = useRef<THREE.Group>(null); // 3D 객체 그룹 참조

  // react-spring 설정: 회전 애니메이션
  const [springProps, api] = useSpring(() => ({
    from: { rotationY: 0 }, // 시작 각도: 0
    // to, config 등은 useEffect 내에서 설정하거나 여기서 초기화
    config: { mass: 1.5, tension: 120, friction: 100 }, // 물리 기반 애니메이션 설정 (관성/마찰)
    // ⭐ onRest 콜백 수정: 애니메이션이 멈췄을 때 호출됨
    onRest: (result) => {
      // result 객체: 애니메이션 상태 정보 포함 { value, finished, cancelled 등 }
      console.log("[ThreeDTitle/MetalText] onRest 호출됨", { result, isContentVisible });

      // 애니메이션이 중단 없이 정상적으로 'to' 상태까지 완료되었는지 확인
      // react-spring v9 기준: result.finished가 true이고 result.cancelled가 false여야 함
      const finishedNaturally = result.finished === true && result.cancelled === false;

      // ⭐ 핵심 수정: 애니메이션이 정상 종료되었으면 onAnimationComplete 호출
      // 더 이상 onRest 시점의 isContentVisible 값에 의존하지 않음!
      if (finishedNaturally) {
          console.log("[ThreeDTitle/MetalText] 스핀 애니메이션 정상 완료됨. onAnimationComplete 호출 시도.");
          // 필요 시, 애니메이션 최종 상태를 정확히 0으로 재설정 (시각적 정렬)
          if (groupRef.current) {
             groupRef.current.rotation.y = 0; // Three.js 객체 직접 조작
          }
          // 부모에게 애니메이션 완료 알림
          onAnimationComplete();
      } else {
          // 애니메이션이 중단되었거나 다른 이유로 멈춘 경우
          console.warn("[ThreeDTitle/MetalText] 스핀 애니메이션이 정상적으로 완료되지 않음 (중단 또는 취소됨). 콜백 호출 건너뜀.");
          // 필요하다면 여기서도 rotationY를 0으로 리셋할 수 있음
          // if (groupRef.current) {
          //   groupRef.current.rotation.y = 0;
          // }
          // api.start({ rotationY: 0, immediate: true });
      }

      // 참고: 아래 로그는 여전히 유효함 (onRest 시점의 상태 확인용)
      if (!isContentVisible && finishedNaturally) {
          console.log("[ThreeDTitle/MetalText] 정보: 스핀 완료 시점에 isContentVisible가 false였지만, 콜백은 정상 호출됨.");
      }
    },
    // 초기 렌더링 시 isContentVisible가 false면 애니메이션 없이 즉시 'from' 상태 적용
    immediate: !isContentVisible,
  }));

  // --- 효과: isContentVisible 변경 감지 및 애니메이션 제어 ---
  useEffect(() => {
    console.log(`[ThreeDTitle/MetalText] useEffect 실행됨. isContentVisible: ${isContentVisible}`);
    if (isContentVisible) {
      // 콘텐츠가 보일 때: 스핀 애니메이션 시작
      console.log("[ThreeDTitle/MetalText] 콘텐츠 보임. 스핀 애니메이션 시작 준비.");
      // 이전 애니메이션 명시적 중지 (혹시 모를 충돌 방지)
      api.stop();
      console.log("[ThreeDTitle/MetalText] 이전 애니메이션 명시적 중지 완료.");
      // 애니메이션 시작: 'from' 상태에서 'to' 상태로
      api.start({
        from: { rotationY: 0 }, // 항상 0에서 시작하도록 명시
        to: { rotationY: 5 * Math.PI * 2 }, // 최종 목표 각도 (10바퀴 회전)
        config: { mass: 1.5, tension: 120, friction: 100 }, // 필요 시 config 재지정
        reset: true, // 'from' 상태로 리셋 후 애니메이션 시작
        immediate: false, // 애니메이션 활성화 (true면 즉시 'to' 상태로 이동)
        onStart: () => console.log("[ThreeDTitle/MetalText] 스핀 애니메이션 시작됨."), // 시작 로그
      });
    } else {
      // 콘텐츠가 숨겨질 때: 애니메이션 중지 및 초기 상태(0도)로 리셋
      console.log("[ThreeDTitle/MetalText] 콘텐츠 숨겨짐. 애니메이션 중지 및 회전 리셋.");
      api.stop(); // 진행 중인 애니메이션 중지
      api.start({ rotationY: 0, immediate: true }); // 즉시 0도로 설정 (애니메이션 없이)
    }

    // 클린업 함수: 컴포넌트 언마운트 또는 isContentVisible 변경 전에 애니메이션 중지
    return () => {
        console.log("[ThreeDTitle/MetalText] useEffect 클린업: 애니메이션 중지");
        api.stop();
    };
  // onAnimationComplete는 일반적으로 useCallback 등으로 감싸져 불변성을 가질 수 있으므로,
  // 의존성 배열에서 제외해도 무방할 수 있으나, 명확성을 위해 포함하거나 useCallback 사용 권장
  // 여기서는 isContentVisible와 spring api 객체만 의존성으로 설정
  }, [isContentVisible, api]);


  // --- 렌더링 ---
  return (
    // <a.group>: react-spring 애니메이션 값을 적용하기 위한 animated 컴포넌트
    <a.group ref={groupRef} rotation-y={springProps.rotationY}>
      <Center> {/* Text3D를 중앙에 정렬 */}
        <Text3D
          font={FONT_URL}
          size={3.5} // 텍스트 크기
          height={0.5} // 텍스트 두께
          curveSegments={12} // 곡선 정밀도
          bevelEnabled // 베벨(경사면) 효과 활성화
          bevelThickness={0.03} // 베벨 두께
          bevelSize={0.03} // 베벨 크기
          bevelOffset={0}
          bevelSegments={5} // 베벨 정밀도
          letterSpacing={-0.05} // 글자 간격
        >
          Universe {/* 표시될 텍스트 */}
          {/* 메탈릭 재질 설정 */}
          <meshStandardMaterial
            color={0xbbbbbb} // 기본 색상 (밝은 회색)
            roughness={0.4} // 표면 거칠기 (0:매끈, 1:거침)
            metalness={1.0} // 금속성 (0:비금속, 1:금속)
            envMap={envMapTexture} // 환경 맵 텍스처 (주변 환경 반사)
            envMapIntensity={1.0} // 환경 맵 강도
          />
        </Text3D>
      </Center>
    </a.group>
  );
};

// ThreeDTitle 컴포넌트 Props 인터페이스
interface ThreeDTitleProps {
  onInitialSpinComplete: () => void; // 애니메이션 완료 콜백 함수 (이름 변경 가능)
  isContentVisible: boolean; // 부모로부터 받은 콘텐츠 표시 상태
}

// ThreeDTitle 메인 컴포넌트: Canvas 설정 및 MetalText 렌더링
const ThreeDTitle: React.FC<ThreeDTitleProps> = ({ onInitialSpinComplete, isContentVisible }) => {
  console.log(`[ThreeDTitle] Render - isContentVisible: ${isContentVisible}`);
  return (
    // Canvas 컨테이너 스타일
    <div style={{ height: '150px', width: '100%', cursor: 'grab', marginBottom: '1rem' }}>
      {/* @react-three/fiber Canvas: 3D 렌더링 영역 */}
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}> {/* 카메라 위치 및 시야각 설정 */}
        {/* 조명 설정 */}
        <ambientLight intensity={0.6} /> {/* 전체적으로 은은하게 비추는 환경광 */}
        <directionalLight position={[5, 10, 5]} intensity={1.0} /> {/* 특정 방향에서 비추는 직사광 */}

        {/* Suspense: 폰트 로딩 등 비동기 작업 대기 처리 */}
        <Suspense fallback={null}> {/* 로딩 중에는 아무것도 표시 안 함 */}
           {/* MetalText 컴포넌트 렌더링 및 props 전달 */}
          <MetalText
             onAnimationComplete={onInitialSpinComplete} // 완료 콜백 전달
             isContentVisible={isContentVisible} // 콘텐츠 표시 상태 전달
          />
        </Suspense>

        {/* OrbitControls: 마우스로 3D 씬 조작 가능 (줌/이동 비활성화) */}
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
};

export default ThreeDTitle; // 컴포넌트 내보내기