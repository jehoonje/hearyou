import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "../types/supabase";
import { cache } from "react";
import { LanguageProvider } from "./contexts/LanguageContext";
import { LanguageDatabaseSync } from "../components/LanguageDatabaseSync";

// 세션 캐싱 함수
const getCachedSession = cache(async () => {
  const supabase = createServerComponentClient<Database>({ cookies });
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    console.error("세션 조회 오류:", error);
    return null;
  }
  return session;
});

export const metadata: Metadata = {
  title: "Univoice | 목소리로 연결되는 또 다른 우주",
  description:
    "매일 정해진 시간, 당신의 목소리가 들려주는 이야기를 분석해 비슷한 관심사를 가진 사람들과 연결해드립니다. 목소리로 시작되는 새로운 인연, Univoice에서 만나보세요.",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1
  },
    openGraph: {
    title: "Univoice | 목소리로 연결되는 또 다른 우주",
    description:
      "매일 정해진 시간, 당신의 목소리가 들려주는 이야기를 분석해 비슷한 관심사를 가진 사람들과 연결해드립니다. 목소리로 시작되는 새로운 인연, Univoice에서 만나보세요.",
    url: "https://hearyou.vercel.app",
    siteName: "Univoice",
    images: [
      {
        url: "https://github.com/jehoonje/jehoonje/blob/main/images/univoice-banner.png?raw=true",
        width: 424,
        height: 243,
        alt: "Univoice",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCachedSession();

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black" suppressHydrationWarning>
        {/* ▼▼▼ Glassmorphism 효과를 위한 SVG 필터 (화면에 보이지 않음) ▼▼▼ */}
        <svg style={{ position: "absolute", width: 0, height: 0 }}>
          <filter id="frosted" primitiveUnits="objectBoundingBox">
            <feImage href="data:image/png;base64,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" />
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="0.02"
              result="blur"
            />
            <feDisplacementMap
              id="disp"
              in="blur"
              in2="map"
              scale="1"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>
        <LanguageProvider>
          <AuthProvider initialSession={session}>
            <LanguageDatabaseSync />
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
