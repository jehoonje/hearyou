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
  recognition.continuous = true; // 계속 인식
  recognition.interimResults = true; // 중간 결과 받기
  recognition.maxAlternatives = 1; // 가장 높은 확률의 결과만 사용 (필요시 조절)

  let isRecognitionActive = false; // 현재 인식 중인지 상태
  let restartAttempts = 0; // 재시작 시도 횟수
  const MAX_RESTART_ATTEMPTS = 5; // 최대 재시작 횟수
  let stopCalledIntentionally = false; // 사용자가 명시적으로 stop을 호출했는지 여부
  let restartTimer: ReturnType<typeof setTimeout> | null = null; // 재시작 타이머 핸들

  // 중간 결과 처리 관련 변수 (이전 코드와 동일)
  let interimTranscript = '';
  let lastInterimTime = 0;
  const INTERIM_UPDATE_INTERVAL = 300; // 중간 결과 업데이트 간격 (ms)

  // --- 인식 중지 함수 ---
  const stopRecognition = () => {
    // 타이머가 예약되어 있다면 취소
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    // 인식이 활성화 상태일 때만 stop 호출
    if (isRecognitionActive && recognition) {
      console.log('음성 인식 명시적 중지 요청 (stopRecognition 호출됨)');
      stopCalledIntentionally = true; // 의도적 중지 플래그 설정
      try {
        recognition.stop(); // 실제 중지. onend 이벤트 트리거됨.
      } catch (e) {
        console.error('recognition.stop() 호출 중 오류:', e);
        isRecognitionActive = false; // 오류 발생 시 상태 강제 업데이트
      }
    } else {
      // 이미 비활성화 상태면 플래그만 설정
      isRecognitionActive = false;
    }
  };

  // --- 안전한 재시작 함수 ---
  const safelyRestartRecognition = () => {
    if (restartTimer) clearTimeout(restartTimer);

    // 의도적으로 중지되었거나, 탭이 숨겨져 있거나, 이미 활성 상태면 재시작 안 함
    if (stopCalledIntentionally || document.hidden || isRecognitionActive) {
      // console.log( /* ... 재시작 안 함 로그 ... */ );
      // 재시작 안 할 때 상태 확실히 업데이트 (이미 false일 가능성 높음)
      isRecognitionActive = false;
      return;
    }

    if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
      console.warn(`[SpeechRecognizer] 최대 재시도(${MAX_RESTART_ATTEMPTS}회) 도달. 5초 후 재시도.`);
      restartTimer = setTimeout(() => {
        restartAttempts = 0;
        safelyRestartRecognition();
      }, 5000);
      return;
    }

    // 재시작 시도
    try {
      restartAttempts++;
      console.log(`[SpeechRecognizer] 음성 인식 재시작 시도 (${restartAttempts}/${MAX_RESTART_ATTEMPTS})`);

      // <<<--- 여기를 try...catch로 감쌉니다 ---<<<
      try {
        // recognition 상태를 명시적으로 확인 (추가적인 방어)
        // Note: 실제 SpeechRecognition 객체의 상태를 직접 읽는 표준 API는 없습니다.
        // isRecognitionActive 플래그에 의존합니다.
        if (!isRecognitionActive) { // isRecognitionActive가 false일 때만 시작 시도
           recognition.start(); // 여기서 onstart 호출 기대
        } else {
            console.warn("[SpeechRecognizer] safelyRestartRecognition: isRecognitionActive가 이미 true여서 start() 호출 건너<0xEB>.");
        }
      } catch (startError: any) {
        // 이미 시작된 상태에서 start()를 호출하면 InvalidStateError 발생
        if (startError.name === 'InvalidStateError') {
          console.warn('[SpeechRecognizer] recognition.start() 오류: 이미 시작된 상태입니다. (InvalidStateError)');
          // 이 경우, 인식은 이미 활성 상태일 수 있으므로 isRecognitionActive를 true로 설정 시도
          isRecognitionActive = true;
          // 재시도 로직을 즉시 타지 않고, 다음 onend/onerror를 기다리거나 현재 상태 유지
          // restartAttempts--; // 재시도 횟수 복원 (선택적)
          // 바로 재시도하지 않음
          return; // 함수 종료
        } else {
          // 다른 종류의 시작 오류는 그대로 로깅 및 재시도 로직으로 전달
          console.error('[SpeechRecognizer] recognition.start() 즉시 오류 (InvalidStateError 외):', startError);
          isRecognitionActive = false; // 시작 실패
          throw startError; // 에러를 다시 던져서 아래 catch 블록에서 잡도록 함
        }
      }
      // <<<--- try...catch 끝 ---<<<

    } catch (e: any) { // 여기서 startError를 잡음 (InvalidStateError 외)
      // 시작 실패 시 상태 업데이트 (onerror에서도 처리될 수 있음)
      isRecognitionActive = false;
      // 오류 발생 시 잠시 후 다시 재시도 (지수 백오프)
      const delay = 300 * Math.pow(1.5, restartAttempts);
      console.log(`[SpeechRecognizer] 다음 재시도 대기: ${delay}ms`);
      restartTimer = setTimeout(safelyRestartRecognition, delay);
    }
  };

  // --- 이벤트 핸들러들 ---
  recognition.onstart = () => {
    console.log('음성 인식이 시작되었습니다.');
    isRecognitionActive = true;
    restartAttempts = 0; // 성공적 시작 시 재시도 횟수 초기화
    stopCalledIntentionally = false; // 의도적 중지 플래그 초기화
  };

  recognition.onresult = (event: any) => {
    console.log('[SpeechRecognizer] onresult 이벤트 발생!', event); // <<< 이벤트 발생 자체 확인 로그
  
    let currentInterim = '';
    let finalTranscript = ''; // 최종 결과 저장용 변수 추가
  
    // 결과 데이터 유효성 확인
    if (!event.results || event.results.length === 0) {
      console.warn('[SpeechRecognizer] onresult: 유효한 결과 데이터 없음');
      return;
    }
  
    console.log(`[SpeechRecognizer] onresult: results 길이=<span class="math-inline">\{event\.results\.length\}, resultIndex\=</span>{event.resultIndex}`);
  
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      // 결과 객체 및 첫번째 대안 유효성 검사
      if (!event.results[i] || !event.results[i][0]) {
         console.warn(`[SpeechRecognizer] onresult: 유효하지 않은 결과 객체 또는 대안 (index: ${i})`);
         continue; // 다음 결과로 넘어감
      }
  
      const resultAlternative = event.results[i][0];
      const transcriptPiece = resultAlternative.transcript;
      const confidence = resultAlternative.confidence;
  
      console.log(`[SpeechRecognizer] onresult loop (i=<span class="math-inline">\{i\}\)\: isFinal\=</span>{event.results[i].isFinal}, transcript="<span class="math-inline">\{transcriptPiece\}", confidence\=</span>{confidence}`); // <<< 루프 내부 로그
  
      if (event.results[i].isFinal) {
        finalTranscript += transcriptPiece; // 최종 결과 누적 (띄어쓰기 등 고려 필요 시 로직 추가)
        console.log(`[SpeechRecognizer] 최종 결과 조각 발견: "${transcriptPiece}", 신뢰도: ${confidence}`);
        // 최종 결과 콜백 호출 (루프 종료 후 한 번만 호출하도록 변경 가능)
        // onTranscript(finalTranscript, true, confidence); // 여기서 바로 호출하거나
      } else {
        currentInterim += transcriptPiece;
      }
    }
  
    // 최종 결과가 있었다면 루프 종료 후 한 번만 콜백 (더 안정적)
    if (finalTranscript) {
      console.log(`[SpeechRecognizer] 최종 결과 콜백 호출: "${finalTranscript}"`);
      onTranscript(finalTranscript, true, event.results[event.results.length - 1][0].confidence); // 마지막 결과의 신뢰도 사용
      interimTranscript = ''; // 최종 결과 나왔으니 중간 결과 초기화
    }
    // 중간 결과 업데이트 (기존 로직 유지)
    else if (currentInterim) {
      interimTranscript = currentInterim;
      const now = Date.now();
      if (now - lastInterimTime > INTERIM_UPDATE_INTERVAL) {
         console.log(`[SpeechRecognizer] 중간 결과 콜백 호출: "${interimTranscript}"`);
         onTranscript(interimTranscript, false, 0.5); // 중간 결과 신뢰도는 0.5로 가정
         lastInterimTime = now;
      }
    }

  recognition.onerror = (event: any) => {
    console.error('[SpeechRecognizer] onerror 이벤트 발생:', event.error, event.message);
    const error = event.error;
    isRecognitionActive = false; // 오류 발생 시 일단 비활성화

    // 사용자에게 피드백 줄 수 있는 오류 처리
    if (error === 'not-allowed' || error === 'service-not-allowed') {
      onTranscript('(마이크 접근이 거부되었습니다. 브라우저 설정 확인)', true, 1.0);
      stopCalledIntentionally = true; // 권한 오류는 재시도 의미 없음
    } else if (error === 'audio-capture') {
      onTranscript('(마이크를 찾을 수 없습니다. 연결 확인)', true, 1.0);
      stopCalledIntentionally = true; // 하드웨어 오류는 재시도 의미 없음
    } else if (error === 'network') {
      onTranscript('(네트워크 오류. 인터넷 연결 확인)', true, 1.0);
      // 네트워크 오류는 onend 핸들러에서 재시도 로직 탈 수 있도록 둠
    } else if (error === 'aborted') {
      console.log(`인식 중단됨(aborted). 의도적 중지: ${stopCalledIntentionally}, 탭 숨김: ${document.hidden}`);
      // 'aborted'는 stop() 호출, 탭 전환, 네트워크 문제 등 다양하게 발생 가능.
      // 재시작 로직은 onend에서 처리하도록 유도.
    } else if (error === 'no-speech') {
      console.log('음성 감지되지 않음(no-speech).');
      // onend에서 재시작 로직 탈 수 있도록 둠
    } else {
      onTranscript(`(음성 인식 오류: ${error})`, true, 1.0);
    }
     // onerror에서 직접 재시작 호출 제거 -> onend 에서 조건부 재시작
  };

  recognition.onend = () => {
    console.log(`[SpeechRecognizer] onend 이벤트 발생. 상태: ${isRecognitionActive ? '활성':'비활성'}, 의도적중지: ${stopCalledIntentionally}, 탭숨김: ${document.hidden}`);
    // onend는 stop(), 오류 발생, 정상 종료 등 다양한 경우에 호출됨
    isRecognitionActive = false; // onend 호출 시 무조건 비활성 상태로 간주

    // 의도적으로 중지했거나 탭이 숨겨진 상태가 아니면 재시작 시도
    if (!stopCalledIntentionally && !document.hidden) {
      console.log('onend: 자동 재시작 예약');
      // 약간의 딜레이 후 재시작
      restartTimer = setTimeout(safelyRestartRecognition, 500);
    } else {
      console.log('onend: 자동 재시작 안 함');
      // 의도적으로 중지된 플래그는 리셋해줘야 나중에 다시 시작 가능
      if (stopCalledIntentionally) {
          stopCalledIntentionally = false;
      }
    }
  };

  // --- Page Visibility API 핸들러 ---
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // 탭이 숨겨지면 명시적으로 중지 시도
      console.log('탭 비활성화 감지됨. 음성 인식 중지 시도.');
      stopRecognition();
    } else {
      // 탭이 다시 활성화되면 재시작 시도 (이미 실행중이지 않다면)
      console.log('탭 활성화 감지됨. 음성 인식 재시작 시도.');
      // stopCalledIntentionally 플래그가 true일 수 있으므로 재시작 전 false로 설정
      stopCalledIntentionally = false;
      safelyRestartRecognition(); // 내부적으로 isRecognitionActive 체크함
    }
  };
  // 이벤트 리스너 등록
  document.addEventListener('visibilitychange', handleVisibilityChange);
  // --- Page Visibility API 핸들러 끝 ---

  // --- 초기 시작 ---
  console.log('음성 인식 초기 시작 시도');
  safelyRestartRecognition(); // 바로 시작하지 않고 안전 재시작 함수 통해 시작

  // --- 클린업 함수 반환 ---
  // 이 함수는 컴포넌트 언마운트 시 또는 외부에서 중지 필요 시 호출됨
  return () => {
    console.log('Cleanup: 음성 인식 중지 및 visibility 리스너 제거');
    // 이벤트 리스너 제거
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    // 예약된 재시작 타이머 제거
    if (restartTimer) clearTimeout(restartTimer);
    // 명시적으로 인식 중지
    stopRecognition();
  };
};

  recognition.onerror = (event: any) => {
    console.error('음성 인식 오류 발생:', event.error);
    const error = event.error;
    isRecognitionActive = false; // 오류 발생 시 일단 비활성화

    // 사용자에게 피드백 줄 수 있는 오류 처리
    if (error === 'not-allowed' || error === 'service-not-allowed') {
      onTranscript('(마이크 접근이 거부되었습니다. 브라우저 설정 확인)', true, 1.0);
      stopCalledIntentionally = true; // 권한 오류는 재시도 의미 없음
    } else if (error === 'audio-capture') {
      onTranscript('(마이크를 찾을 수 없습니다. 연결 확인)', true, 1.0);
      stopCalledIntentionally = true; // 하드웨어 오류는 재시도 의미 없음
    } else if (error === 'network') {
      onTranscript('(네트워크 오류. 인터넷 연결 확인)', true, 1.0);
      // 네트워크 오류는 onend 핸들러에서 재시도 로직 탈 수 있도록 둠
    } else if (error === 'aborted') {
      console.log(`인식 중단됨(aborted). 의도적 중지: ${stopCalledIntentionally}, 탭 숨김: ${document.hidden}`);
      // 'aborted'는 stop() 호출, 탭 전환, 네트워크 문제 등 다양하게 발생 가능.
      // 재시작 로직은 onend에서 처리하도록 유도.
    } else if (error === 'no-speech') {
      console.log('음성 감지되지 않음(no-speech).');
      // onend에서 재시작 로직 탈 수 있도록 둠
    } else {
      onTranscript(`(음성 인식 오류: ${error})`, true, 1.0);
    }
     // onerror에서 직접 재시작 호출 제거 -> onend 에서 조건부 재시작
  };

  recognition.onend = () => {
    console.log(`음성 인식이 종료됨. 상태: ${isRecognitionActive ? '활성' : '비활성'}, 의도적 중지: ${stopCalledIntentionally}, 탭 숨김: ${document.hidden}`);
    // onend는 stop(), 오류 발생, 정상 종료 등 다양한 경우에 호출됨
    isRecognitionActive = false; // onend 호출 시 무조건 비활성 상태로 간주

    // 의도적으로 중지했거나 탭이 숨겨진 상태가 아니면 재시작 시도
    if (!stopCalledIntentionally && !document.hidden) {
      console.log('onend: 자동 재시작 예약');
      // 약간의 딜레이 후 재시작
      restartTimer = setTimeout(safelyRestartRecognition, 500);
    } else {
      console.log('onend: 자동 재시작 안 함');
      // 의도적으로 중지된 플래그는 리셋해줘야 나중에 다시 시작 가능
      if (stopCalledIntentionally) {
          stopCalledIntentionally = false;
      }
    }
  };

  // --- Page Visibility API 핸들러 ---
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // 탭이 숨겨지면 명시적으로 중지 시도
      console.log('탭 비활성화 감지됨. 음성 인식 중지 시도.');
      stopRecognition();
    } else {
      // 탭이 다시 활성화되면 재시작 시도 (이미 실행중이지 않다면)
      console.log('탭 활성화 감지됨. 음성 인식 재시작 시도.');
      // stopCalledIntentionally 플래그가 true일 수 있으므로 재시작 전 false로 설정
      stopCalledIntentionally = false;
      safelyRestartRecognition(); // 내부적으로 isRecognitionActive 체크함
    }
  };
  // 이벤트 리스너 등록
  document.addEventListener('visibilitychange', handleVisibilityChange);
  // --- Page Visibility API 핸들러 끝 ---

  // --- 초기 시작 ---
  console.log('음성 인식 초기 시작 시도');
  safelyRestartRecognition(); // 바로 시작하지 않고 안전 재시작 함수 통해 시작

  // --- 클린업 함수 반환 ---
  // 이 함수는 컴포넌트 언마운트 시 또는 외부에서 중지 필요 시 호출됨
  return () => {
    console.log('Cleanup: 음성 인식 중지 및 visibility 리스너 제거');
    // 이벤트 리스너 제거
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    // 예약된 재시작 타이머 제거
    if (restartTimer) clearTimeout(restartTimer);
    // 명시적으로 인식 중지
    stopRecognition();
  };
};