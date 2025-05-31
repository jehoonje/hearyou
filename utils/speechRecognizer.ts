declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    isNativeApp?: boolean;
    useNativeSpeechRecognition?: boolean;
    handleNativeSpeechResult?: (transcript: string, isFinal: boolean, confidence: number) => void;
  }
}

export const startSpeechRecognition = (
  onTranscript: (transcript: string, isFinal: boolean, confidence: number) => void
): (() => void) => {
  // 네이티브 앱에서 실행 중인 경우
  if (window.isNativeApp && window.useNativeSpeechRecognition) {
    console.log('네이티브 음성 인식 모드 사용');
    
    // 네이티브 앱의 음성 인식 결과를 받는 핸들러 설정
    window.handleNativeSpeechResult = (transcript: string, isFinal: boolean, confidence: number) => {
      console.log('네이티브 음성 인식 결과:', transcript, isFinal, confidence);
      onTranscript(transcript, isFinal, confidence);
    };
    
    // 네이티브 앱에 음성 인식 시작 요청
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'START_NATIVE_RECOGNITION'
      }));
    }
    
    // 클린업 함수
    return () => {
      console.log('네이티브 음성 인식 정리');
      window.handleNativeSpeechResult = undefined;
    };
  }

  // 웹 브라우저에서 실행되는 경우 기존 로직 사용
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error('음성 인식 API가 지원되지 않습니다.');
    onTranscript('(브라우저가 음성 인식을 지원하지 않습니다)', true, 1.0);
    return () => {};
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'ko-KR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let isRecognitionActive = false;
  let restartAttempts = 0;
  const MAX_RESTART_ATTEMPTS = 5;
  let stopCalledIntentionally = false;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  // no-speech 오류 추적을 위한 변수 추가
  let consecutiveNoSpeechErrors = 0;
  const MAX_NO_SPEECH_ERRORS = 3;
  let lastNoSpeechTime = 0;
  const NO_SPEECH_RESET_TIME = 15000; // 15초

  // 중간 결과 처리 관련 변수
  let interimTranscript = '';
  let lastInterimTime = 0;
  const INTERIM_UPDATE_INTERVAL = 300;

  // 네이티브 앱에 메시지를 보내는 함수
  const sendMessageToNative = (message: any) => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  };

  const stopRecognition = () => {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    if (isRecognitionActive && recognition) {
      console.log('음성 인식 명시적 중지 요청');
      stopCalledIntentionally = true;
      try {
        recognition.stop();
      } catch (e) {
        console.error('recognition.stop() 호출 중 오류:', e);
        isRecognitionActive = false;
      }
    } else {
      isRecognitionActive = false;
    }
  };

  const safelyRestartRecognition = () => {
    if (restartTimer) clearTimeout(restartTimer);

    // 의도적 중지, 탭 숨김, 이미 활성 상태, no-speech 오류가 많은 경우 재시작 안 함
    if (stopCalledIntentionally || document.hidden || isRecognitionActive || 
        consecutiveNoSpeechErrors >= MAX_NO_SPEECH_ERRORS) {
      console.log('재시작 조건 불충족 - 재시작 안 함');
      if (consecutiveNoSpeechErrors >= MAX_NO_SPEECH_ERRORS) {
        console.log(`연속 no-speech 오류 ${consecutiveNoSpeechErrors}회로 재시작 중단`);
        // 네이티브 앱에 오류 상태 알림
        sendMessageToNative({
          type: 'SPEECH_RECOGNITION_ERROR',
          message: '음성이 감지되지 않습니다. 마이크 상태를 확인해주세요.'
        });
      }
      isRecognitionActive = false;
      return;
    }

    if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
      console.warn(`최대 재시도(${MAX_RESTART_ATTEMPTS}회) 도달. 15초 후 재시도.`);
      restartTimer = setTimeout(() => {
        restartAttempts = 0;
        consecutiveNoSpeechErrors = 0; // 장시간 대기 후에는 no-speech 카운트도 리셋
        safelyRestartRecognition();
      }, 15000);
      return;
    }

    try {
      restartAttempts++;
      console.log(`음성 인식 재시작 시도 (${restartAttempts}/${MAX_RESTART_ATTEMPTS})`);

      try {
        if (!isRecognitionActive) {
          recognition.start();
        } else {
          console.warn('isRecognitionActive가 이미 true여서 start() 호출 건너뜀');
        }
      } catch (startError: any) {
        if (startError.name === 'InvalidStateError') {
          console.warn('recognition.start() 오류: 이미 시작된 상태 (InvalidStateError)');
          isRecognitionActive = true;
          return;
        } else {
          console.error('recognition.start() 즉시 오류:', startError);
          isRecognitionActive = false;
          throw startError;
        }
      }

    } catch (e: any) {
      isRecognitionActive = false;
      // no-speech 관련 오류가 아닌 경우에만 지수 백오프 적용
      const delay = consecutiveNoSpeechErrors >= 2 ? 5000 : 300 * Math.pow(1.5, restartAttempts);
      console.log(`다음 재시도 대기: ${delay}ms`);
      restartTimer = setTimeout(safelyRestartRecognition, delay);
    }
  };

  recognition.onstart = () => {
    console.log('음성 인식이 시작되었습니다.');
    isRecognitionActive = true;
    restartAttempts = 0;
    stopCalledIntentionally = false;
    // 성공적으로 시작되면 no-speech 카운트 감소
    if (consecutiveNoSpeechErrors > 0) {
      consecutiveNoSpeechErrors = Math.max(0, consecutiveNoSpeechErrors - 1);
      console.log(`no-speech 카운트 감소: ${consecutiveNoSpeechErrors}`);
    }
  };

  recognition.onresult = (event: any) => {
    console.log('onresult 이벤트 발생!', event);
  
    let currentInterim = '';
    let finalTranscript = '';
  
    if (!event.results || event.results.length === 0) {
      console.warn('onresult: 유효한 결과 데이터 없음');
      return;
    }

    // 결과가 있으면 no-speech 카운트 리셋
    consecutiveNoSpeechErrors = 0;
  
    console.log(`onresult: results 길이=${event.results.length}, resultIndex=${event.resultIndex}`);
  
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (!event.results[i] || !event.results[i][0]) {
         console.warn(`유효하지 않은 결과 객체 또는 대안 (index: ${i})`);
         continue;
      }
  
      const resultAlternative = event.results[i][0];
      const transcriptPiece = resultAlternative.transcript;
      const confidence = resultAlternative.confidence;
  
      console.log(`onresult loop (i=${i}): isFinal=${event.results[i].isFinal}, transcript="${transcriptPiece}", confidence=${confidence}`);
  
      if (event.results[i].isFinal) {
        finalTranscript += transcriptPiece;
        console.log(`최종 결과 조각 발견: "${transcriptPiece}", 신뢰도: ${confidence}`);
      } else {
        currentInterim += transcriptPiece;
      }
    }
  
    if (finalTranscript) {
      console.log(`최종 결과 콜백 호출: "${finalTranscript}"`);
      onTranscript(finalTranscript, true, event.results[event.results.length - 1][0].confidence);
      interimTranscript = '';
    }
    else if (currentInterim) {
      interimTranscript = currentInterim;
      const now = Date.now();
      if (now - lastInterimTime > INTERIM_UPDATE_INTERVAL) {
         console.log(`중간 결과 콜백 호출: "${interimTranscript}"`);
         onTranscript(interimTranscript, false, 0.5);
         lastInterimTime = now;
      }
    }
  };

  recognition.onerror = (event: any) => {
    console.error('onerror 이벤트 발생:', event.error, event.message);
    const error = event.error;
    isRecognitionActive = false;

    if (error === 'not-allowed' || error === 'service-not-allowed') {
      onTranscript('(마이크 접근이 거부되었습니다. 브라우저 설정 확인)', true, 1.0);
      stopCalledIntentionally = true;
      sendMessageToNative({
        type: 'SPEECH_RECOGNITION_ERROR',
        message: '마이크 접근이 거부되었습니다.'
      });
    } else if (error === 'audio-capture') {
      onTranscript('(마이크를 찾을 수 없습니다. 연결 확인)', true, 1.0);
      stopCalledIntentionally = true;
      sendMessageToNative({
        type: 'SPEECH_RECOGNITION_ERROR',
        message: '마이크를 찾을 수 없습니다.'
      });
    } else if (error === 'network') {
      onTranscript('(네트워크 오류. 인터넷 연결 확인)', true, 1.0);
      sendMessageToNative({
        type: 'SPEECH_RECOGNITION_ERROR',
        message: '네트워크 오류가 발생했습니다.'
      });
    } else if (error === 'no-speech') {
      consecutiveNoSpeechErrors++;
      lastNoSpeechTime = Date.now();
      console.log(`no-speech 오류 발생 (${consecutiveNoSpeechErrors}/${MAX_NO_SPEECH_ERRORS})`);
      
      if (consecutiveNoSpeechErrors >= MAX_NO_SPEECH_ERRORS) {
        console.log('연속 no-speech 오류 한계 도달');
        onTranscript('(음성이 감지되지 않습니다. 마이크 상태 확인)', true, 1.0);
        sendMessageToNative({
          type: 'SPEECH_RECOGNITION_ERROR',
          message: `음성이 감지되지 않습니다 (${consecutiveNoSpeechErrors}회). 마이크 상태를 확인해주세요.`
        });
      }
    } else if (error === 'aborted') {
      console.log(`인식 중단됨(aborted). 의도적 중지: ${stopCalledIntentionally}, 탭 숨김: ${document.hidden}`);
    } else {
      onTranscript(`(음성 인식 오류: ${error})`, true, 1.0);
      sendMessageToNative({
        type: 'SPEECH_RECOGNITION_ERROR',
        message: `음성 인식 오류: ${error}`
      });
    }
  };

  recognition.onend = () => {
    console.log(`onend 이벤트 발생. 상태: ${isRecognitionActive ? '활성':'비활성'}, 의도적중지: ${stopCalledIntentionally}, 탭숨김: ${document.hidden}, no-speech 오류: ${consecutiveNoSpeechErrors}`);
    isRecognitionActive = false;

    // no-speech 오류가 많지 않고, 의도적 중지나 탭 숨김이 아닌 경우에만 재시작
    if (!stopCalledIntentionally && !document.hidden && consecutiveNoSpeechErrors < MAX_NO_SPEECH_ERRORS) {
      console.log('onend: 자동 재시작 예약');
      const delay = consecutiveNoSpeechErrors > 0 ? 2000 : 500; // no-speech 오류가 있었다면 더 긴 대기
      restartTimer = setTimeout(safelyRestartRecognition, delay);
    } else {
      console.log('onend: 자동 재시작 안 함');
      if (stopCalledIntentionally) {
          stopCalledIntentionally = false;
      }
    }
  };

  // no-speech 카운트 리셋 타이머
  let noSpeechResetTimer: ReturnType<typeof setTimeout> | null = null;
  
  const resetNoSpeechCountAfterDelay = () => {
    if (noSpeechResetTimer) clearTimeout(noSpeechResetTimer);
    noSpeechResetTimer = setTimeout(() => {
      if (consecutiveNoSpeechErrors > 0) {
        console.log('no-speech 카운트 시간 경과로 리셋');
        consecutiveNoSpeechErrors = 0;
        // 리셋 후 재시작 시도 (조건 충족 시)
        if (!stopCalledIntentionally && !document.hidden && !isRecognitionActive) {
          console.log('no-speech 리셋 후 재시작 시도');
          safelyRestartRecognition();
        }
      }
    }, NO_SPEECH_RESET_TIME);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      console.log('탭 비활성화 감지됨. 음성 인식 중지 시도.');
      stopRecognition();
    } else {
      console.log('탭 활성화 감지됨. 음성 인식 재시작 시도.');
      stopCalledIntentionally = false;
      consecutiveNoSpeechErrors = 0; // 탭 활성화 시 no-speech 카운트 리셋
      safelyRestartRecognition();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  console.log('음성 인식 초기 시작 시도');
  safelyRestartRecognition();

  return () => {
    console.log('Cleanup: 음성 인식 중지 및 리스너 제거');
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (restartTimer) clearTimeout(restartTimer);
    if (noSpeechResetTimer) clearTimeout(noSpeechResetTimer);
    stopRecognition();
  };
};
