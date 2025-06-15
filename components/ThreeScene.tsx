'use client';

import { useRef, useCallback, useEffect, useMemo, useState, memo } from 'react'; // memo import 추가
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { shaderMaterial } from '@react-three/drei'; // shaderMaterial import 추가


interface ThreeSceneProps {
  volume: number;
}

interface WireframeGlobeProps {
  volume: number;
  brightness?: number;
}

interface NeuralGlobeProps {
  volume: number;
}
interface Connection {
  startIdx: number;
  endIdx: number;
  progress: number;
  speed: number;
  active: boolean;
  createdAt: number;
}

// PacManProps 인터페이스 추가
interface PacManProps {
    volume: number;
}

interface QuasarJetProps {
  volume: number;
  // onParticleDeath 제거 (사용되지 않음)
}

// --- 상수 추가 ---
const DAMPING_FACTOR = 0.95; // 감쇠 계수 (값이 1에 가까울수록 천천히 멈춤)
const MIN_VELOCITY = 0.0001; // 감쇠를 멈출 최소 속도 임계값
const MIN_ZOOM_RADIUS = 2; // 최소 줌 거리
const MAX_ZOOM_RADIUS = 20; // 최대 줌 거리
const PINCH_SENSITIVITY = 1.0; // 핀치 감도 조절 (필요에 따라 조절)
// --- 상수 추가 끝 ---

const getDistance = (p1: Touch, p2: Touch): number => {
  const dx = p1.clientX - p2.clientX;
  const dy = p1.clientY - p2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

// 모바일 감지 훅 추가
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['iphone', 'android', 'mobile', 'ios'];
      return mobileKeywords.some(keyword => userAgent.includes(keyword));
    };
    
    setIsMobile(checkMobile());
  }, []);
  
  return isMobile;
};

