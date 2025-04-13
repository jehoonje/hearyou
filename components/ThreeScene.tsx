'use client';

import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei'; // shaderMaterial import 추가


interface ThreeSceneProps {
  volume: number;
}

interface CircularWaveProps {
  volume: number;
  interactionData: {
    color: THREE.Color | null;
    intensity: number;
    timestamp: number; // To potentially track freshness
  };
}

interface QuasarJetProps {
  volume: number;
  onParticleDeath: (color: THREE.Color) => void; // Callback prop
}

// --- 상수 추가 ---
const DAMPING_FACTOR = 0.95; // 감쇠 계수 (값이 1에 가까울수록 천천히 멈춤)
const MIN_VELOCITY = 0.0001; // 감쇠를 멈출 최소 속도 임계값
// --- 상수 추가 끝 ---

// 드래그 컨트롤 구현
const CameraControls = () => {
  const { camera, gl } = useThree();
  const isDraggingRef = useRef(false);
  const previousPositionRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const radiusRef = useRef(7);

  // --- Ref 추가 ---
  const velocityRef = useRef({ x: 0, y: 0 }); // 각속도 저장용 Ref
  const isDampingRef = useRef(false); // 감쇠 애니메이션 활성 상태 Ref
  // --- Ref 추가 끝 ---

  // --- 카메라 위치 업데이트 로직 추출 ---
  const updateCameraPosition = useCallback(() => {
    const radius = radiusRef.current;
    const phi = rotationRef.current.x; // 수직 각도
    const theta = rotationRef.current.y; // 수평 각도

    // 수직 각도 제한 (기존 로직과 동일하게 적용)
    rotationRef.current.x = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, phi)
    );

    // 구면 좌표계 -> 직교 좌표계 변환
    camera.position.x = radius * Math.cos(rotationRef.current.x) * Math.sin(theta);
    camera.position.y = radius * Math.sin(rotationRef.current.x);
    camera.position.z = radius * Math.cos(rotationRef.current.x) * Math.cos(theta);
    camera.lookAt(0, 0, 0); // 항상 원점 보기
  }, [camera]); // camera는 일반적으로 불변
  // --- 카메라 위치 업데이트 로직 추출 끝 ---

  useEffect(() => {
      const initialPos = camera.position;
      radiusRef.current = initialPos.length();
      // 초기 각도 계산 시 제한 적용
      const initialPhi = Math.asin(initialPos.y / radiusRef.current);
      rotationRef.current.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, initialPhi));
      rotationRef.current.y = Math.atan2(initialPos.x, initialPos.z);
      updateCameraPosition(); // 초기 위치 설정 반영
  }, [camera, updateCameraPosition]); // updateCameraPosition 의존성 추가

  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    isDampingRef.current = false; // 드래그 시작 시 감쇠 중지
    velocityRef.current = { x: 0, y: 0 }; // 속도 초기화
    previousPositionRef.current = { x: clientX, y: clientY };
    gl.domElement.style.cursor = 'grabbing';
  }, [gl.domElement.style]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;

    const deltaX = clientX - previousPositionRef.current.x;
    const deltaY = clientY - previousPositionRef.current.y;

    // 각도 변화량 계산
    const deltaRotY = deltaX * 0.005;
    const deltaRotX = deltaY * 0.005;

    // 회전값 업데이트
    rotationRef.current.y += deltaRotY;
    rotationRef.current.x += deltaRotX; // 각도 제한은 updateCameraPosition에서 처리

    // --- 속도(각도 변화량) 저장 ---
    velocityRef.current.y = deltaRotY;
    velocityRef.current.x = deltaRotX;
    // --- 속도 저장 끝 ---

    // 카메라 위치 즉시 업데이트
    updateCameraPosition();

    previousPositionRef.current = { x: clientX, y: clientY };
  }, [updateCameraPosition]); // updateCameraPosition 의존성 추가

  const handlePointerUp = useCallback(() => {
    if (isDraggingRef.current) {
        isDraggingRef.current = false;
        gl.domElement.style.cursor = 'grab';

        // --- 감쇠 시작 조건 확인 ---
        // 마지막 속도의 크기 계산 (간단히 절대값 합 사용)
        const speed = Math.abs(velocityRef.current.x) + Math.abs(velocityRef.current.y);
        if (speed > MIN_VELOCITY) {
            isDampingRef.current = true; // 속도가 충분하면 감쇠 시작
        } else {
            velocityRef.current = { x: 0, y: 0 }; // 속도 매우 작으면 초기화
            isDampingRef.current = false;
        }
        // --- 감쇠 시작 조건 확인 끝 ---
    }
  }, [gl.domElement.style]);

  // --- 감쇠 처리 로직 (useFrame) ---
  useFrame(() => {
    if (isDampingRef.current) {
      // 속도를 현재 회전값에 적용
      rotationRef.current.y += velocityRef.current.y;
      rotationRef.current.x += velocityRef.current.x;

      // 속도 감쇠
      velocityRef.current.y *= DAMPING_FACTOR;
      velocityRef.current.x *= DAMPING_FACTOR;

      // 카메라 위치 업데이트
      updateCameraPosition();

      // 속도가 임계값 미만이면 감쇠 중지
      const speed = Math.abs(velocityRef.current.x) + Math.abs(velocityRef.current.y);
      if (speed < MIN_VELOCITY) {
        isDampingRef.current = false;
        velocityRef.current = { x: 0, y: 0 };
      }
    }
  });
  // --- 감쇠 처리 로직 끝 ---


  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.cursor = 'grab';

    const handleMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY);
    const handleMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const handleMouseUp = () => handlePointerUp();
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const handleTouchEnd = () => handlePointerUp();

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true }); // passive: true 권장 (스크롤 방지 불필요 시)
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      canvas.style.cursor = 'default';
    };
  }, [gl, handlePointerDown, handlePointerMove, handlePointerUp]); // 핸들러 함수 의존성 추가

  return null;
};

