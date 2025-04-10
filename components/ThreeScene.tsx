'use client';

import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei'; // shaderMaterial import 추가


interface ThreeSceneProps {
  volume: number;
}

// 드래그 컨트롤 구현
const CameraControls = () => {
  const { camera, gl } = useThree();
  const isDraggingRef = useRef(false);
  const previousPositionRef = useRef({ x: 0, y: 0 });
  // 카메라 회전값(각도)을 ref로 관리 (상태 대신 사용)
  // 초기 각도는 초기 카메라 위치에 맞춰 설정하거나 0으로 시작
  const rotationRef = useRef({ x: 0, y: 0 });
  const radiusRef = useRef(7); // 카메라와 원점 사이의 거리

  // 초기 카메라 위치에서 초기 각도 계산 (선택적)
  useEffect(() => {
      const initialPos = camera.position;
      radiusRef.current = initialPos.length(); // 초기 거리 설정
      rotationRef.current.x = Math.asin(initialPos.y / radiusRef.current);
      rotationRef.current.y = Math.atan2(initialPos.x, initialPos.z);
  }, [camera]); // 최초 마운트 시 실행

  // 이벤트 핸들러들을 useCallback으로 감싸 불필요한 재생성 방지
  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    previousPositionRef.current = { x: clientX, y: clientY };
    gl.domElement.style.cursor = 'grabbing'; // 드래그 중 커서 변경
  }, [gl.domElement.style]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;

    const deltaX = clientX - previousPositionRef.current.x;
    const deltaY = clientY - previousPositionRef.current.y;

    // Ref 값을 직접 업데이트
    rotationRef.current.y += deltaX * 0.005;
    // 수직 회전 각도 제한 (-PI/2 ~ PI/2 범위 근처)
    rotationRef.current.x = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, rotationRef.current.x + deltaY * 0.005)
    );

    // 구면 좌표계를 사용하여 카메라 위치 계산
    const radius = radiusRef.current;
    const phi = rotationRef.current.x; // 수직 각도 (latitude)
    const theta = rotationRef.current.y; // 수평 각도 (longitude)

    camera.position.x = radius * Math.cos(phi) * Math.sin(theta);
    camera.position.y = radius * Math.sin(phi);
    camera.position.z = radius * Math.cos(phi) * Math.cos(theta);

    camera.lookAt(0, 0, 0); // 항상 원점을 바라보도록 설정

    previousPositionRef.current = { x: clientX, y: clientY };
  }, [camera]); // camera 객체는 일반적으로 변경되지 않음

  const handlePointerUp = useCallback(() => {
    if (isDraggingRef.current) {
        isDraggingRef.current = false;
        gl.domElement.style.cursor = 'grab'; // 커서 원래대로
    }
  }, [gl.domElement.style]);


  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.cursor = 'grab'; // 초기 커서 설정

    // 마우스 이벤트
    const handleMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY);
    const handleMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    // mouseup은 window에 달아야 드래그 중 캔버스 벗어나도 인식됨
    const handleMouseUp = () => handlePointerUp();

    // 터치 이벤트
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        // 터치 이동 시 기본 스크롤 동작 방지 (선택적)
        // e.preventDefault();
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
     // touchend는 window에 달아야 함
    const handleTouchEnd = () => handlePointerUp();


    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove); // Move 이벤트는 window에
    window.addEventListener('mouseup', handleMouseUp);     // Up 이벤트는 window에

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false }); // passive:false 로 preventDefault 가능하게
    window.addEventListener('touchmove', handleTouchMove);   // Move 이벤트는 window에
    window.addEventListener('touchend', handleTouchEnd);     // End 이벤트는 window에

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      canvas.style.cursor = 'default'; // 컴포넌트 언마운트 시 커서 복원
    };
    // 의존성 배열 간소화: 핸들러 함수들을 useCallback으로 감쌌으므로 gl만 필요할 수 있음
    // 또는 핸들러 함수들을 의존성 배열에 포함 (useCallback 사용 시 안정적)
  }, [gl, handlePointerDown, handlePointerMove, handlePointerUp]);

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
const ENTRY_LENGTH = 3.5;
const EXIT_LENGTH = 5;
const TRANSITION_ZONE_LENGTH = 8;
const MAX_PARTICLES = 4000;
const BASE_SPAWN_RATE = 2000;
const MIN_RADIUS = 0.03;
const END_RADIUS_FACTOR = 80.0;
const FADE_IN_DURATION = 0.08;
const FADE_OUT_DURATION = 0.02;
const MAX_PARTICLE_SIZE = 0.01; // 기본 최대 크기를 줄여봅니다.
const MIN_PARTICLE_SIZE = 0.0015; // 최소 크기도 비례하여 줄입니다.
const SIZE_CHANGE_POWER = 15;
const HUE_VARIATION = 0.05;
const PARTICLE_ROTATION_SPEED = 0.5;
const WOBBLE_INTENSITY_FACTOR = 0.05;
// --- 상수 정의 끝 ---

