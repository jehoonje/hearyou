'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ThreeSceneProps {
  volume: number;
}

// Three.js 시각화 컴포넌트 수정
const ParticleCloud = ({ volume }: { volume: number }) => {
  const pointsRef = useRef<THREE.Points | null>(null);
  const geometry = useRef<THREE.BufferGeometry | null>(null);
  const material = useRef<THREE.PointsMaterial | null>(null);
  const particleCount = 2000;
  
  // 초기 위치 및 색상을 메모이제이션
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      colors[i * 3] = 0.5;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;
    }
    
    return { positions, colors };
  }, [particleCount]);

  // 포인트 클라우드 초기화
  useEffect(() => {
    geometry.current = new THREE.BufferGeometry();
    geometry.current.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.current.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    material.current = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
    });

    return () => {
      if (geometry.current) geometry.current.dispose();
      if (material.current) material.current.dispose();
    };
  }, [positions, colors]);

  // 볼륨에 따른 애니메이션
  useFrame(() => {
    if (!geometry.current) return;
    
    const positions = geometry.current.attributes.position.array as Float32Array;
    const smoothedVolume = THREE.MathUtils.lerp(0.0001, 0.001, Math.min(1, volume / 100));
    
    for (let i = 0; i < particleCount; i++) {
      // 각 파티클마다 서로 다른 애니메이션 패턴
      const xPos = positions[i * 3];
      const time = Date.now() * smoothedVolume;
      
      // Y 위치를 사인 웨이브로 애니메이션
      positions[i * 3 + 1] += Math.sin(xPos * 0.5 + time * 0.001) * 0.01;
      
      // 볼륨이 높을 때 파티클 확산
      if (volume > 40) {
        positions[i * 3] += (Math.random() - 0.5) * 0.02 * (volume / 100);
        positions[i * 3 + 2] += (Math.random() - 0.5) * 0.02 * (volume / 100);
      }
      
      // 경계 체크 - 너무 멀리 가지 않도록
      if (Math.abs(positions[i * 3]) > 5) {
        positions[i * 3] *= 0.95;
      }
      if (Math.abs(positions[i * 3 + 1]) > 5) {
        positions[i * 3 + 1] *= 0.95;
      }
      if (Math.abs(positions[i * 3 + 2]) > 5) {
        positions[i * 3 + 2] *= 0.95;
      }
    }
    
    geometry.current.attributes.position.needsUpdate = true;
  });

  // primitive 컴포넌트 대신 bufferGeometry와 pointsMaterial 직접 사용
  return (
    <points ref={pointsRef}>
      {geometry.current && <bufferGeometry attach="geometry" {...geometry.current} />}
      {material.current && <pointsMaterial attach="material" {...material.current} />}
    </points>
  );
};

const ThreeScene = ({ volume }: ThreeSceneProps) => {
  return (
    <Canvas
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      camera={{ position: [0, 0, 5], fov: 75 }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <ParticleCloud volume={volume} />
    </Canvas>
  );
};

export default ThreeScene;
