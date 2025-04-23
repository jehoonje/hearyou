import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  // 기본 title과 description은 og:title, og:description의 기본값으로도 사용될 수 있음
  title: 'Univoice | 목소리로 연결되는 또 다른 우주', // 좀 더 매력적인 제목으로 변경 가능
  description: '매일 정해진 시간, 당신의 목소리가 들려주는 이야기를 분석해 비슷한 관심사를 가진 사람들과 연결해드립니다. 목소리로 시작되는 새로운 인연, Univoice에서 만나보세요.', // 설명 보강

  // **** 오픈 그래프 메타데이터 추가 ****
  openGraph: {
    title: 'Univoice | 목소리로 연결되는 또 다른 우주', // og:title (기본 title과 같거나 다르게 설정 가능)
    description: '매일 정해진 시간, 당신의 목소리가 들려주는 이야기를 분석해 비슷한 관심사를 가진 사람들과 연결해드립니다. 목소리로 시작되는 새로운 인연, Univoice에서 만나보세요.', // og:description
    url: 'https://hearyou.vercel.app', // **** 중요: 실제 서비스 URL로 변경 ****
    siteName: 'Univoice', // 웹사이트 이름
    images: [ // **** 중요: 미리보기 이미지 설정 ****
      {
        url: 'https://github.com/jehoonje/jehoonje/blob/main/images/univoice-banner.png?raw=true', // **** 중요: public 폴더 등에 넣은 이미지의 절대 URL ****
        width: 424, // 이미지 가로 크기 (픽셀)
        height: 243, // 이미지 세로 크기 (픽셀)
        alt: 'Univoice', // 이미지 대체 텍스트
      },
      // 필요하다면 다른 해상도의 이미지를 추가할 수도 있습니다.
      // {
      //   url: 'https://<배포된_실제_도메인>/og-image-square.png',
      //   width: 600,
      //   height: 600,
      //   alt: 'Voice Tracker 서비스 로고',
      // },
    ],
    locale: 'ko_KR', // 언어 설정
    type: 'website', // 페이지 타입
  },
  // 트위터 카드 설정 (선택 사항이지만 추가하면 좋음)
  // twitter: {
  //   card: 'summary_large_image', // 카드 타입 (큰 이미지)
  //   title: 'Voice Tracker | 당신의 목소리를 시각화하세요',
  //   description: '실시간 음성 분석으로 목소리의 파동을 눈으로 확인하고, 주요 키워드를 추적해보세요.',
  //   images: ['https://<배포된_실제_도메인>/og-image.png'], // 트위터용 이미지 URL
  // },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black" suppressHydrationWarning>
        <AuthProvider initialSession={session}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
