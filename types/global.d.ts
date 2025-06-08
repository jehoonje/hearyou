// global.d.ts

declare global {
  interface Window {
    // 네이티브로부터 인증 데이터를 받기 위한 함수
    handleNativeAuth?: (data: { token?: string; error?: string }) => void;

    // 네이티브로 메시지를 보내기 위한 객체
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

// 이 파일이 모듈임을 TypeScript에 알리기 위해 빈 export를 추가합니다.
export {};