// Easing 함수 (easeInOutQuad)
const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

// Smoothstep 유틸리티 함수
const smoothstep = (x: number, edge0: number, edge1: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const QuasarJet = ({ volume }: { volume: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // 파티클 데이터 풀 생성 (useMemo 위치는 여기, 컴포넌트 최상위)
  const particleAttributes = useMemo(() => {
    console.log("Initializing Enhanced QuasarJet Particle Pool (No Texture):", MAX_PARTICLES);
    // ... (이전과 동일한 초기화 로직) ...
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
      sizes[i] = 1.0; // 초기값은 중요하지 않음, 어차피 계산됨
      rotationSpeeds[i] = (Math.random() - 0.05) * PARTICLE_ROTATION_SPEED * 2;
    }
    return { positions, colors, lifetimes, activeState, initDirections, randomFactors, sizes, rotationSpeeds, baseColor, midColor, endColor };
  }, [HUE_VARIATION, PARTICLE_ROTATION_SPEED]); // 의존성 배열은 그대로 유지

  // 지오메트리 설정 (useEffect는 여기에 위치)
  useEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry || !particleAttributes) return;
    // ... (이전과 동일한 setAttribute 로직) ...
    geometry.setAttribute('position', new THREE.BufferAttribute(particleAttributes.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(particleAttributes.colors, 4));
    geometry.setAttribute('size', new THREE.BufferAttribute(particleAttributes.sizes, 1));
    geometry.setDrawRange(0, MAX_PARTICLES);
    geometry.boundingSphere = null;
    geometry.boundingBox = null;
  }, [particleAttributes]);

  // 파티클 머티리얼 (useMemo는 여기에 위치)
  const material = useMemo(() => new THREE.PointsMaterial({
    size: MAX_PARTICLE_SIZE, // 조정된 기본 크기 사용
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }), []); // MAX_PARTICLE_SIZE가 상수이므로 의존성 배열 필요 없음

  // 누적 스폰 카운터 (useRef는 여기에 위치)
  const spawnCounter = useRef(0);

  // 하이퍼볼라 곡선 파라미터 계산 (useMemo는 여기에 위치)
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
    // console.log(`Corrected Curve Params: k=${k.toFixed(4)}, minRadius=${MIN_RADIUS}, maxRadius=${maxRadius.toFixed(2)}`);
    return { minRadiusSquared, k };
  }, [MIN_RADIUS, END_RADIUS_FACTOR, ENTRY_LENGTH, EXIT_LENGTH]); // 관련 상수 의존성

  // z 위치에 따른 제트 반경 계산 함수 (useCallback은 여기에 위치)
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
  }, [curveParams, TRANSITION_ZONE_LENGTH, MIN_RADIUS]); // 관련 의존성

  // *** useMemo 훅들을 useFrame 밖, 컴포넌트 최상위 레벨로 이동 ***
  const tempColor = useMemo(() => new THREE.Color(), []);
  // particleAttributes가 변경될 때만 clone 실행하도록 최적화
  const currentBaseColor = useMemo(() => particleAttributes.baseColor.clone(), [particleAttributes.baseColor]);
  const currentMidColor = useMemo(() => particleAttributes.midColor.clone(), [particleAttributes.midColor]);
  const currentEndColor = useMemo(() => particleAttributes.endColor.clone(), [particleAttributes.endColor]);

  // 애니메이션 루프
  useFrame(({ clock }, delta) => {
    const geometry = geometryRef.current;
    const points = pointsRef.current;
    // particleAttributes가 아직 준비되지 않았으면 실행 중지
    if (!geometry || !points || !geometry.attributes.position || !geometry.attributes.color || !geometry.attributes.size || !particleAttributes) return;

    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array; // 크기 배율 배열
    const lifetimes = particleAttributes.lifetimes;
    const activeState = particleAttributes.activeState;
    const initDirections = particleAttributes.initDirections;
    const randomFactors = particleAttributes.randomFactors;
    const rotationSpeeds = particleAttributes.rotationSpeeds;
    // 이제 particleAttributes에서 직접 base/mid/endColor를 참조하지 않고, 위에서 memoized된 current*Color 사용
    // const { baseColor, midColor, endColor } = particleAttributes; // 이 줄은 제거하거나 주석 처리
    const time = clock.elapsedTime;

    const normalizedVolume = (volume >= 20) ? Math.min(1, Math.max(0, volume) / 100) : 0;
    const targetSpawnRate = BASE_SPAWN_RATE * normalizedVolume;
    const numToSpawnFloat = targetSpawnRate * delta + spawnCounter.current;
    const numToSpawnInt = Math.floor(numToSpawnFloat);
    spawnCounter.current = numToSpawnFloat - numToSpawnInt;
    let spawnedCount = 0;

    const safeDelta = Math.min(delta, 0.05);
    const baseSpeed = 0.05 * 3.5;
    const maxDist = Math.max(ENTRY_LENGTH, EXIT_LENGTH);
    // *** minSizeFactor 계산은 material.size (MAX_PARTICLE_SIZE) 변경에 맞춰 업데이트됨 ***
    const minSizeFactor = MAX_PARTICLE_SIZE > 1e-9 ? MIN_PARTICLE_SIZE / MAX_PARTICLE_SIZE : 0; // 0으로 나누기 방지 강화

    // *** tempColor, current*Color 는 루프 밖에서 이미 정의됨 ***

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const i2 = i * 2;

      // 1. 활성 파티클 업데이트
      if (activeState[i] === 1) {
        const lifetimeSpeedFactor = randomFactors[i3 + 2];
        lifetimes[i] += safeDelta * baseSpeed * lifetimeSpeedFactor;

        if (lifetimes[i] >= 0.45) {
            activeState[i] = 0;
            colors[i4 + 3] = 0;
            positions[i3 + 2] = Infinity;
            sizes[i] = minSizeFactor; // 비활성화 시 크기 리셋
            continue;
        }

        const currentLifetime = lifetimes[i];
        const easedLifetime = easeInOutQuad(currentLifetime);
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

        // 색상 계산 (memoized된 current*Color 사용)
        const hueOffset = randomFactors[i3 + 3];
        // 매번 clone 대신 offsetHSL 적용
        const particleBaseColor = tempColor.copy(currentBaseColor).offsetHSL(hueOffset, 0, 0);
        // 중간색은 흰색이므로 HSL 변화 없음 (만약 midColor가 흰색이 아니라면 아래처럼 적용)
        // const particleMidColor = tempColor.copy(currentMidColor).offsetHSL(hueOffset, 0, 0);
        const particleEndColor = tempColor.copy(currentEndColor).offsetHSL(hueOffset, 0, 0);


        let phase: number;
        if (easedLifetime < 0.1) {
          phase = easedLifetime * 2;
          // lerpColors는 첫 번째 인자를 수정하므로, 임시 색상 객체 사용
          tempColor.copy(particleBaseColor).lerp(currentMidColor, phase); // midColor는 hue 변화 없으므로 currentMidColor 직접 사용
        } else {
          phase = (easedLifetime - 0.5) * 2;
          tempColor.copy(currentMidColor).lerp(particleEndColor, phase);
        }
        colors[i4 + 0] = tempColor.r;
        colors[i4 + 1] = tempColor.g;
        colors[i4 + 2] = tempColor.b;

        // 알파 계산
        let alpha = 1.0;
        if (currentLifetime < FADE_IN_DURATION) {
          alpha = currentLifetime / FADE_IN_DURATION;
        } else if (currentLifetime > 1.0 - FADE_OUT_DURATION) {
          alpha = (1.0 - currentLifetime) / FADE_OUT_DURATION;
        }
        colors[i4 + 3] = THREE.MathUtils.clamp(alpha, 0, 1);

        // 크기 비율 계산
        let normalizedDist = 0;
        if (maxDist > 1e-6) {
            normalizedDist = Math.abs(currentZ) / maxDist;
        }
        normalizedDist = Math.min(normalizedDist, 1.0);
        const sizeProgress = Math.pow(normalizedDist, SIZE_CHANGE_POWER);
        // *** 크기 비율(Factor)이므로 0~1 범위를 가짐 ***
        const currentSizeFactor = THREE.MathUtils.lerp(minSizeFactor, 1.0, sizeProgress);
        // *** geometry.attributes.size에는 이 Factor 값을 저장 ***
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

        // 초기 색상 (memoized된 currentBaseColor 사용)
        const hueOffset = randomFactors[i3 + 3];
        tempColor.copy(currentBaseColor).offsetHSL(hueOffset, 0, 0);
        colors[i4 + 0] = tempColor.r;
        colors[i4 + 1] = tempColor.g;
        colors[i4 + 2] = tempColor.b;
        colors[i4 + 3] = 0; // 페이드 인 시작

        // 초기 크기 비율 설정
        sizes[i] = minSizeFactor;
      }
    } // End of particle loop

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true; // size 속성 업데이트 필요
  });

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
