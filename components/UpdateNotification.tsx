// components/UpdateNotification.tsx

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UpdateInfo {
  needsUpdate: boolean;
  forceUpdate: boolean;
  latestVersion: string;
  updateUrl: string;
  updateMessage: string;
  currentVersion: string;
}

const UpdateNotification: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 네이티브 앱으로부터 업데이트 정보 수신
    const handleAppUpdate = (event: CustomEvent<UpdateInfo>) => {
      console.log('[UpdateNotification] 업데이트 정보 수신:', event.detail);
      setUpdateInfo(event.detail);
      setDismissed(false);
    };

    // 전역 함수로도 등록 (네이티브에서 직접 호출용)
    (window as any).handleAppUpdate = (info: UpdateInfo) => {
      console.log('[UpdateNotification] 직접 호출로 업데이트 정보 수신:', info);
      setUpdateInfo(info);
      setDismissed(false);
    };

    window.addEventListener('appupdate', handleAppUpdate as any);

    return () => {
      window.removeEventListener('appupdate', handleAppUpdate as any);
      delete (window as any).handleAppUpdate;
    };
  }, []);

  const handleUpdate = () => {
    if (updateInfo?.updateUrl && window.ReactNativeWebView) {
      // 네이티브 앱에 App Store 열기 요청
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'OPEN_APP_STORE',
          payload: { url: updateInfo.updateUrl }
        })
      );
    }
  };

  const handleDismiss = () => {
    if (!updateInfo?.forceUpdate) {
      setDismissed(true);
      // 24시간 동안 다시 표시하지 않기
      try {
        localStorage.setItem('updateDismissed', new Date().toISOString());
      } catch (e) {
        console.error('Failed to save dismiss state:', e);
      }
    }
  };

  // 업데이트 정보가 없거나 이미 닫았으면 표시하지 않음
  if (!updateInfo || !updateInfo.needsUpdate || (!updateInfo.forceUpdate && dismissed)) {
    return null;
  }

  return (
    <AnimatePresence>
      {/* 강제 업데이트 시 전체 화면 오버레이 */}
      {updateInfo.forceUpdate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-[9998]"
          style={{ pointerEvents: 'auto' }}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className={`fixed ${
          updateInfo.forceUpdate 
            ? 'inset-0 flex items-center justify-center z-[9999]' 
            : 'bottom-4 left-4 right-4 z-50'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        <div className={`
          backdrop-blur-lg bg-white/10 p-6 rounded-2xl shadow-2xl
          ${updateInfo.forceUpdate ? 'max-w-sm w-full mx-4' : 'w-full'}
          border border-white/20
        `}>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg mb-1 font-mono">
                업데이트 {updateInfo.forceUpdate ? '필수' : '알림'}
              </h3>
              <p className="text-gray-300 text-sm mb-2 font-mono">
                {updateInfo.updateMessage}
              </p>
              <p className="text-gray-400 text-xs font-mono">
                현재 버전: v{updateInfo.currentVersion} → 최신 버전: v{updateInfo.latestVersion}
              </p>
            </div>
          </div>

          <div className="mt-4 flex space-x-2">
            <button
              onClick={handleUpdate}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors font-mono"
            >
              업데이트
            </button>
            
            {!updateInfo.forceUpdate && (
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-mono"
              >
                나중에
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateNotification;