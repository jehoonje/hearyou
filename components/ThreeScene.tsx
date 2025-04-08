'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ThreeSceneProps {
  volume: number;
}

// 드래그 컨트롤 구현
const CameraControls = () => {
  const { camera, gl } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [previousPosition, setPreviousPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setPreviousPosition({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - previousPosition.x;
        const deltaY = e.clientY - previousPosition.y;
        
        setRotation({
          x: rotation.x + deltaY * 0.005,
          y: rotation.y + deltaX * 0.005
        });
        
        camera.position.x = Math.sin(rotation.y) * 7;
        camera.position.z = Math.cos(rotation.y) * 7;
        camera.position.y = Math.sin(rotation.x) * 3;
        camera.lookAt(0, 0, 0);
        
        setPreviousPosition({ x: e.clientX, y: e.clientY });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    // 모바일 터치 이벤트 지원
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true);
        setPreviousPosition({ 
          x: e.touches[0].clientX, 
          y: e.touches[0].clientY 
        });
      }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - previousPosition.x;
        const deltaY = e.touches[0].clientY - previousPosition.y;
        
        setRotation({
          x: rotation.x + deltaY * 0.005,
          y: rotation.y + deltaX * 0.005
        });
        
        camera.position.x = Math.sin(rotation.y) * 7;
        camera.position.z = Math.cos(rotation.y) * 7;
        camera.position.y = Math.sin(rotation.x) * 3;
        camera.lookAt(0, 0, 0);
        
        setPreviousPosition({ 
          x: e.touches[0].clientX, 
          y: e.touches[0].clientY 
        });
      }
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
    };
    
    canvas.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gl, isDragging, previousPosition, rotation, camera]);
  
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



// 원형 파동 컴포넌트 - 화려함 강화
const CircularWave = ({ volume }: { volume: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hue, setHue] = useState(0.6); // 초기 색상: 파란색
  
  // 시간에 따른 색상 변화
  useEffect(() => {
    const colorInterval = setInterval(() => {
      setHue((prev) => (prev + 0.001) % 1);
    }, 50);
    
    return () => clearInterval(colorInterval);
  }, []);
  
  // 더 다양한 링 패턴
  const rings = useMemo(() => {
    const result = [];
    // 기본 링 (원)
    for (let i = 0; i < 6; i++) {
      result.push({
        geometry: new THREE.RingGeometry(1, 1.03, 64),
        initialScale: 0.5 + i * 0.3,
        phase: i * Math.PI / 3,
        baseColor: [0.2, 0.5 + i * 0.1, 1.0],
        type: 'circle',
      });
    }
    
    // 다각형 링 추가
    for (let i = 0; i < 3; i++) {
      const sides = [3, 4, 5][i]; // 삼각형, 사각형, 오각형
      result.push({
        geometry: new THREE.RingGeometry(0.8, 0.83, sides),
        initialScale: 0.7 + i * 0.4,
        phase: i * Math.PI / 2.5,
        baseColor: [0.8, 0.3, 0.5 + i * 0.2], // 분홍색~보라색 계열
        type: 'polygon',
        rotation: Math.PI / 4,
      });
    }
    
    return result;
  }, []);
  
  // 파동 애니메이션
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const baseIntensity = 0.3;
    const volumeIntensity = THREE.MathUtils.lerp(0, 0.7, Math.min(1, volume / 100));
    const totalIntensity = baseIntensity + volumeIntensity;
    
    const time = clock.getElapsedTime();
    
    rings.forEach((ring, i) => {
      const child = groupRef.current!.children[i];
      if (child && child instanceof THREE.Mesh) {
        // 타입별 다른 애니메이션
        if (ring.type === 'circle') {
          const baseScale = ring.initialScale;
          const volumeScale = (volume / 300) * ring.initialScale;
          const wave = Math.sin(time * 1.5 + ring.phase) * 0.1 * totalIntensity;
          
          const scale = baseScale + volumeScale + wave;
          child.scale.set(scale, scale, 1);
          
          child.rotation.z += 0.001 * (i % 2 === 0 ? 1 : -1);
        } else {
          const baseScale = ring.initialScale;
          const volumeScale = (volume / 250) * ring.initialScale;
          const wave = Math.cos(time * 1.2 + ring.phase) * 0.15 * totalIntensity;
          
          const scale = baseScale + volumeScale + wave;
          child.scale.set(scale, scale, 1);
          
          child.rotation.z += (0.002 + volumeIntensity * 0.01) * (i % 2 === 0 ? 1 : -1);
        }
        
        // 색상 및 불투명도 애니메이션
        const material = child.material as THREE.MeshBasicMaterial;
        if (material && material.type === 'MeshBasicMaterial') {
          const currentHue = (hue + i * 0.05) % 1;
          const saturation = 0.7 + volumeIntensity * 0.3;
          const lightness = 0.5 + Math.sin(time * 0.5 + i) * 0.2;
          
          const color = new THREE.Color().setHSL(currentHue, saturation, lightness);
          material.color = color;
          
          const baseOpacity = 0.2 + (i * 0.03);
          const volumeOpacity = volume / 400;
          material.opacity = baseOpacity + volumeOpacity + Math.sin(time * 1.5 + i) * 0.15;
        }
      }
    });
    
    // 그룹 전체에 볼륨에 따른 미세한 움직임 추가
    if (volume > 20) {
      groupRef.current.position.x = (Math.random() - 0.5) * 0.03 * volumeIntensity;
      groupRef.current.position.y = (Math.random() - 0.5) * 0.03 * volumeIntensity;
    } else {
      groupRef.current.position.x *= 0.95;
      groupRef.current.position.y *= 0.95;
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
          />
        </mesh>
      ))}
    </group>
  );
};

