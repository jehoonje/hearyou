// speechRecognizer.ts

import { resetKeywordTracker } from './keywordAnalyzer';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    isNativeApp?: boolean;
    useNativeSpeechRecognition?: boolean;
    // 🔥 전역 핸들러 이름을 명확히 변경하여 다른 스크립트와의 충돌을 방지합니다.
    speechRecognitionHandler?: (transcript: string, isFinal: boolean, confidence: number, isInitialization?: boolean) => void;
    volumeUpdateHandler?: (volume: number) => void;
  }
}

export const startSpeechRecognition = (
  onTranscript: (transcript: string, isFinal: boolean, confidence: number) => void,
  onVolumeUpdate?: (volume: number) => void
): (() => void) => {
  // --- 네이티브 앱 환경 로직 ---
  if (window.isNativeApp && window.useNativeSpeechRecognition) {
    let lastProcessedTranscript = '';
    
    // 🔥 여기가 모든 문제 해결의 핵심입니다.
    // 네이티브로부터 받은 모든 음성 인식 데이터를 이 함수 하나로 처리합니다.
    window.speechRecognitionHandler = (transcript: string, isFinal: boolean, confidence: number, isInitialization = false) => {
      // 1. '초기화' 신호를 최우선으로 처리합니다.
      if (isInitialization) {
        console.log('[WebView] Native로부터 초기화 신호 수신. 모든 상태를 리셋합니다.');
        resetKeywordTracker();
        onTranscript("", true, 0.0);
        lastProcessedTranscript = '';
        return;
      }

      // 2. 내용이 없는 최종 결과(문장 끝)도 UI를 초기화합니다.
      if (transcript.trim() === "" && isFinal) {
        onTranscript("", true, 0.0);
        return;
      }
      
      // 3. 실제 음성 데이터 처리
      if (transcript.trim()) {
        // 동일한 최종 결과가 중복으로 들어오는 것을 방지합니다.
        if (isFinal) {
          if (transcript === lastProcessedTranscript) return;
          lastProcessedTranscript = transcript;
        }
        onTranscript(transcript, isFinal, confidence);
      }
    };

    window.volumeUpdateHandler = (volume: number) => {
      if (onVolumeUpdate) {
        onVolumeUpdate(volume);
      }
    };

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'START_NATIVE_RECOGNITION' }));
    }

    return () => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STOP_NATIVE_RECOGNITION' }));
      }
      window.speechRecognitionHandler = undefined;
      window.volumeUpdateHandler = undefined;
    };
  }

  // --- 웹 브라우저 환경 로직 (기존과 동일) ---
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onTranscript('(브라우저가 음성 인식을 지원하지 않습니다)', true, 1.0);
    return () => {};
  }
  
  // ( ... 기존의 웹 브라우저용 SpeechRecognition 코드는 여기에 그대로 유지 ... )
  // 이 부분은 제공된 원본 코드와 동일하게 유지하면 됩니다.
  const recognition = new SpeechRecognition();
  recognition.lang = 'ko-KR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let isRecognitionActive = false;
  let stopCalledIntentionally = false;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  
  recognition.onstart = () => {
    isRecognitionActive = true;
    stopCalledIntentionally = false;
    resetKeywordTracker(); // 웹 환경에서도 시작 시 리셋
  };

  recognition.onresult = (event: any) => {
    let interim_transcript = '';
    let final_transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        final_transcript += event.results[i][0].transcript;
      } else {
        interim_transcript += event.results[i][0].transcript;
      }
    }
    onTranscript(final_transcript || interim_transcript, final_transcript !== '', 0.9);
  };

  recognition.onend = () => {
    isRecognitionActive = false;
    if (!stopCalledIntentionally) {
      restartTimer = setTimeout(() => recognition.start(), 300);
    }
  };
  
  recognition.onerror = () => {
    isRecognitionActive = false;
  };

  recognition.start();

  return () => {
    stopCalledIntentionally = true;
    if (restartTimer) clearTimeout(restartTimer);
    recognition.stop();
  };
};