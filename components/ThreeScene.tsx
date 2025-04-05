'use client';

import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ThreeSceneProps {
  volume: number;
}

// 원형 파동 컴포넌트 수정 - 항상 표시되며 볼륨에 따라 크기만 변화
const CircularWave = ({ volume }: { volume: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // 파동 애니메이션을 위한 링 생성
  const rings = useMemo(() => {
    const result = [];
    for (let i = 0; i < 5; i++) {
      result.push({
        geometry: new THREE.RingGeometry(1, 1.03, 64),
        initialScale: 0.5 + i * 0.3, // 기본 크기 설정 (더 작게)
        phase: i * Math.PI / 3, // 각 링마다 위상차 부여
        baseColor: [0.2, 0.5 + i * 0.1, 1.0], // 파란색 계열로 설정
      });
    }
    return result;
  }, []);
  
  // 파동 애니메이션
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    // 볼륨에 상관없이 기본 애니메이션 효과를 위한 최소값 설정
    const baseIntensity = 0.3;
    // 볼륨에 따른 추가 강도
    const volumeIntensity = THREE.MathUtils.lerp(0, 0.7, Math.min(1, volume / 100));
    // 결합된 강도
    const totalIntensity = baseIntensity + volumeIntensity;
    
    // 시간 계산
    const time = clock.getElapsedTime();
    
    rings.forEach((ring, i) => {
      const child = groupRef.current!.children[i];
      if (child && child instanceof THREE.Mesh) {
        // 크기 애니메이션 - 볼륨에 따라 변화하지만 기본 크기 유지
        const baseScale = ring.initialScale;
        const volumeScale = (volume / 300) * ring.initialScale; // 볼륨에 비례한 크기 추가
        const wave = Math.sin(time * 1.5 + ring.phase) * 0.1 * totalIntensity;
        
        const scale = baseScale + volumeScale + wave;
        child.scale.set(scale, scale, 1);
        
        // 색상 및 불투명도 애니메이션
        const material = child.material as THREE.MeshBasicMaterial;
        if (material && material.type === 'MeshBasicMaterial') {
          // 볼륨이 낮을 때도 기본 색상 강도 유지
          const baseColorIntensity = 0.6;
          const volumeColorIntensity = volume / 200;
          const colorIntensity = baseColorIntensity + volumeColorIntensity;
          
          material.color.setRGB(
            ring.baseColor[0] * colorIntensity,
            ring.baseColor[1] * colorIntensity,
            ring.baseColor[2] * colorIntensity
          );
          
          // 기본 불투명도 + 볼륨에 따른 변화
          const baseOpacity = 0.2 + (i * 0.02);
          const volumeOpacity = volume / 400;
          material.opacity = baseOpacity + volumeOpacity + Math.sin(time * 1.5 + i) * 0.1;
        }
      }
    });
  });
  
  return (
    <group ref={groupRef} position={[0, 0, -0.5]}>
      {rings.map((ring, i) => (
        <mesh key={i} position={[0, 0, -0.05 * i]}>
          <primitive object={ring.geometry} attach="geometry" />
          <meshBasicMaterial 
            transparent 
            opacity={0.3} 
            side={THREE.DoubleSide}
            color={new THREE.Color(ring.baseColor[0], ring.baseColor[1], ring.baseColor[2])}
          />
        </mesh>
      ))}
    </group>
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
      <CircularWave volume={volume} />
    </Canvas>
  );
};

export default ThreeScene;