// 배경 별 생성
const StarField = () => {
  const starsRef = useRef<THREE.Points>(null);
  const starCount = 1000;
  
  const starPositions = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return positions;
  }, [starCount]);
  
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001;
    }
  });
  
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={starPositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#ffffff" transparent opacity={0.8} />
    </points>
  );
};


// 원형 파동 컴포넌트 - 더욱 느리고 부드러운 모션 적용
const CircularWave = ({ volume }: { volume: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hue, setHue] = useState(0.6);
  const [smoothVolumeIntensity, setSmoothVolumeIntensity] = useState(0);

  // Jitter 타겟 위치 Ref (더 부드러운 Jitter를 위해)
  const jitterTargetRef = useRef(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    const colorInterval = setInterval(() => {
      setHue((prev) => (prev + 0.001) % 1);
    }, 50);
    return () => clearInterval(colorInterval);
  }, []);

  const rings = useMemo(() => {
    const result: Array<{ geometry: THREE.RingGeometry, initialScale: number, phase: number, baseColor: number[], type: string, rotation?: number }> = [];
    for (let i = 0; i < 2; i++) {
      result.push({
        geometry: new THREE.RingGeometry(1, 1.03, 64),
        initialScale: 0.5 + i * 0.3,
        phase: i * Math.PI / 3,
        baseColor: [0.2, 0.5 + i * 0.1, 1.0],
        type: 'circle',
      });
    }
    for (let i = 0; i < 3; i++) {
      const sides = [3, 4, 5][i];
      result.push({
        geometry: new THREE.RingGeometry(0.8, 0.83, sides),
        initialScale: 0.7 + i * 0.4,
        phase: i * Math.PI / 2.5,
        baseColor: [0.8, 0.3, 0.5 + i * 0.2],
        type: 'polygon',
        rotation: Math.PI / 4,
      });
    }
    return result;
  }, []);

  useFrame(({ clock }, delta) => { // delta 추가 (Jitter 업데이트 간격 조절용)
    if (!groupRef.current) return;

    // --- 수정: 볼륨 강도 업데이트 속도 더 늦춤 ---
    const targetVolumeIntensity = THREE.MathUtils.lerp(0, 0.7, Math.min(1, volume / 100));
    // lerp 계수를 0.05 -> 0.02로 줄여 더 느리게 반응하도록 함
    const newSmoothIntensity = THREE.MathUtils.lerp(smoothVolumeIntensity, targetVolumeIntensity, 0.05);
    setSmoothVolumeIntensity(newSmoothIntensity);
    // --- 수정 끝 ---

    const baseIntensity = 0.3;
    const totalIntensity = baseIntensity + newSmoothIntensity;
    const time = clock.getElapsedTime();

    rings.forEach((ring, i) => {
      const child = groupRef.current!.children[i];
      if (child instanceof THREE.Mesh) {

        let wave = 0;
        let baseScale = ring.initialScale;

        // --- 수정: volumeScale 계산에 newSmoothIntensity 사용 ---
        // (newSmoothIntensity 범위 0~0.7) -> (volume 범위 0~100) 환산 기준 필요
        // newSmoothIntensity가 0.7일 때 volume 100에 해당
        const equivalentVolume = (newSmoothIntensity / 0.7) * 100;
        let volumeScale: number;
        // --- 수정 끝 ---


        if (ring.type === 'circle') {
          wave = Math.sin(time * 0.75 + ring.phase) * 0.05 * totalIntensity; // 0.1 -> 0.05
          volumeScale = (equivalentVolume / 300) * ring.initialScale;
          const scale = baseScale + volumeScale + wave;
          child.scale.set(scale, scale, 1);
          child.rotation.z += 0.0005 * (i % 2 === 0 ? 1 : -1); // 속도 유지 (이전 조정)
        } else { // polygo
          wave = Math.cos(time * 0.6 + ring.phase) * 0.075 * totalIntensity; // 0.15 -> 0.075
          volumeScale = (equivalentVolume / 250) * ring.initialScale;
          const scale = baseScale + volumeScale + wave;
          child.scale.set(scale, scale, 1);
          child.rotation.z += (0.001 + newSmoothIntensity * 0.005) * (i % 2 === 0 ? 1 : -1); // 속도 유지 (이전 조정)
        }

        if (child.material instanceof THREE.MeshBasicMaterial) {
          const material = child.material;
          const currentHue = (hue + i * 0.05) % 1;
          const saturation = 0.7 + newSmoothIntensity * 0.3; // 부드러운 값 사용
          const lightness = 0.5 + Math.sin(time * 0.25 + i) * 0.2; // 속도 유지 (이전 조정)
          material.color.setHSL(currentHue, saturation, lightness);

          const baseOpacity = 0.2 + (i * 0.03);
          const volumeOpacity = (equivalentVolume / 400);
          material.opacity = baseOpacity + volumeOpacity + Math.sin(time * 0.75 + i) * 0.15; // 속도/진폭 유지 (이전 조정)
          material.opacity = Math.max(0, Math.min(1, material.opacity));
        }
      }
    });

    // 그룹 전체 Jitter 효과
    if (volume > 20) {
        // --- 수정: Jitter 타겟을 부드럽게 업데이트하고 강도 더 줄임 ---
        // 매 프레임 타겟을 바꾸지 않고, 가끔씩만 새 타겟 설정 (예: 약 1초마다)
        if (Math.random() < delta * 1.0 ) { // delta * N (N=1이면 평균 1초)
            const randomTargetX = (Math.random() - 0.5) * 0.005 * newSmoothIntensity; // 강도 더 줄임: 0.015 -> 0.005
            const randomTargetY = (Math.random() - 0.5) * 0.005 * newSmoothIntensity;
            jitterTargetRef.current.set(randomTargetX, randomTargetY, 0);
        }
        // 현재 위치에서 Jitter 타겟으로 천천히 이동
        groupRef.current.position.lerp(jitterTargetRef.current, 0.33); // lerp 계수도 줄여 더 부드럽게 (0.1 -> 0.03)
        // --- 수정 끝 ---
    } else {
      // 볼륨 낮을 시 중앙으로 복귀 (lerp 계수 조절 가능)
      groupRef.current.position.lerp(new THREE.Vector3(0, 0, 0), 0.33); // 0.05 -> 0.03
      jitterTargetRef.current.set(0,0,0); // 타겟도 중앙으로 리셋
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {rings.map((ring, i) => (
        <mesh key={i} position={[0, 0, -0.05 * i]} rotation={[0, 0, ring.rotation || 0]}>
          <primitive object={ring.geometry} attach="geometry" />
          <meshBasicMaterial
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            color={new THREE.Color().setRGB(
              ring.baseColor[0],
              ring.baseColor[1],
              ring.baseColor[2]
            )}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

const ParticleEffect = ({ volume }: { volume: number }) => {
  const particlesRef = useRef<THREE.Group>(null);
  const particleCount = 50; // 파티클 수를 50으로 유지

  // 파티클 데이터 초기화 시 각 파티클의 고유한 초기 HUE 값 저장
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      ],
      scale: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.02 + 0.01,
      // 각 파티클마다 고유한 시작 색상(HUE)과 위상(phase) 저장
      initialHue: Math.random(), // 0.0 ~ 1.0 사이의 랜덤 HUE 값
      phase: Math.random() * Math.PI * 2
    }));
  }, [particleCount]); // particleCount 변경 시에만 재생성

  useFrame(({ clock }) => {
    if (!particlesRef.current) return;

    const time = clock.getElapsedTime();

    particlesRef.current.children.forEach((particle, i) => {
      if (particle instanceof THREE.Mesh) {
        const data = particles[i];

        // 위치 계산 (이전과 동일)
        const angle = time * data.speed + data.phase;
        const radius = 1.2 + Math.sin(time * 0.3 + i) * 0.3;
        particle.position.x = Math.cos(angle) * radius;
        particle.position.y = Math.sin(angle * 0.7) * radius * 0.8;
        particle.position.z = Math.sin(time * 0.2 + i) * 1.0;

        // 크기 계산 (이전과 동일)
        const baseScale = data.scale * 0.5;
        const pulseScale = Math.sin(time * 2 + data.phase) * 0.05;
        const scale = Math.max(0.01, baseScale + pulseScale);
        particle.scale.set(scale, scale, scale);

        // --- 색상 계산 수정 ---
        if (particle.material instanceof THREE.MeshBasicMaterial) {
          // 1. 시간에 따라 부드럽게 변하는 기본 HUE
          const timeHue = (time * 0.1) % 1; // HUE 변화 속도 증가 (0.05 -> 0.1)

          // 2. 각 파티클의 초기 HUE 값과 시간 HUE를 더함 (더 다양한 색상 시작점)
          const finalHue = (data.initialHue + timeHue) % 1;

          // 3. 채도(Saturation)를 시간에 따라 변경 (0.7 ~ 1.0 범위)
          const saturation = 0.85 + Math.sin(time * 0.5 + data.phase) * 0.15;

          // 4. 밝기(Lightness)를 시간에 따라 약간 변경 (0.5 ~ 0.7 범위)
          const lightness = 0.6 + Math.sin(time * 0.8 + data.phase * 0.5) * 0.1;

          // 계산된 HSL 값으로 색상 설정
          particle.material.color.setHSL(finalHue, saturation, lightness);

          // 투명도 계산 (이전과 동일하지만 약간의 변화 추가 가능)
          particle.material.opacity = Math.min(1.0, 0.6 + Math.sin(time * 1.2 + data.phase) * 0.2); // 투명도 변화 폭/속도 조절
        }
        // --- 색상 계산 수정 끝 ---
      }
    });

    // 그룹 전체 회전 (이전과 동일)
    particlesRef.current.rotation.y += 0.0005;
    particlesRef.current.rotation.x += 0.0003;
  });

  return (
    <group ref={particlesRef}>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position as [number, number, number]}>
           <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial
            // 초기 색상은 HSL 계산으로 덮어쓰므로 여기서 설정 불필요
            transparent
            opacity={1.0} // 초기 투명도
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// --- 상수 정의 ---
const ENTRY_LENGTH = 3.2;
const EXIT_LENGTH = -0.1;
const TRANSITION_ZONE_LENGTH = 10;
const MAX_PARTICLES = 4000;
const BASE_SPAWN_RATE = 2000;
const MIN_RADIUS = 0.03;
const END_RADIUS_FACTOR = 80.0;
const FADE_IN_DURATION = 0.08;
const FADE_OUT_DURATION = 0.02;
const MAX_PARTICLE_SIZE = 0.015;
const MIN_PARTICLE_SIZE = 0.0015;
const SIZE_CHANGE_POWER = 15;
const HUE_VARIATION = 0.05;
const PARTICLE_ROTATION_SPEED = 0.1;
const WOBBLE_INTENSITY_FACTOR = 0;
const LIFETIME_ACCELERATION_FACTOR = 10; // 수명 가속도 계수 (값이 클수록 끝에서 더 빨라짐)
const LIFETIME_ACCELERATION_POWER = 2;    // 수명 가속도 지수 (값이 클수록 가속이 끝에 집중됨)
const MAX_EFFECTIVE_LIFETIME = 1;     // 파티클 비활성화 기준 수명 (가속도 계산에 사용)


// Easing 함수 (easeInOutQuad)
const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

// Smoothstep 유틸리티 함수
const smoothstep = (x: number, edge0: number, edge1: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// --- 원형 텍스처 생성 함수 (오류 처리 수정) ---
const createCircleTexture = (size: number, color: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  // *** 오류 처리 수정: 컨텍스트 없으면 에러 발생 ***
  if (!context) {
    console.error("Failed to get 2D context for circle texture.");
    // 호환되지 않는 Texture 대신 에러를 발생시켜 문제 인지
    throw new Error("Could not create 2D context for CanvasTexture");
  }

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2;

  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  // CSS 색상 문자열에서 알파 값 분리 및 적용 (예: #FFFFFF -> #FFFFFFXX)
  const baseColor = color.slice(0, 7); // #RRGGBB 부분
  gradient.addColorStop(0, `${baseColor}FF`);   // 중심: 완전 불투명
  gradient.addColorStop(0.5, `${baseColor}CC`); // 중간: 약간 투명
  gradient.addColorStop(1, `${baseColor}00`);   // 가장자리: 완전 투명

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  // CanvasTexture 생성 및 반환 (이제 항상 CanvasTexture 타입)
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};
// --- 원형 텍스처 생성 함수 끝 ---


const QuasarJet = ({ volume }: { volume: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // 파티클 데이터 풀 생성 (이전과 동일)
  const particleAttributes = useMemo(() => {
    // ... (파티클 초기화 로직) ...
    console.log("Initializing Enhanced QuasarJet Particle Pool (Circle Texture):", MAX_PARTICLES);
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 4);
    const lifetimes = new Float32Array(MAX_PARTICLES);
    const activeState = new Float32Array(MAX_PARTICLES);
    const initDirections = new Float32Array(MAX_PARTICLES * 2);
    const randomFactors = new Float32Array(MAX_PARTICLES * 4);
    const sizes = new Float32Array(MAX_PARTICLES);
    const rotationSpeeds = new Float32Array(MAX_PARTICLES);

    const baseColor = new THREE.Color("#9400D3");
    const midColor = new THREE.Color("#FFFFFF");
    const endColor = new THREE.Color("#00FFFF");

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const i2 = i * 2;
      positions[i3 + 2] = Infinity;
      colors[i4 + 3] = 0;
      lifetimes[i] = 0;
      activeState[i] = 0;
      const angleXY = Math.random() * Math.PI * 2;
      initDirections[i2 + 0] = Math.cos(angleXY);
      initDirections[i2 + 1] = Math.sin(angleXY);
      randomFactors[i3 + 0] = Math.random() * Math.PI * 2;
      randomFactors[i3 + 1] = Math.random() * Math.PI * 2;
      randomFactors[i3 + 2] = 0.6 + Math.random() * 0.8;
      randomFactors[i3 + 3] = (Math.random() - 0.5) * HUE_VARIATION * 2;
      sizes[i] = 1.0;
      rotationSpeeds[i] = (Math.random() - 0.5) * PARTICLE_ROTATION_SPEED * 2;
    }
    return { positions, colors, lifetimes, activeState, initDirections, randomFactors, sizes, rotationSpeeds, baseColor, midColor, endColor };
  }, [HUE_VARIATION, PARTICLE_ROTATION_SPEED]);

  // 원형 텍스처 생성 (useMemo 사용)
  const circleTexture = useMemo(() => {
      try {
          return createCircleTexture(64, '#FFFFFF'); // 64x64 흰색 원
      } catch (error) {
          console.error("Failed to create circle texture in useMemo:", error);
          // 텍스처 생성 실패 시 null 반환 또는 다른 기본 텍스처 반환
          return null; // 또는 new THREE.Texture() 등 상황에 맞는 처리
      }
  }, []); // 의존성 배열 비어있음 (최초 1회 실행)


  // 지오메트리 설정 (이전과 동일)
  useEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry || !particleAttributes) return;
    geometry.setAttribute('position', new THREE.BufferAttribute(particleAttributes.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(particleAttributes.colors, 4));
    geometry.setAttribute('size', new THREE.BufferAttribute(particleAttributes.sizes, 1));
    geometry.setDrawRange(0, MAX_PARTICLES);
    geometry.boundingSphere = null;
    geometry.boundingBox = null;
  }, [particleAttributes]);

  // 파티클 머티리얼 (map 속성 추가, circleTexture가 null일 경우 대비)
  const material = useMemo(() => new THREE.PointsMaterial({
    size: MAX_PARTICLE_SIZE,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    map: circleTexture, // 텍스처 적용 (null일 경우 map이 설정되지 않음)
    // alphaTest: 0.01,
  }), [circleTexture]); // circleTexture 의존성 추가

  // 나머지 코드 (spawnCounter, curveParams, calculateRadius, useMemo hooks, useFrame)는 이전과 동일
  // 누적 스폰 카운터
  const spawnCounter = useRef(0);

  // 하이퍼볼라 곡선 파라미터 계산
  const curveParams = useMemo(() => {
    const minRadiusSquared = MIN_RADIUS * MIN_RADIUS;
    const maxRadius = MIN_RADIUS * END_RADIUS_FACTOR;
    const maxRadiusSquared = maxRadius * maxRadius;
    const referenceLength = Math.max(ENTRY_LENGTH, EXIT_LENGTH);
    let k = 0;
    if (referenceLength > 1e-6) {
      k = (maxRadiusSquared - minRadiusSquared) / (referenceLength * referenceLength);
    }
    k = Math.max(0, k);
    return { minRadiusSquared, k };
  }, [MIN_RADIUS, END_RADIUS_FACTOR, ENTRY_LENGTH, EXIT_LENGTH]);

  // z 위치에 따른 제트 반경 계산 함수
  const calculateRadius = useCallback((z: number): number => {
    const { minRadiusSquared, k } = curveParams;
    const halfTransition = TRANSITION_ZONE_LENGTH / 2;
    const absZ = Math.abs(z);
    const hyperbolicRadiusSquared = minRadiusSquared + k * z * z;
    const hyperbolicRadius = Math.sqrt(hyperbolicRadiusSquared);
    let finalRadius: number;
    if (absZ <= halfTransition && halfTransition > 1e-6) {
        const t = smoothstep(absZ, 0, halfTransition);
        finalRadius = THREE.MathUtils.lerp(MIN_RADIUS, hyperbolicRadius, t);
    } else {
        finalRadius = hyperbolicRadius;
    }
    return Math.max(MIN_RADIUS, finalRadius);
  }, [curveParams, TRANSITION_ZONE_LENGTH, MIN_RADIUS]);

  // useMemo 훅들
  const tempColor = useMemo(() => new THREE.Color(), []);
  const currentBaseColor = useMemo(() => particleAttributes.baseColor.clone(), [particleAttributes.baseColor]);
  const currentMidColor = useMemo(() => particleAttributes.midColor.clone(), [particleAttributes.midColor]);
  const currentEndColor = useMemo(() => particleAttributes.endColor.clone(), [particleAttributes.endColor]);


  // 애니메이션 루프
  useFrame(({ clock }, delta) => {
    const geometry = geometryRef.current;
    const points = pointsRef.current;
     // 텍스처 로딩 실패 시 또는 초기화 중일 때 실행 방지 강화
    if (!geometry || !points || !material || !geometry.attributes.position || !geometry.attributes.color || !geometry.attributes.size || !particleAttributes) return;


    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;
    const lifetimes = particleAttributes.lifetimes;
    const activeState = particleAttributes.activeState;
    const initDirections = particleAttributes.initDirections;
    const randomFactors = particleAttributes.randomFactors;
    const rotationSpeeds = particleAttributes.rotationSpeeds;

    const time = clock.elapsedTime;
    const normalizedVolume = (volume >= 30) ? Math.min(1, Math.max(0, volume) / 100) : 0;
    const targetSpawnRate = BASE_SPAWN_RATE * normalizedVolume;
    const numToSpawnFloat = targetSpawnRate * delta + spawnCounter.current;
    const numToSpawnInt = Math.floor(numToSpawnFloat);
    spawnCounter.current = numToSpawnFloat - numToSpawnInt;
    let spawnedCount = 0;

    const safeDelta = Math.min(delta, 0.05);
    const baseSpeed = 0.05 * 3.5;
    const maxDist = Math.max(ENTRY_LENGTH, EXIT_LENGTH);
    const minSizeFactor = MAX_PARTICLE_SIZE > 1e-9 ? MIN_PARTICLE_SIZE / MAX_PARTICLE_SIZE : 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const i2 = i * 2;

      // 1. 활성 파티클 업데이트
      if (activeState[i] === 1) {
        const currentLifetime = lifetimes[i];
        const baseLifetimeSpeedFactor = randomFactors[i3 + 2];
        const lifetimeProgress = Math.min(1, currentLifetime / MAX_EFFECTIVE_LIFETIME);
        const accelerationMultiplier = 1.0 + LIFETIME_ACCELERATION_FACTOR * Math.pow(lifetimeProgress, LIFETIME_ACCELERATION_POWER);
        const currentSpeedFactor = baseLifetimeSpeedFactor * accelerationMultiplier;
        lifetimes[i] += safeDelta * baseSpeed * currentSpeedFactor;

        if (lifetimes[i] >= MAX_EFFECTIVE_LIFETIME) {
            activeState[i] = 0;
            colors[i4 + 3] = 0;
            positions[i3 + 2] = Infinity;
            sizes[i] = minSizeFactor;
            continue;
        }

        const normalizedLifetime = Math.min(1.0, lifetimes[i] / MAX_EFFECTIVE_LIFETIME);
        const easedLifetime = easeInOutQuad(normalizedLifetime);
        const currentZ = THREE.MathUtils.lerp(-ENTRY_LENGTH, EXIT_LENGTH, easedLifetime);
        const currentRadius = calculateRadius(currentZ);

        const initialAngle = Math.atan2(initDirections[i2 + 1], initDirections[i2 + 0]);
        const rotationAngle = rotationSpeeds[i] * time;
        const currentAngle = initialAngle + rotationAngle;
        const rotatedDirX = Math.cos(currentAngle);
        const rotatedDirY = Math.sin(currentAngle);

        let currentX = rotatedDirX * currentRadius;
        let currentY = rotatedDirY * currentRadius;

        const randomPhaseX = randomFactors[i3 + 0];
        const randomPhaseY = randomFactors[i3 + 1];
        const wobbleFrequency = time * 1.5;
        const wobbleStrengthFactor = maxDist > 1e-6 ? Math.abs(currentZ) / maxDist : 0;
        const wobbleAmplitude = currentRadius * WOBBLE_INTENSITY_FACTOR * (0.5 + wobbleStrengthFactor);
        currentX += Math.sin(wobbleFrequency + randomPhaseX) * wobbleAmplitude;
        currentY += Math.cos(wobbleFrequency + randomPhaseY) * wobbleAmplitude;

        positions[i3 + 0] = currentX;
        positions[i3 + 1] = currentY;
        positions[i3 + 2] = currentZ;

        const hueOffset = randomFactors[i3 + 3];
        const particleBaseColor = tempColor.copy(currentBaseColor).offsetHSL(hueOffset, 0, 0);
        const particleEndColor = tempColor.copy(currentEndColor).offsetHSL(hueOffset, 0, 0);
        let phase: number;
        if (easedLifetime < 0.5) {
          phase = easedLifetime * 2;
          tempColor.copy(particleBaseColor).lerp(currentMidColor, phase);
        } else {
          phase = (easedLifetime - 0.5) * 2;
          tempColor.copy(currentMidColor).lerp(particleEndColor, phase);
        }
        colors[i4 + 0] = tempColor.r;
        colors[i4 + 1] = tempColor.g;
        colors[i4 + 2] = tempColor.b;

        let alpha = 1.0;
        const currentAbsoluteLifetime = lifetimes[i];
        if (currentAbsoluteLifetime < FADE_IN_DURATION) {
            alpha = currentAbsoluteLifetime / FADE_IN_DURATION;
        } else if (currentAbsoluteLifetime > MAX_EFFECTIVE_LIFETIME - FADE_OUT_DURATION) {
            alpha = (MAX_EFFECTIVE_LIFETIME - currentAbsoluteLifetime) / FADE_OUT_DURATION;
        }
        colors[i4 + 3] = THREE.MathUtils.clamp(alpha, 0, 1);

        let normalizedDist = 0;
        if (maxDist > 1e-6) {
            normalizedDist = Math.abs(currentZ) / maxDist;
        }
        normalizedDist = Math.min(normalizedDist, 1.0);
        const sizeProgress = Math.pow(normalizedDist, SIZE_CHANGE_POWER);
        const currentSizeFactor = THREE.MathUtils.lerp(minSizeFactor, 1.0, sizeProgress);
        sizes[i] = currentSizeFactor;

      // 2. 비활성 파티클 -> 활성 파티클 (생성)
      } else if (spawnedCount < numToSpawnInt) {
        activeState[i] = 1;
        lifetimes[i] = 0;
        spawnedCount++;

        const initialZ = -ENTRY_LENGTH;
        const initialRadius = calculateRadius(initialZ);
        const initDirX = initDirections[i2 + 0];
        const initDirY = initDirections[i2 + 1];
        const biasedRandom = Math.pow(Math.random(), 2.5);
        const randomRadiusFactor = 0.05 + biasedRandom * 0.95;

        positions[i3 + 0] = initDirX * initialRadius * randomRadiusFactor;
        positions[i3 + 1] = initDirY * initialRadius * randomRadiusFactor;
        positions[i3 + 2] = initialZ;

        const hueOffset = randomFactors[i3 + 3];
        tempColor.copy(currentBaseColor).offsetHSL(hueOffset, 0, 0);
        colors[i4 + 0] = tempColor.r;
        colors[i4 + 1] = tempColor.g;
        colors[i4 + 2] = tempColor.b;
        colors[i4 + 3] = 0;
        sizes[i] = minSizeFactor;
      }
    } // End of particle loop

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  }); // End of useFrame

  return (
    <points ref={pointsRef} material={material}>
      <bufferGeometry ref={geometryRef} />
    </points>
  );
};


