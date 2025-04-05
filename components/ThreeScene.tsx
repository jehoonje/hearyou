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
const ParticleEffect = ({ volume }: { volume: number }) => {
  const particlesRef = useRef<THREE.Group>(null);
  const particleCount = 100;
  
  // 파티클 초기화
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
  
  // 파티클 애니메이션
  useFrame(({ clock }) => {
    if (!particlesRef.current) return;
    
    const time = clock.getElapsedTime();
    const volumeFactor = Math.min(volume / 100, 1);
    
    particlesRef.current.children.forEach((particle, i) => {
      if (particle instanceof THREE.Mesh) {
        const data = particles[i];
        
        // 원형 패턴으로 움직임
        const angle = time * data.speed + data.phase;
        const radius = 2 + Math.sin(time * 0.3 + i) * 0.5;
        
        particle.position.x = Math.cos(angle) * radius * (1 + volumeFactor * 0.2);
        particle.position.y = Math.sin(angle * 0.7) * radius * (1 + volumeFactor * 0.2);
        particle.position.z = Math.sin(time * 0.2 + i) * 2;
        
        // 볼륨에 따른 크기 변화
        const baseScale = data.scale;
        const volumeScale = volumeFactor * data.scale * 0.5;
        const pulseScale = Math.sin(time * 2 + data.phase) * 0.2 * volumeFactor;
        
        const scale = baseScale + volumeScale + pulseScale;
        particle.scale.set(scale, scale, scale);
        
        // 색상 변화
        if (particle.material instanceof THREE.MeshBasicMaterial) {
          const hue = (time * 0.05 + i * 0.01) % 1;
          particle.material.color.setHSL(hue, 0.8, 0.5 + volumeFactor * 0.3);
          particle.material.opacity = 0.6 + volumeFactor * 0.4;
        }
      }
    });
  });
  
  return (
    <group ref={particlesRef}>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position as [number, number, number]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial 
            color={particle.color} 
            transparent 
            opacity={0.7} 
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
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
      camera={{ position: [0, 0, 7], fov: 70 }}
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
