// nextConfig.mjs - 수정된 버전
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // 모바일 최적화 설정 추가
  experimental: {
    esmExternals: false,
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  // Three.js WebGL 최적화
  webpack: (config, { isServer }) => {
    // 서버사이드에서 canvas 관련 오류 방지
    if (isServer) {
      // 방법 1: 배열에 추가하는 방식
      config.externals.push('canvas');
      
      // 또는 방법 2: 함수형으로 처리
      // config.externals.push(({ request }) => {
      //   if (request === 'canvas') return 'canvas';
      // });
    }
    
    // 모바일 성능 최적화
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      type: 'asset/source',
    });
    
    return config;
  },
  // 개발 서버 설정 (모바일 접근 허용)
  async rewrites() {
    return [];
  },
};

export default nextConfig;