// 발광 효과를 위한 후처리 (블룸 대체)
const GlowEffect = () => {
  const { scene, camera, gl } = useThree();
  
  useEffect(() => {
    // 기존 렌더러의 설정을 강화
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.5;
    gl.outputEncoding = THREE.sRGBEncoding;
    
    // 후처리 효과를 사용하려면 postprocessing 라이브러리 필요
    // 현재는 기본 설정 강화로 대체
    
    return () => {
      gl.toneMapping = THREE.NoToneMapping;
      gl.toneMappingExposure = 1;
    };
  }, [gl]);
  
  return null;
};

const ThreeScene = ({ volume }: ThreeSceneProps) => {
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [-0.7, 0.5, -4], fov: 110 }}
      gl={{ 
        antialias: true, 
        alpha: true,
        powerPreference: 'high-performance'
      }}
    >
      {/* 렌더링 품질 향상 */}
      <GlowEffect />
      
      {/* 카메라 드래그 컨트롤 */}
      <CameraControls />
      
      {/* 배경 별 */}
      <StarField />
      
      {/* 원형 파동 */}
      <CircularWave volume={volume} />

      <QuasarJet volume={volume} />
      
      {/* 파티클 효과 */}
      <ParticleEffect volume={volume} />
      
      {/* 조명 */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#4fc3dc" />
      <pointLight position={[-5, -5, 5]} intensity={0.8} color="#ff2d75" />
    </Canvas>
  );
};

export default ThreeScene;
