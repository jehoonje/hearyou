'use client';

import { useState } from 'react';

interface InAppBrowserBannerProps {
  appName?: string; // 감지된 앱 이름 (선택적)
  onClose: () => void; // 닫기 버튼 핸들러
}

export default function InAppBrowserBanner({ appName = "현재 앱", onClose }: InAppBrowserBannerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-500 text-black p-3 text-sm shadow-md mx-auto max-w-[375px] border-t border-yellow-600">
      <div className="flex  max-w-[290px] justify-between items-center">
        <div>
          <p className="font-bold mb-1">알림</p>
          <p>
            음성 인식 기능은 {appName} 내 브라우저에서 불안정할 수 있습니다. <br />
            최적의 경험을 위해 <strong className="font-semibold">Safari 또는 Chrome</strong>과 같은 기본 브라우저에서 열어주세요.
          </p>
          <p className="mt-1 text-xs">
            (화면 우측 상단 '…' 또는 '공유' 버튼을 눌러 '시스템 브라우저에서 열기'를 선택해 보세요.)
          </p>
        </div>
      </div>
        <button
          onClick={onClose}
          className="fixed bottom-2 right-5 px-4 py-1 text-xs font-semibold bg-black text-white rounded hover:bg-gray-800"
          aria-label="배너 닫기"
        >
          닫기
        </button>
    </div>
  );
}