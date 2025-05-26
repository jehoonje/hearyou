// nextConfig.mjs - 기존 파일 전체 교체
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
      config.externals = {
        ...config.externals,
        canvas: 'canvas',
      };
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