// 화려한 파티클 효과
// 화려한 파티클 효과 (볼륨 영향 제거)
const ParticleEffect = ({ volume }: { volume: number }) => { // volume prop은 받지만 사용하지 않음
  const particlesRef = useRef<THREE.Group>(null);
  const particleCount = 100;

  // 파티클 초기화 (기존과 동일)
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      ],
      scale: Math.random() * 0.5 + 0.1,
      speed: Math.random() * 0.02 + 0.01,
      color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
      phase: Math.random() * Math.PI * 2
    }));
  }, [particleCount]);

  // 파티클 애니메이션 (볼륨 영향 제거)
  useFrame(({ clock }) => {
    if (!particlesRef.current) return;

    const time = clock.getElapsedTime();
    // const volumeFactor = Math.min(volume / 100, 1); // volumeFactor 계산 제거

    particlesRef.current.children.forEach((particle, i) => {
      if (particle instanceof THREE.Mesh) {
        const data = particles[i];

        // 원형 패턴으로 움직임 (볼륨 영향 제거)
        const angle = time * data.speed + data.phase;
        const radius = 2 + Math.sin(time * 0.3 + i) * 0.5; // 시간에 따른 반경 변화만 유지

        particle.position.x = Math.cos(angle) * radius; // 볼륨 관련 곱셈 제거
        particle.position.y = Math.sin(angle * 0.7) * radius * 0.8; // 볼륨 관련 곱셈 제거 (0.8 비율은 유지)
        particle.position.z = Math.sin(time * 0.2 + i) * 2; // 볼륨 관련 곱셈 제거

        // 크기 변화 (볼륨 영향 제거, 약간의 펄스만 유지)
        const baseScale = data.scale * 0.5; // 기본 크기 조절 유지
        // const volumeScale = volumeFactor * data.scale * 0.8; // 볼륨 스케일 제거
        const pulseScale = Math.sin(time * 2 + data.phase) * 0.05; // 볼륨 무관한 작은 펄스 (진폭 고정)

        const scale = Math.max(0.01, baseScale + pulseScale); // 기본 + 고정 펄스
        particle.scale.set(scale, scale, scale);

        // 색상 변화 및 투명도 (볼륨 영향 제거)
        if (particle.material instanceof THREE.MeshBasicMaterial) {
          const hue = (time * 0.05 + i * 0.01) % 1; // 시간에 따른 hue 변화 유지

          particle.material.color.setHSL(hue, 0.8, 0.6); // 고정된 채도(S), 밝기(L) 사용

          // 시간에 따른 투명도 변화만 유지
          particle.material.opacity = Math.min(1.0, 0.5 + Math.sin(time + data.phase) * 0.1);
        }
      }
    });

    // 그룹 전체 회전 (볼륨 영향 제거)
    particlesRef.current.rotation.y += 0.0005; // 고정 속도
    particlesRef.current.rotation.x += 0.0003; // 고정 속도
  });

  // 렌더링 부분 (기존과 동일)
  return (
    <group ref={particlesRef}>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position as [number, number, number]}>
           <sphereGeometry args={[0.15, 8, 8]} />
          <meshBasicMaterial
            color={particle.color}
            transparent
            opacity={0.7} // 초기 투명도 고정
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// --- 상수 정의 ---
const ENTRY_LENGTH = 3;
const EXIT_LENGTH = 10;
const MAX_PARTICLES = 2000;
const BASE_SPAWN_RATE = 500;
const BASE_CONE_ANGLE = Math.PI / 15;
const MIN_RADIUS = 0.01; // <<<--- 통로의 최소 반경 (이 값을 조절하여 두께 변경)
const FADE_IN_DURATION = 0.1;
const FADE_OUT_DURATION = 0.1;
// --- 상수 정의 끝 ---

