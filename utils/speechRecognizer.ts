export const startSpeechRecognition = (
  onTranscript: (transcript: string, isFinal: boolean, confidence: number) => void
): (() => void) => {
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
  recognition.maxAlternatives = 3;
  
  // 상태 추적 변수 추가
  let isRecognitionActive = false;
  let restartAttempts = 0;
  const MAX_RESTART_ATTEMPTS = 5;
  
  // 누적되지 않도록 변경
  let interimTranscript = '';
  let lastInterimTime = 0;
  const INTERIM_UPDATE_INTERVAL = 300;

  recognition.onstart = () => {
    isRecognitionActive = true;
    restartAttempts = 0; // 성공적으로 시작되면 재시도 카운터 초기화
    console.log('음성 인식이 시작되었습니다.');
  };

  recognition.onresult = (event: any) => {
    const allResults: { text: string, confidence: number }[] = [];
    
    // 현재 세션의 트랜스크립트만 처리
    let currentTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      for (let j = 0; j < event.results[i].length; j++) {
        allResults.push({
          text: event.results[i][j].transcript,
          confidence: event.results[i][j].confidence
        });
      }
      
      if (event.results[i].isFinal) {
        const bestResult = allResults
          .sort((a, b) => b.confidence - a.confidence)[0];
        
        // 누적하지 않고 현재 인식된 결과만 사용
        currentTranscript = bestResult.text;
        onTranscript(currentTranscript, true, bestResult.confidence);
        interimTranscript = '';
      } else {
        interimTranscript = allResults.map(r => r.text).join(' ');
        
        const now = Date.now();
        if (now - lastInterimTime > INTERIM_UPDATE_INTERVAL) {
          const highestConfidence = Math.max(...allResults.map(r => r.confidence));
          onTranscript(interimTranscript, false, highestConfidence);
          lastInterimTime = now;
        }
      }
    }
  };

  // 안전한 재시작 함수
  const safelyRestartRecognition = () => {
    if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
      console.warn(`최대 재시도 횟수(${MAX_RESTART_ATTEMPTS}회)에 도달했습니다. 음성 인식을 일시 중지합니다.`);
      setTimeout(() => {
        restartAttempts = 0; // 일정 시간 후 다시 시도할 수 있도록 카운터 초기화
        safelyRestartRecognition();
      }, 2000); // 2초 후 다시 시도
      return;
    }
    
    if (!isRecognitionActive) {
      try {
        restartAttempts++;
        recognition.start();
        console.log(`음성 인식 재시작 시도 (${restartAttempts}/${MAX_RESTART_ATTEMPTS})`);
      } catch (e) {
        console.error('음성 인식 재시작 실패:', e);
        isRecognitionActive = false;
        // 지수 백오프로 재시도 간격 늘리기
        setTimeout(safelyRestartRecognition, 300 * Math.pow(1.5, restartAttempts));
      }
    } else {
      console.log('음성 인식이 이미 활성화되어 있어 재시작하지 않습니다.');
    }
  };

  recognition.onerror = (event: any) => {
    console.error('음성 인식 오류:', event.error);
    
    // 오류 발생 시 상태 업데이트
    if (event.error === 'aborted' || event.error === 'network') {
      isRecognitionActive = false;
    }
    
    // 오류 메시지 표시
    if (event.error === 'not-allowed') {
      onTranscript('(마이크 접근이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요)', true, 1.0);
    } else if (event.error === 'audio-capture') {
      onTranscript('(마이크를 찾을 수 없습니다. 연결 상태를 확인해주세요)', true, 1.0);
    } else if (event.error === 'network') {
      onTranscript('(네트워크 오류. 인터넷 연결을 확인하세요)', true, 1.0);
    }
    
    // 특정 오류에 대해서만 재시작 시도
    if (event.error === 'network' || event.error === 'aborted') {
      setTimeout(() => safelyRestartRecognition(), 1000);
    }
  };

  recognition.onend = () => {
    console.log('음성 인식이 종료되었습니다.');
    isRecognitionActive = false;
    
    // 마지막 중간 결과 전송
    if (interimTranscript && Date.now() - lastInterimTime > INTERIM_UPDATE_INTERVAL) {
      onTranscript(interimTranscript, false, 0.5);
    }
    
    // 안전한 재시작 로직
    setTimeout(() => safelyRestartRecognition(), 500);
  };

  // 처음 시작
  try {
    recognition.start();
    console.log('음성 인식이 시작되었습니다.');
  } catch (e) {
    console.error('음성 인식 시작 실패:', e);
    isRecognitionActive = false;
    setTimeout(() => safelyRestartRecognition(), 1000);
  }

  // 중지 함수
  return () => {
    try {
      if (isRecognitionActive) {
        recognition.stop();
        isRecognitionActive = false;
      }
    } catch (e) {
      console.error('음성 인식 중지 실패:', e);
    }
  };
};