// 드래그 컨트롤 구현
const CameraControls = memo(() => {
  const { camera, gl } = useThree();
  const isDraggingRef = useRef(false);
  const previousPositionRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0, y: 0 });
  const radiusRef = useRef(7); // 초기 카메라 거리

  const velocityRef = useRef({ x: 0, y: 0 });
  const isDampingRef = useRef(false);

  // --- 핀치 줌 관련 Ref 추가 ---
  const isPinchingRef = useRef(false);
  const initialPinchDistanceRef = useRef(0);
  const initialRadiusOnPinchRef = useRef(radiusRef.current); // 핀치 시작 시점의 반경 저장
  // --- 핀치 줌 관련 Ref 추가 끝 ---


  const updateCameraPosition = useCallback(() => {
    // --- 줌 제한 적용 ---
    radiusRef.current = Math.max(
        MIN_ZOOM_RADIUS,
        Math.min(MAX_ZOOM_RADIUS, radiusRef.current)
    );
    // --- 줌 제한 적용 끝 ---

    const radius = radiusRef.current;
    const phi = rotationRef.current.x;
    const theta = rotationRef.current.y;

    rotationRef.current.x = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, phi)
    );

    camera.position.x = radius * Math.cos(rotationRef.current.x) * Math.sin(theta);
    camera.position.y = radius * Math.sin(rotationRef.current.x);
    camera.position.z = radius * Math.cos(rotationRef.current.x) * Math.cos(theta);
    camera.lookAt(0, 0, 0);
  }, [camera]); // MIN_ZOOM_RADIUS, MAX_ZOOM_RADIUS는 상수이므로 의존성 배열에 불필요

  useEffect(() => {
      const initialPos = camera.position;
      // 초기 radiusRef 값 설정 시에도 제한 적용
      radiusRef.current = Math.max(
          MIN_ZOOM_RADIUS,
          Math.min(MAX_ZOOM_RADIUS, initialPos.length())
      );
      const initialPhi = Math.asin(initialPos.y / radiusRef.current);
      rotationRef.current.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, initialPhi));
      rotationRef.current.y = Math.atan2(initialPos.x, initialPos.z);
      updateCameraPosition();
  }, [camera, updateCameraPosition]); // updateCameraPosition 의존성 추가

  // --- 핸들러 수정: 드래그/핀치 상태 관리 ---
  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    isPinchingRef.current = false; // 드래그 시작 시 핀치 중지
    isDampingRef.current = false;
    velocityRef.current = { x: 0, y: 0 };
    previousPositionRef.current = { x: clientX, y: clientY };
    gl.domElement.style.cursor = 'grabbing';
  }, [gl.domElement.style]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return; // 드래그 중이 아니면 이동 처리 안 함

    const deltaX = clientX - previousPositionRef.current.x;
    const deltaY = clientY - previousPositionRef.current.y;

    const deltaRotY = deltaX * 0.005;
    const deltaRotX = deltaY * 0.005;

    rotationRef.current.y += deltaRotY;
    rotationRef.current.x += deltaRotX;

    velocityRef.current.y = deltaRotY;
    velocityRef.current.x = deltaRotX;

    updateCameraPosition();

    previousPositionRef.current = { x: clientX, y: clientY };
  }, [updateCameraPosition]);

  const handlePointerUp = useCallback(() => {
    if (isDraggingRef.current) {
        isDraggingRef.current = false;
        gl.domElement.style.cursor = 'grab';

        const speed = Math.abs(velocityRef.current.x) + Math.abs(velocityRef.current.y);
        if (speed > MIN_VELOCITY) {
            isDampingRef.current = true;
        } else {
            velocityRef.current = { x: 0, y: 0 };
            isDampingRef.current = false;
        }
    }
    // 핀치 상태도 여기서 초기화할 수 있지만, touchend에서 처리하는 것이 더 명확
    // isPinchingRef.current = false;
  }, [gl.domElement.style]);

  // --- 핀치 처리 로직 추가 ---
  const handlePinchMove = useCallback((touches: TouchList) => {
    if (touches.length !== 2) return; // 반드시 두 개의 터치 포인트

    const currentDistance = getDistance(touches[0], touches[1]);
    const initialDistance = initialPinchDistanceRef.current;

    if (initialDistance > 0) { // 초기 거리가 설정된 경우에만 계산
        const scale = initialDistance / currentDistance; // 거리가 가까워지면 scale > 1 (줌 인)
        const newRadius = initialRadiusOnPinchRef.current * scale * PINCH_SENSITIVITY;

        // 새로운 반경 업데이트 (updateCameraPosition 내에서 제한 적용됨)
        radiusRef.current = newRadius;
        updateCameraPosition(); // 카메라 위치 즉시 업데이트
    }
  }, [updateCameraPosition]);

  // --- 감쇠 처리 로직 (기존과 동일) ---
  useFrame(() => {
    if (isDampingRef.current) {
      rotationRef.current.y += velocityRef.current.y;
      rotationRef.current.x += velocityRef.current.x;

      velocityRef.current.y *= DAMPING_FACTOR;
      velocityRef.current.x *= DAMPING_FACTOR;

      updateCameraPosition();

      const speed = Math.abs(velocityRef.current.x) + Math.abs(velocityRef.current.y);
      if (speed < MIN_VELOCITY) {
        isDampingRef.current = false;
        velocityRef.current = { x: 0, y: 0 };
      }
    }
  });

  // --- 이벤트 리스너 useEffect 수정 ---
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.cursor = 'grab';

    // --- 마우스 이벤트 ---
    const handleMouseDown = (e: MouseEvent) => handlePointerDown(e.clientX, e.clientY);
    const handleMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const handleMouseUp = () => handlePointerUp(); // handlePointerUp은 마우스 전용으로 유지

    // --- 터치 이벤트 ---
    const handleTouchStart = (e: TouchEvent) => {
      // e.preventDefault(); // 스크롤 방지 필요 시 활성화. 단, passive:false 필요
      if (e.touches.length === 1) {
          // 싱글 터치: 드래그 시작
          isPinchingRef.current = false; // 핀치 모드 해제
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
          // 더블 터치: 핀치 시작
          isDraggingRef.current = false; // 드래그 모드 해제
          isDampingRef.current = false; // 감쇠 중지
          isPinchingRef.current = true;
          initialPinchDistanceRef.current = getDistance(e.touches[0], e.touches[1]);
          initialRadiusOnPinchRef.current = radiusRef.current; // 현재 반경 저장
          gl.domElement.style.cursor = 'grabbing'; // 커서 변경 (선택 사항)
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current && e.touches.length === 1) {
           // 싱글 터치 드래그 중 이동
           e.preventDefault(); // 드래그 중 스크롤 방지
           handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (isPinchingRef.current && e.touches.length === 2) {
           // 핀치 중 이동
           e.preventDefault(); // 핀치 중 스크롤 방지
           handlePinchMove(e.touches);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (isDraggingRef.current) {
            // 드래그 중 손가락 뗌
            handlePointerUp(); // 드래그 종료 및 감쇠 시작 로직 호출
        }
        if (isPinchingRef.current) {
            // 핀치 중 손가락 뗌
             isPinchingRef.current = false;
             initialPinchDistanceRef.current = 0;
             gl.domElement.style.cursor = 'grab'; // 커서 복원

             // 만약 손가락 하나가 남았다면 드래그 모드로 전환할 수도 있음 (선택적 구현)
             if (e.touches.length === 1) {
                 // handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
             }
        }

        // 모든 손가락이 떨어졌을 때 커서 기본값으로
        if (e.touches.length === 0) {
            gl.domElement.style.cursor = 'grab';
            isDraggingRef.current = false; // 안전하게 상태 초기화
            isPinchingRef.current = false;
            // 감쇠는 handlePointerUp에서 관리하므로 여기서는 isDampingRef 건드리지 않음
        }
    };

    // 마우스 리스너 등록
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove); // window에 등록해야 캔버스 벗어나도 동작
    window.addEventListener('mouseup', handleMouseUp); // window에 등록해야 캔버스 벗어나도 동작

    // 터치 리스너 등록 (passive: false로 설정하여 preventDefault 사용 가능하도록 함)
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false }); // window에 등록해야 함
    window.addEventListener('touchend', handleTouchEnd);     // window에 등록해야 함
    window.addEventListener('touchcancel', handleTouchEnd); // 취소 시에도 종료 처리


    return () => {
      // 마우스 리스너 제거
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // 터치 리스너 제거
      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      canvas.style.cursor = 'default'; // 기본 커서로 복원
    };
    // 의존성 배열에 새로 추가된 핸들러 추가
  }, [gl, handlePointerDown, handlePointerMove, handlePointerUp, handlePinchMove]);

  return null;
});
CameraControls.displayName = 'CameraControls'; // 디버깅을 위한 displayName 추가


