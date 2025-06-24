'use client';

import { useState } from 'react';
import { useLanguage } from '../app/contexts/LanguageContext';

interface InAppBrowserBannerProps {
  appName?: string;
  onClose: () => void;
}

export default function InAppBrowserBanner({ appName = "현재 앱", onClose }: InAppBrowserBannerProps) {
  const { t } = useLanguage();
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-yellow-500 text-black p-3 text-sm shadow-md mx-auto max-w-[375px] border-t border-yellow-600">
      <div className="flex max-w-[290px] justify-between items-center">
        <div>
          <p className="font-bold mb-1">{t.notifications.inAppBrowser.title}</p>
          <p>
            {t.notifications.inAppBrowser.message}
          </p>
          <p className="mt-1 text-xs">
            {t.notifications.inAppBrowser.suggestion}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="fixed bottom-2 right-5 px-4 py-1 text-xs font-semibold bg-black text-white rounded hover:bg-gray-800"
        aria-label="배너 닫기"
      >
        {t.common.close}
      </button>
    </div>
  );
}