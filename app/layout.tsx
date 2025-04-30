import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '../types/supabase';
import { cache } from 'react';

// 세션 캐싱 함수
const getCachedSession = cache(async () => {
  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('세션 조회 오류:', error);
    return null;
  }
  return session;
});

export const metadata: Metadata = {
  title: 'Univoice | 목소리로 연결되는 또 다른 우주',
  description: '매일 정해진 시간, 당신의 목소리가 들려주는 이야기를 분석해 비슷한 관심사를 가진 사람들과 연결해드립니다. 목소리로 시작되는 새로운 인연, Univoice에서 만나보세요.',
  openGraph: {
    title: 'Univoice | 목소리로 연결되는 또 다른 우주',
    description: '매일 정해진 시간, 당신의 목소리가 들려주는 이야기를 분석해 비슷한 관심사를 가진 사람들과 연결해드립니다. 목소리로 시작되는 새로운 인연, Univoice에서 만나보세요.',
    url: 'https://hearyou.vercel.app',
    siteName: 'Univoice',
    images: [
      {
        url: 'https://github.com/jehoonje/jehoonje/blob/main/images/univoice-banner.png?raw=true',
        width: 424,
        height: 243,
        alt: 'Univoice',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 캐싱된 세션 가져오기
  const session = await getCachedSession();

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black" suppressHydrationWarning>
        <AuthProvider initialSession={session}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}