// 배경 별 생성
const StarField = memo(() => {
  const starsRef = useRef<THREE.Points>(null);
  
  // 모바일에서 별 개수 감소
  const starCount = useMemo(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = ['iphone', 'android', 'mobile'].some(keyword => userAgent.includes(keyword));
    return isMobile ? 500 : 1000; // 모바일: 500개, 데스크톱: 1000개
  }, []);

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
});
StarField.displayName = 'StarField';


// Wireframe Globe 컴포넌트
const WireframeGlobe = memo(({ volume }: WireframeGlobeProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const wireframeParticlesRef = useRef<THREE.Points>(null);
  const vertexParticlesRef = useRef<THREE.Points>(null);
  
  const [hue, setHue] = useState(0.6);
  const [smoothVolumeIntensity, setSmoothVolumeIntensity] = useState(0);

  useEffect(() => {
    const colorInterval = setInterval(() => {
      setHue((prev) => (prev + 0.001) % 1);
    }, 50);
    return () => clearInterval(colorInterval);
  }, []);

  // 구체 지오메트리 생성
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(1, 16, 8);
  }, []);

  // 와이어프레임 엣지를 따라 파티클 생성
  const { wireframeParticleGeometry, wireframeParticleMaterial } = useMemo(() => {
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireframePositions = wireframeGeometry.attributes.position.array as Float32Array;
    
    // 엣지를 따라 파티클 생성 (각 엣지당 여러 개의 파티클)
    const particlesPerEdge = 8; // 각 엣지당 파티클 수
    const totalEdges = wireframePositions.length / 6; // 각 엣지는 2개의 점(6개 좌표)
    const totalParticles = totalEdges * particlesPerEdge;
    
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);
    const flickerStates = new Float32Array(totalParticles); // 반짝임 상태
    const flickerSpeeds = new Float32Array(totalParticles); // 각 파티클의 반짝임 속도

    let particleIndex = 0;
    
    // 각 엣지를 따라 파티클 분산 배치
    for (let i = 0; i < totalEdges; i++) {
      const startX = wireframePositions[i * 6];
      const startY = wireframePositions[i * 6 + 1];
      const startZ = wireframePositions[i * 6 + 2];
      const endX = wireframePositions[i * 6 + 3];
      const endY = wireframePositions[i * 6 + 4];
      const endZ = wireframePositions[i * 6 + 5];
      
      const startPoint = new THREE.Vector3(startX, startY, startZ);
      const endPoint = new THREE.Vector3(endX, endY, endZ);
      
      // 엣지를 따라 파티클 배치
      for (let j = 0; j < particlesPerEdge; j++) {
        const t = j / (particlesPerEdge - 1); // 0부터 1까지
        const particlePos = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
        
        // 약간의 랜덤 오프셋 추가 (가루 효과)
        const offset = 0.02;
        particlePos.x += (Math.random() - 0.5) * offset;
        particlePos.y += (Math.random() - 0.5) * offset;
        particlePos.z += (Math.random() - 0.5) * offset;
        
        positions[particleIndex * 3] = particlePos.x;
        positions[particleIndex * 3 + 1] = particlePos.y;
        positions[particleIndex * 3 + 2] = particlePos.z;
        
        // 랜덤 색상
        const hue = Math.random() * 0.3 + 0.5; // 0.5-0.8 범위 (청록-파랑)
        const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
        colors[particleIndex * 3] = color.r;
        colors[particleIndex * 3 + 1] = color.g;
        colors[particleIndex * 3 + 2] = color.b;
        
        // 랜덤 크기
        sizes[particleIndex] = Math.random() * 0.015 + 0.005;
        
        // 반짝임 초기 상태
        flickerStates[particleIndex] = Math.random();
        flickerSpeeds[particleIndex] = Math.random() * 0.05 + 0.02; // 0.02-0.07 범위
        
        particleIndex++;
      }
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeo.setAttribute('flickerState', new THREE.BufferAttribute(flickerStates, 1));
    particleGeo.setAttribute('flickerSpeed', new THREE.BufferAttribute(flickerSpeeds, 1));

    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uVolumeIntensity: { value: 0.0 },
        uHue: { value: 0.6 }
      },
      vertexShader: `
        attribute float size;
        attribute float flickerState;
        attribute float flickerSpeed;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uVolumeIntensity;
        uniform float uHue;
        
        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          
          // 개별 파티클 반짝임 계산
          float flickerPhase = flickerState * 6.28318; // 2π
          float flicker = sin(uTime * flickerSpeed * 10.0 + flickerPhase);
          
          // 볼륨에 따른 전체적인 활성화
          float volumeBoost = 1.0 + uVolumeIntensity * 2.0;
          float finalFlicker = (flicker * 0.5 + 0.5) * volumeBoost;
          
          // 임계값을 통한 on/off 효과
          float threshold = 0.3 + uVolumeIntensity * 0.4;
          vAlpha = step(threshold, finalFlicker);
          
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectionPosition = projectionMatrix * viewPosition;
          
          gl_Position = projectionPosition;
          
          // 반짝일 때만 크기 증가
          float activeSize = vAlpha > 0.5 ? size * (1.5 + finalFlicker * 0.5) : size * 0.1;
          gl_PointSize = activeSize * (400.0 / -viewPosition.z);
          
          // 색상 계산 (반짝일 때 더 밝게)
          vec3 baseColor = color;
          if (vAlpha > 0.5) {
            baseColor = vec3(
              sin(uHue * 6.28318) * 0.5 + 0.5,
              sin((uHue + 0.33) * 6.28318) * 0.5 + 0.5,
              sin((uHue + 0.66) * 6.28318) * 0.5 + 0.5
            );
            baseColor *= (3.0 + finalFlicker * 4.0); // 블룸을 위해 밝게
          }
          
          vColor = baseColor;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          if (vAlpha < 0.5) discard; // 꺼진 파티클은 렌더링하지 않음
          
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;
          
          float alpha = (1.0 - distance * 2.0) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });

    return { wireframeParticleGeometry: particleGeo, wireframeParticleMaterial: particleMat };
  }, [geometry]);

  // 꼭지점 파티클 (기존 유지)
  const { vertexParticleGeometry, vertexParticleMaterial } = useMemo(() => {
    const positions = geometry.attributes.position;
    const vertices: THREE.Vector3[] = [];
    
    for (let i = 0; i < positions.count; i++) {
      const vertex = new THREE.Vector3();
      vertex.fromBufferAttribute(positions, i);
      vertices.push(vertex);
    }

    const particlePositions = new Float32Array(vertices.length * 3);
    const particleColors = new Float32Array(vertices.length * 3);
    const particleSizes = new Float32Array(vertices.length);

    vertices.forEach((vertex, index) => {
      particlePositions[index * 3] = vertex.x;
      particlePositions[index * 3 + 1] = vertex.y;
      particlePositions[index * 3 + 2] = vertex.z;
      
      const color = new THREE.Color().setHSL(0.6, 0.8, 0.6);
      particleColors[index * 3] = color.r;
      particleColors[index * 3 + 1] = color.g;
      particleColors[index * 3 + 2] = color.b;
      
      particleSizes[index] = 0.03;
    });

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    const particleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uVolumeIntensity: { value: 0.0 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float uTime;
        uniform float uVolumeIntensity;
        
        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          
          float pulse = sin(uTime * 3.0 + modelPosition.x * 10.0) * 0.5 + 0.5;
          
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectionPosition = projectionMatrix * viewPosition;
          
          gl_Position = projectionPosition;
          gl_PointSize = size * (500.0 / -viewPosition.z) * (1.0 + pulse * 0.5) * (1.0 + uVolumeIntensity);
          
          vColor = color * (4.0 + uVolumeIntensity * 6.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          float distance = length(gl_PointCoord - vec2(0.5));
          if (distance > 0.5) discard;
          
          float alpha = 1.0 - distance * 2.0;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    });

    return { vertexParticleGeometry: particleGeo, vertexParticleMaterial: particleMat };
  }, [geometry]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const time = clock.getElapsedTime();
    
    const targetVolumeIntensity = THREE.MathUtils.lerp(0, 0.7, Math.min(1, volume / 100));
    const newSmoothIntensity = THREE.MathUtils.lerp(smoothVolumeIntensity, targetVolumeIntensity, 0.05);
    setSmoothVolumeIntensity(newSmoothIntensity);

    // 기본 회전 및 스케일링
    groupRef.current.rotation.y += 0.002;
    groupRef.current.rotation.x = Math.sin(time * 0.1) * 0.1;

    const baseScale = 2;
    const volumeScale = 1 + newSmoothIntensity * 0.3;
    const pulseScale = 1 + Math.sin(time * 2) * 0.05 * newSmoothIntensity;
    const finalScale = baseScale * volumeScale * pulseScale;
    groupRef.current.scale.set(finalScale, finalScale, finalScale);

    // 와이어프레임 파티클 애니메이션 업데이트
    if (wireframeParticlesRef.current && wireframeParticlesRef.current.material instanceof THREE.ShaderMaterial) {
      wireframeParticlesRef.current.material.uniforms.uTime.value = time;
      wireframeParticlesRef.current.material.uniforms.uVolumeIntensity.value = newSmoothIntensity;
      wireframeParticlesRef.current.material.uniforms.uHue.value = (hue + time * 0.05) % 1;
    }

    // 꼭지점 파티클 애니메이션 업데이트
    if (vertexParticlesRef.current && vertexParticlesRef.current.material instanceof THREE.ShaderMaterial) {
      vertexParticlesRef.current.material.uniforms.uTime.value = time;
      vertexParticlesRef.current.material.uniforms.uVolumeIntensity.value = newSmoothIntensity;
    }

    // 볼륨에 따른 기하학적 왜곡 (파티클에는 적용하지 않음)
    if (volume > 50 && geometry) {
      const positions = geometry.attributes.position;
      const vertex = new THREE.Vector3();

      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);
        vertex.normalize();
        const noise = Math.sin(time * 2 + vertex.x * 5) * 0.02 * newSmoothIntensity;
        vertex.multiplyScalar(1 + noise);
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* 와이어프레임 파티클 (메인 효과) */}
        <points 
          ref={wireframeParticlesRef} 
          geometry={wireframeParticleGeometry} 
          material={wireframeParticleMaterial} 
        />
        
        {/* 꼭지점 파티클 (보조 효과) */}
        <points 
          ref={vertexParticlesRef} 
          geometry={vertexParticleGeometry} 
          material={vertexParticleMaterial} 
        />
      </group>
      
      {/* 블룸 후처리 효과 */}
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.05}
          luminanceSmoothing={0.3}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
});

WireframeGlobe.displayName = 'WireframeGlobe';

const ParticleEffect = memo(({ volume }: { volume: number }) => { // React.memo 적용
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
});
ParticleEffect.displayName = 'ParticleEffect'; // 디버깅을 위한 displayName 추가


// 모바일 기기 감지를 통한 동적 상수 조절
const getOptimizedConstants = () => {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  const isMobile = ['iphone', 'android', 'mobile'].some(keyword => userAgent.includes(keyword));

  return {
    MAX_PARTICLES: isMobile ? 2000 : 4000,
    BASE_SPAWN_RATE: isMobile ? 1000 : 2000,
    FADE_IN_DURATION: 0.5,
    FADE_OUT_DURATION: 1.0,
    MAX_PARTICLE_SIZE: 0.015,
    LIFETIME_ACCELERATION_FACTOR: 10,
    LIFETIME_ACCELERATION_POWER: 2,
    MAX_EFFECTIVE_LIFETIME: 3.0, // 수명을 약간 줄여 전체적인 템포를 빠르게 조절
    PARTICLE_ROTATION_SPEED: 0.1,
  };
};

// Easing 함수
const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
};

// 부드러운 가장자리를 가진 원형 텍스처 생성 함수
const createCircleTexture = (size: number, color: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error("Canvas 2D 컨텍스트를 생성할 수 없습니다.");
  }

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2;

  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  const baseColor = color.slice(0, 7);
  gradient.addColorStop(0, `${baseColor}FF`);
  gradient.addColorStop(0.5, `${baseColor}CC`);
  gradient.addColorStop(1, `${baseColor}00`);

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};


// --- QuasarJet 컴포넌트 ---

const QuasarJet = memo(({ volume }: QuasarJetProps) => {
  const constants = useMemo(() => getOptimizedConstants(), []);
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const { camera } = useThree();

  const particleAttributes = useMemo(() => {
    const positions = new Float32Array(constants.MAX_PARTICLES * 3);
    const colors = new Float32Array(constants.MAX_PARTICLES * 4);
    const lifetimes = new Float32Array(constants.MAX_PARTICLES);
    const activeState = new Float32Array(constants.MAX_PARTICLES);
    const initDirections = new Float32Array(constants.MAX_PARTICLES * 2);
    const randomFactors = new Float32Array(constants.MAX_PARTICLES * 4);
    const sizes = new Float32Array(constants.MAX_PARTICLES);
    const rotationSpeeds = new Float32Array(constants.MAX_PARTICLES);
    const startPositions = new Float32Array(constants.MAX_PARTICLES * 3);

    for (let i = 0; i < constants.MAX_PARTICLES; i++) {
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
      randomFactors[i3 + 2] = 0.6 + Math.random() * 0.8;
      randomFactors[i3 + 3] = Math.random();
      sizes[i] = 1.0;
      rotationSpeeds[i] = (Math.random() - 0.5) * constants.PARTICLE_ROTATION_SPEED * 2;
      startPositions.fill(0, i3, i3 + 3);
    }
    return { positions, colors, lifetimes, activeState, initDirections, randomFactors, sizes, rotationSpeeds, startPositions };
  }, [constants.MAX_PARTICLES, constants.PARTICLE_ROTATION_SPEED]);
  
  const circleTexture = useMemo(() => {
    try {
      return createCircleTexture(64, '#FFFFFF');
    } catch (error) {
      console.error("원형 텍스처 생성 실패:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry || !particleAttributes) return;
    geometry.setAttribute('position', new THREE.BufferAttribute(particleAttributes.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(particleAttributes.colors, 4));
    geometry.setAttribute('size', new THREE.BufferAttribute(particleAttributes.sizes, 1));
    geometry.setDrawRange(0, constants.MAX_PARTICLES);
    geometry.boundingSphere = null;
    geometry.boundingBox = null;
  }, [particleAttributes, constants.MAX_PARTICLES]);
  
  const material = useMemo(() => new THREE.PointsMaterial({
    size: constants.MAX_PARTICLE_SIZE * 2,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    map: circleTexture,
  }), [circleTexture, constants.MAX_PARTICLE_SIZE]);

  const spawnCounter = useRef(0);

  const calculateRadius = useCallback((progress: number): number => {
    const startRadius = 2.5;
    const endRadius = 0.1;
    const t = 1 - progress;
    return endRadius + (startRadius - endRadius) * Math.pow(t, 1.5);
  }, []);

  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame(({ clock }, delta) => {
    const geometry = geometryRef.current;
    if (!geometry || !circleTexture || !material || !particleAttributes) return;

    const positions = geometry.attributes.position.array as Float32Array;
    const colors = geometry.attributes.color.array as Float32Array;
    const sizes = geometry.attributes.size.array as Float32Array;
    const { lifetimes, activeState, initDirections, randomFactors, rotationSpeeds, startPositions } = particleAttributes;

    const time = clock.elapsedTime;
    const normalizedVolume = (volume >= 20) ? Math.min(1, Math.max(0, volume) / 100) : 0;
    const targetSpawnRate = constants.BASE_SPAWN_RATE * normalizedVolume * 2;
    const numToSpawnFloat = targetSpawnRate * delta + spawnCounter.current;
    const numToSpawnInt = Math.floor(numToSpawnFloat);
    spawnCounter.current = numToSpawnFloat - numToSpawnInt;
    let spawnedCount = 0;

    const safeDelta = Math.min(delta, 0.05);
    
    // ✨ 1. 파티클 기본 속도 증가
    // 이 값을 조절하여 전체적인 흡입 속도를 제어할 수 있습니다.
    const baseSpeed = 0.3; // (기존 0.05 * 3.5 = 0.175)

    for (let i = 0; i < constants.MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const i4 = i * 4;
      const i2 = i * 2;

      if (activeState[i] === 1) {
        const currentLifetime = lifetimes[i];
        const baseLifetimeSpeedFactor = randomFactors[i3 + 2];
        const lifetimeProgress = Math.min(1, currentLifetime / constants.MAX_EFFECTIVE_LIFETIME);
        const accelerationMultiplier = 1.0 + constants.LIFETIME_ACCELERATION_FACTOR * Math.pow(lifetimeProgress, constants.LIFETIME_ACCELERATION_POWER);
        
        // ✨ 2. 최종 속도 계산
        const currentSpeedFactor = baseSpeed * baseLifetimeSpeedFactor * accelerationMultiplier;
        
        // 파티클의 수명(진행도)을 업데이트합니다.
        lifetimes[i] += safeDelta * currentSpeedFactor;

        if (lifetimes[i] >= constants.MAX_EFFECTIVE_LIFETIME) {
          activeState[i] = 0;
          colors[i4 + 3] = 0;
          positions[i3 + 2] = Infinity;
          continue;
        }

        const normalizedLifetime = Math.min(1.0, lifetimes[i] / constants.MAX_EFFECTIVE_LIFETIME);
        const easedLifetime = easeInOutQuad(normalizedLifetime);

        const startX = startPositions[i3];
        const startY = startPositions[i3 + 1];
        const startZ = startPositions[i3 + 2];

        // ... (나머지 로직은 동일)
        let currentX = THREE.MathUtils.lerp(startX, 0, easedLifetime);
        let currentY = THREE.MathUtils.lerp(startY, 0, easedLifetime);
        let currentZ = THREE.MathUtils.lerp(startZ, 0, easedLifetime);

        const currentRadius = calculateRadius(easedLifetime) * 0.3;
        const spiralAngle = easedLifetime * Math.PI * 6 + rotationSpeeds[i] * time * 2;
        const spiralOffsetX = Math.cos(spiralAngle) * currentRadius;
        const spiralOffsetY = Math.sin(spiralAngle) * currentRadius;

        currentX += spiralOffsetX * initDirections[i2];
        currentY += spiralOffsetY * initDirections[i2 + 1];

        positions[i3] = currentX;
        positions[i3 + 1] = currentY;
        positions[i3 + 2] = currentZ;
        
        const hueOffset = randomFactors[i3 + 3] * 2;
        const timeHue = (time * 0.1 + i * 0.01) % 1;
        const rainbowHue = (easedLifetime + timeHue + hueOffset) % 1;
        
        tempColor.setHSL(rainbowHue, 0.9, 0.6);

        colors[i4] = tempColor.r;
        colors[i4 + 1] = tempColor.g;
        colors[i4 + 2] = tempColor.b;

        let alpha = 1.0;
        const currentAbsoluteLifetime = lifetimes[i];
        if (currentAbsoluteLifetime < constants.FADE_IN_DURATION) {
          alpha = currentAbsoluteLifetime / constants.FADE_IN_DURATION;
        } else if (currentAbsoluteLifetime > constants.MAX_EFFECTIVE_LIFETIME - constants.FADE_OUT_DURATION) {
          alpha = (constants.MAX_EFFECTIVE_LIFETIME - currentAbsoluteLifetime) / constants.FADE_OUT_DURATION;
        }
        colors[i4 + 3] = THREE.MathUtils.clamp(alpha, 0, 1);

        const sizeMultiplier = 1 + Math.sin(easedLifetime * Math.PI) * 2;
        sizes[i] = THREE.MathUtils.lerp(0.3, 1.0, sizeMultiplier / 3);

      } else if (spawnedCount < numToSpawnInt) {
        // ... (파티클 생성 로직 동일)
        activeState[i] = 1;
        lifetimes[i] = 0;
        spawnedCount++;

         // 1. 카메라의 방향과 위치 정보 가져오기
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        const spawnDistance = 0.0; 
        const spawnCenter = camera.position.clone().sub(cameraDirection.multiplyScalar(spawnDistance));

        // 2. 카메라의 '오른쪽'과 '위쪽' 방향 벡터 가져오기
        const cameraRight = new THREE.Vector3();
        cameraRight.setFromMatrixColumn(camera.matrixWorld, 0); // Right vector
        
        const cameraUp = new THREE.Vector3();
        cameraUp.setFromMatrixColumn(camera.matrixWorld, 1); // Up vector

        // 3. 원형 오프셋 계산
        const startRadius = calculateRadius(0); // 시작 반경 (넓음)
        const angle = Math.random() * Math.PI * 2;
        const radiusOffset = Math.random() * startRadius;
        
        const offsetX = Math.cos(angle) * radiusOffset;
        const offsetY = Math.sin(angle) * radiusOffset;

        // 4. 카메라의 '오른쪽'과 '위쪽' 방향으로 오프셋 적용
        const finalSpawnPosition = spawnCenter
            .add(cameraRight.multiplyScalar(offsetX))
            .add(cameraUp.multiplyScalar(offsetY));
        
        // Z축으로 약간의 랜덤성을 주어 입체감 추가
        finalSpawnPosition.add(cameraDirection.multiplyScalar((Math.random() - 0.5) * 0.5));

        // 시작 위치 저장
        startPositions[i3] = finalSpawnPosition.x;
        startPositions[i3 + 1] = finalSpawnPosition.y;
        startPositions[i3 + 2] = finalSpawnPosition.z;

        // 초기 위치 설정
        positions[i3] = startPositions[i3];
        positions[i3 + 1] = startPositions[i3 + 1];
        positions[i3 + 2] = startPositions[i3 + 2];

        const initialHue = Math.random();
        tempColor.setHSL(initialHue, 0.9, 0.6);
        colors.set([tempColor.r, tempColor.g, tempColor.b, 0], i4);
        sizes[i] = 0.3;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} material={material}>
      <bufferGeometry ref={geometryRef} />
    </points>
  );
});

QuasarJet.displayName = 'QuasarJet';


// 발광 효과를 위한 후처리 (블룸 대체)
const GlowEffect = memo(() => { // React.memo 적용
  const { gl } = useThree();

  useEffect(() => {
    // 기존 렌더러의 설정을 강화
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.5;
    gl.outputEncoding = THREE.sRGBEncoding;

    // 후처리 효과를 사용하려면 postprocessing 라이브러리 필요
    // 현재는 기본 설정 강화로 대체

    // 저장된 원래 값으로 되돌리기 위한 클린업 함수
    const originalToneMapping = gl.toneMapping;
    const originalToneMappingExposure = gl.toneMappingExposure;
    const originalOutputEncoding = gl.outputEncoding;


    return () => {
        // 컴포넌트 언마운트 시 원래 값으로 복원
        gl.toneMapping = originalToneMapping;
        gl.toneMappingExposure = originalToneMappingExposure;
        gl.outputEncoding = originalOutputEncoding;

    };
  }, [gl]);

  return null;
});
GlowEffect.displayName = 'GlowEffect'; // 디버깅을 위한 displayName 추가

const ThreeScene = ({ volume }: ThreeSceneProps) => {
  const isMobile = useIsMobile();
  
  // 모바일 최적화된 설정
  const mobileSettings = {
    antialias: false, // 모바일에서는 안티앨리어싱 비활성화
    alpha: true,
    powerPreference: 'high-performance' as const,
    stencil: false,
    depth: true,
  };

  const desktopSettings = {
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance' as const,
  };

  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      camera={{ position: [-0.7, 0.5, -4], fov: isMobile ? 120 : 110 }}
      gl={isMobile ? mobileSettings : desktopSettings}
      dpr={isMobile ? [1, 2] : undefined} // 모바일 픽셀 밀도 최적화
      performance={{ min: 0.5 }} // 성능 임계값 설정
    >
      {/* 렌더링 품질 향상 */}
      <GlowEffect />

      {/* 카메라 드래그 컨트롤 */}
      <CameraControls />

      {/* 배경 별 */}
      <StarField />

      {/* Wireframe Globe */}
      <WireframeGlobe volume={volume} />

      <QuasarJet volume={volume} />

      {/* 파티클 효과 */}
      <ParticleEffect volume={volume} />

      {/* 조명 */}
      <ambientLight intensity={isMobile ? 0.2 : 0.3} />
      <pointLight 
        position={[5, 5, 5]} 
        intensity={isMobile ? 0.6 : 0.8} 
        color="#4fc3dc" 
      />
      <pointLight 
        position={[-5, -5, 5]} 
        intensity={isMobile ? 0.6 : 0.8} 
        color="#ff2d75" 
      />
    </Canvas>
  );
};

export default ThreeScene;