const QuasarJet = ({ volume }: { volume: number }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  // 파티클 데이터 풀 생성
  const particleAttributes = useMemo(() => {
    console.log("Initializing QuasarJet Particle Pool:", MAX_PARTICLES);
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 4); // RGBA
    const lifetimes = new Float32Array(MAX_PARTICLES);
    const activeState = new Float32Array(MAX_PARTICLES);
    const initVelocities = new Float32Array(MAX_PARTICLES * 3);
    const randomFactors = new Float32Array(MAX_PARTICLES * 3);
    const baseColor = new THREE.Color("#6495ED");
    const midColor = new THREE.Color("#FFFFFF");
    const endColor = new THREE.Color("#ADD8E6");

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      positions[i3 + 2] = Infinity;
      colors[i4 + 3] = 0;
      lifetimes[i] = 0;
      activeState[i] = 0;
      const angleXY = Math.random() * Math.PI * 2;
      const spreadFactor = Math.random() * Math.tan(BASE_CONE_ANGLE);
      initVelocities[i3 + 0] = Math.cos(angleXY) * spreadFactor;
      initVelocities[i3 + 1] = Math.sin(angleXY) * spreadFactor;
      randomFactors[i3 + 0] = Math.random() * 2 * Math.PI;
      randomFactors[i3 + 1] = Math.random() * 2 * Math.PI;
      randomFactors[i3 + 2] = 0.7 + Math.random() * 0.6;
    }
    return { positions, colors, lifetimes, activeState, initVelocities, randomFactors, baseColor, midColor, endColor };
  }, []);

  // 지오메트리 설정
  useEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    geometry.setAttribute('position', new THREE.BufferAttribute(particleAttributes.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(particleAttributes.colors, 4));
    geometry.setAttribute('initVelocity', new THREE.BufferAttribute(particleAttributes.initVelocities, 3));
    geometry.setAttribute('randomFactors', new THREE.BufferAttribute(particleAttributes.randomFactors, 3));
    geometry.setDrawRange(0, MAX_PARTICLES);
  }, [particleAttributes]);

  // 파티클 머티리얼
  const material = useMemo(() => new THREE.PointsMaterial({
    size: 0.03,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  }), []);

  // 누적 스폰 카운터
  const spawnCounter = useRef(0);

  // 애니메이션 루프
  useFrame(({ clock }, delta) => {
    const geometry = geometryRef.current;
    const points = pointsRef.current;
    if (!geometry || !points || !geometry.attributes.position || !geometry.attributes.color) return;

    // 버퍼 속성 접근
    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const lifetimes = particleAttributes.lifetimes;
    const activeState = particleAttributes.activeState;
    const initVelocities = geometry.attributes.initVelocity.array as Float32Array;
    const randomFactors = geometry.attributes.randomFactors.array as Float32Array;
    const { baseColor, midColor, endColor } = particleAttributes;
    const time = clock.elapsedTime;

    // 생성 로직
    const normalizedVolume = Math.min(1, Math.max(0, volume) / 100);
    const targetSpawnRate = BASE_SPAWN_RATE * normalizedVolume;
    const numToSpawnFloat = targetSpawnRate * delta + spawnCounter.current;
    const numToSpawnInt = Math.floor(numToSpawnFloat);
    spawnCounter.current = numToSpawnFloat - numToSpawnInt;
    let spawnedCount = 0;

    // 제트 모양 및 속도 파라미터
    const angle = BASE_CONE_ANGLE;
    const tanAngle = Math.tan(angle);
    const speedMult = 1.0 * 2.5;

    // 전체 파티클 풀 순회
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const i4 = i * 4;

      if (activeState[i] === 1) { // 활성 파티클 업데이트
        const randomPhaseX = randomFactors[i3 + 0];
        const randomPhaseY = randomFactors[i3 + 1];
        const lifetimeSpeedFactor = randomFactors[i3 + 2];

        // Lifetime 업데이트
        const safeDelta = Math.min(delta, 0.05);
        const lifetimeIncrement = safeDelta * 0.05 * speedMult * lifetimeSpeedFactor;
        lifetimes[i] += lifetimeIncrement;

        if (lifetimes[i] >= 1.0) { // 수명 종료
          activeState[i] = 0;
          colors[i4 + 3] = 0;
          positions[i3 + 2] = Infinity;
          continue;
        }

        const currentLifetime = lifetimes[i];

        // 비대칭적 위치 및 거리 계산
        let currentZ: number;
        let distanceFromCenter: number;
        let phase: number;
        const isEntry = currentLifetime < 0.5;

        if (isEntry) {
          phase = currentLifetime * 2;
          currentZ = THREE.MathUtils.lerp(-ENTRY_LENGTH, 0, phase);
          distanceFromCenter = ENTRY_LENGTH * (1 - phase);
        } else {
          phase = (currentLifetime - 0.5) * 2;
          currentZ = THREE.MathUtils.lerp(0, EXIT_LENGTH, phase);
          distanceFromCenter = EXIT_LENGTH * phase;
        }

        // --- 수정: 최소 반경 추가 ---
        const coneRadius = distanceFromCenter * tanAngle; // 원뿔 형태의 반경
        const baseSpreadRadius = MIN_RADIUS + coneRadius; // 최소 반경을 더해줌
        // --- 수정 끝 ---

        // X, Y 위치 계산 (baseSpreadRadius 사용)
        const initVelX = initVelocities[i3];
        const initVelY = initVelocities[i3 + 1];
        const initialAngleXY = Math.atan2(initVelY, initVelX);
        let currentX = Math.cos(initialAngleXY) * baseSpreadRadius;
        let currentY = Math.sin(initialAngleXY) * baseSpreadRadius;

        // 흔들림 추가
        const wobbleFrequency = time * 1;
        const maxLenForWobble = isEntry ? ENTRY_LENGTH : EXIT_LENGTH;
        const wobbleStrengthFactor = Math.pow(distanceFromCenter / (maxLenForWobble + 1e-6), 0.5);
        const wobbleAmplitude = baseSpreadRadius * 0.2 * wobbleStrengthFactor; // 흔들림 폭도 baseSpreadRadius 기반
        currentX += Math.sin(wobbleFrequency + randomPhaseX) * wobbleAmplitude;
        currentY += Math.cos(wobbleFrequency + randomPhaseY) * wobbleAmplitude;

        positions[i3 + 0] = currentX;
        positions[i3 + 1] = currentY;
        positions[i3 + 2] = currentZ;

        // 색상 계산
        let r, g, b;
        if (isEntry) {
          r = THREE.MathUtils.lerp(baseColor.r, midColor.r, phase);
          g = THREE.MathUtils.lerp(baseColor.g, midColor.g, phase);
          b = THREE.MathUtils.lerp(baseColor.b, midColor.b, phase);
        } else {
          r = THREE.MathUtils.lerp(midColor.r, endColor.r, phase);
          g = THREE.MathUtils.lerp(midColor.g, endColor.g, phase);
          b = THREE.MathUtils.lerp(midColor.b, endColor.b, phase);
        }
        colors[i4 + 0] = r;
        colors[i4 + 1] = g;
        colors[i4 + 2] = b;

        // 알파 계산 (Fade in/out)
        let alpha = 1.0;
        if (currentLifetime < FADE_IN_DURATION) {
          alpha = currentLifetime / FADE_IN_DURATION;
        } else if (currentLifetime > 1.0 - FADE_OUT_DURATION) {
          alpha = (1.0 - currentLifetime) / FADE_OUT_DURATION;
        }
        colors[i4 + 3] = THREE.MathUtils.clamp(alpha, 0, 1);

      } else if (activeState[i] === 0 && spawnedCount < numToSpawnInt) { // 비활성 -> 활성 (생성)
        activeState[i] = 1;
        lifetimes[i] = 0;
        spawnedCount++;

        // 초기 위치 설정
        const initVelX = initVelocities[i3];
        const initVelY = initVelocities[i3 + 1];
        // --- 수정: 초기 XY 위치도 MIN_RADIUS 고려 ---
        // 초기 distanceFromCenter는 ENTRY_LENGTH, coneRadius는 ENTRY_LENGTH * tanAngle
        // 초기 baseSpreadRadius는 MIN_RADIUS + ENTRY_LENGTH * tanAngle
        const initialSpreadRadius = MIN_RADIUS + ENTRY_LENGTH * tanAngle; // 여기서도 최소 반경 반영
        const initialAngleXY = Math.atan2(initVelY, initVelX);
        positions[i3 + 0] = Math.cos(initialAngleXY) * initialSpreadRadius * (0.1 + Math.random() * 0.9); // 랜덤하게 초기 반경 내 분포
        positions[i3 + 1] = Math.sin(initialAngleXY) * initialSpreadRadius * (0.1 + Math.random() * 0.9);
        positions[i3 + 2] = -ENTRY_LENGTH;
        // --- 수정 끝 ---

        // 초기 색상/알파
        colors[i4 + 0] = baseColor.r;
        colors[i4 + 1] = baseColor.g;
        colors[i4 + 2] = baseColor.b;
        colors[i4 + 3] = 0;
      }
    } // End of particle loop

    // 속성 업데이트 플래그 설정
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
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
      camera={{ position: [5, -2, -5], fov: 90 }}
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
