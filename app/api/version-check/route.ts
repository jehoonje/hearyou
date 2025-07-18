// app/api/version-check/route.ts

import { NextRequest, NextResponse } from 'next/server';

// 타입 정의
type Language = 'ko' | 'en';

interface VersionConfig {
  latestVersion: string;
  minimumVersion: string;
  updateUrl: string;
  updateMessages: {
    ko: {
      optional: string;
      force: string;
    };
    en: {
      optional: string;
      force: string;
    };
  };
}

// 버전 정보 관리 (실제로는 DB나 환경변수에서 관리)
const VERSION_CONFIG: { ios: VersionConfig } = {
  ios: {
    latestVersion: '1.2.0',
    minimumVersion: '1.1.0', // 이 버전 미만은 강제 업데이트
    updateUrl: 'https://apps.apple.com/app/id123456789', // 실제 앱 ID로 변경 필요
    updateMessages: {
      ko: {
        optional: '새로운 버전이 출시되었습니다. 업데이트하시면 더 나은 경험을 즐기실 수 있습니다.',
        force: '중요한 업데이트가 있습니다. 계속 사용하시려면 반드시 업데이트가 필요합니다.'
      },
      en: {
        optional: 'A new version is available. Update for a better experience.',
        force: 'An important update is required to continue using the app.'
      }
    }
  }
};

// 버전 비교 함수 (semantic versioning)
function compareVersions(current: string, target: string): number {
  const currentParts = current.split('.').map(Number);
  const targetParts = target.split('.').map(Number);
  
  for (let i = 0; i < 3; i++) {
    const currentPart = currentParts[i] || 0;
    const targetPart = targetParts[i] || 0;
    
    if (currentPart < targetPart) return -1;
    if (currentPart > targetPart) return 1;
  }
  
  return 0;
}

// 언어 타입 가드 함수
function isValidLanguage(lang: string): lang is Language {
  return lang === 'ko' || lang === 'en';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, currentVersion, language = 'ko' } = body;

    if (platform !== 'ios') {
      return NextResponse.json(
        { error: 'Unsupported platform' },
        { status: 400 }
      );
    }

    const config = VERSION_CONFIG.ios;
    
    // 언어 검증 및 기본값 설정
    const validLanguage: Language = isValidLanguage(language) ? language : 'ko';
    const messages = config.updateMessages[validLanguage];

    // 버전 비교
    const needsUpdate = compareVersions(currentVersion, config.latestVersion) < 0;
    const forceUpdate = compareVersions(currentVersion, config.minimumVersion) < 0;

    // 업데이트 통계 기록 (선택사항)
    // await logVersionCheck({ currentVersion, needsUpdate, forceUpdate });

    return NextResponse.json({
      needsUpdate,
      forceUpdate,
      latestVersion: config.latestVersion,
      minimumVersion: config.minimumVersion,
      updateUrl: config.updateUrl,
      updateMessage: forceUpdate ? messages.force : messages.optional,
      currentVersion
    });
  } catch (error) {
    console.error('Version check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}