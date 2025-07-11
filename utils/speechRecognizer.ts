// speechRecognizer.ts - 중복 처리 방지 및 최종 결과만 처리

import { resetKeywordTracker } from './keywordAnalyzer';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    isNativeApp?: boolean;
    useNativeSpeechRecognition?: boolean;
    speechRecognitionHandler?: (transcript: string, isFinal: boolean, confidence: number, isInitialization?: boolean) => void;
    volumeUpdateHandler?: (volume: number) => void;
  }
}

export const startSpeechRecognition = (
  onTranscript: (transcript: string, isFinal: boolean, confidence: number) => void,
  onVolumeUpdate?: (volume: number) => void
): (() => void) => {
  // 시작 시 한 번만 리셋
  resetKeywordTracker();
  
  // --- 네이티브 앱 환경 로직 ---
  if (window.isNativeApp && window.useNativeSpeechRecognition) {
    let lastProcessedTranscript = '';
    let lastProcessedTime = 0;
    let isProcessing = false;
    
    // **더 엄격한 중복 방지 로직**
    const MIN_PROCESS_INTERVAL = 2000; // 2초로 증가
    const MIN_TRANSCRIPT_LENGTH = 2; // 최소 길이 체크
    
    window.speechRecognitionHandler = (transcript: string, isFinal: boolean, confidence: number, isInitialization = false) => {
      console.log('[WebView] 수신:', { transcript, isFinal, confidence, isInitialization, isProcessing });
      
      // 처리 중이면 무시
      if (isProcessing) {
        console.log('[WebView] 처리 중이므로 무시');
        return;
      }
      
      // 초기화 신호는 무시
      if (isInitialization) {
        console.log('[WebView] 초기화 신호 무시');
        return;
      }

      // 빈 최종 결과 처리
      if (transcript.trim() === "" && isFinal) {
        console.log('[WebView] 빈 최종 결과 처리');
        onTranscript("", true, 0.0);
        return;
      }
      
      // **최종 결과만 처리하도록 제한**
      if (!isFinal) {
        console.log('[WebView] 부분 결과 무시:', transcript);
        // 부분 결과는 UI 업데이트만 (키워드 분석하지 않음)
        if (transcript.trim().length >= MIN_TRANSCRIPT_LENGTH) {
          onTranscript(transcript, false, confidence);
        }
        return;
      }
      
      // 실제 음성 데이터 처리 (최종 결과만)
      if (transcript.trim() && isFinal) {
        const now = Date.now();
        
        // **강화된 중복 방지**
        if (transcript === lastProcessedTranscript && 
            (now - lastProcessedTime) < MIN_PROCESS_INTERVAL) {
          console.log('[WebView] 중복된 최종 결과 무시:', transcript);
          return;
        }
        
        // 길이 체크
        if (transcript.trim().length < MIN_TRANSCRIPT_LENGTH) {
          console.log('[WebView] 너무 짧은 결과 무시:', transcript);
          return;
        }
        
        // 처리 플래그 설정
        isProcessing = true;
        
        try {
          console.log('[WebView] 최종 결과 처리:', transcript);
          lastProcessedTranscript = transcript;
          lastProcessedTime = now;
          onTranscript(transcript, true, confidence);
        } finally {
          // 처리 완료 후 플래그 해제
          setTimeout(() => {
            isProcessing = false;
          }, 500);
        }
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
      console.log('[WebView] speechRecognizer cleanup');
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STOP_NATIVE_RECOGNITION' }));
      }
      window.speechRecognitionHandler = undefined;
      window.volumeUpdateHandler = undefined;
      
      // 상태 초기화
      lastProcessedTranscript = '';
      lastProcessedTime = 0;
      isProcessing = false;
    };
  }

  // --- 웹 브라우저 환경 로직 (변경 없음) ---
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onTranscript('(브라우저가 음성 인식을 지원하지 않습니다)', true, 1.0);
    return () => {};
  }
  
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
    console.log('[SpeechRecognition] 시작됨');
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
    
    const transcript = final_transcript || interim_transcript;
    const isFinal = final_transcript !== '';
    const confidence = event.results[event.resultIndex][0].confidence || 0.9;
    
    if (transcript) {
      onTranscript(transcript, isFinal, confidence);
    }
  };

  recognition.onspeechend = () => {
    console.log('[SpeechRecognition] 음성 끝');
  };

  recognition.onend = () => {
    console.log('[SpeechRecognition] 종료됨');
    isRecognitionActive = false;
    
    if (!stopCalledIntentionally) {
      restartTimer = setTimeout(() => {
        try {
          console.log('[SpeechRecognition] 자동 재시작');
          recognition.start();
        } catch (e) {
          console.error('[SpeechRecognition] 재시작 실패:', e);
        }
      }, 1000);
    }
  };
  
  recognition.onerror = (event: any) => {
    console.error('[SpeechRecognition] 오류:', event.error);
    isRecognitionActive = false;
    
    if (event.error !== 'no-speech' && !stopCalledIntentionally) {
      restartTimer = setTimeout(() => {
        try {
          recognition.start();
        } catch (e) {
          console.error('[SpeechRecognition] 오류 후 재시작 실패:', e);
        }
      }, 1000);
    }
  };

  try {
    recognition.start();
  } catch (e) {
    console.error('[SpeechRecognition] 초기 시작 실패:', e);
  }

  return () => {
    stopCalledIntentionally = true;
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    try {
      recognition.stop();
    } catch (e) {
      console.error('[SpeechRecognition] 중지 실패:', e);
    }
  };
};