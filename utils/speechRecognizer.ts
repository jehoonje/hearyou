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
    if (restartTimer) clearTimeout(restartTimer); // 기존 재시작 예약 취소

    // 의도적으로 중지되었거나, 탭이 숨겨져 있거나, 이미 활성 상태면 재시작 안 함
    if (stopCalledIntentionally || document.hidden || isRecognitionActive) {
      console.log(
        `음성 인식 재시작 안 함: ${
          stopCalledIntentionally ? '의도적 중지됨' : ''
        } ${document.hidden ? '탭 비활성' : ''} ${
          isRecognitionActive ? '이미 활성 상태' : ''
        }`
      );
      // 재시작 안 할 때 상태 확실히 업데이트
      isRecognitionActive = false;
      return;
    }

    // 최대 재시도 횟수 초과 시
    if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
      console.warn(`최대 재시도(${MAX_RESTART_ATTEMPTS}회) 도달. 5초 후 재시도.`);
      restartTimer = setTimeout(() => {
        restartAttempts = 0; // 재시도 횟수 초기화
        safelyRestartRecognition(); // 5초 후 다시 시도
      }, 5000);
      return;
    }

    // 재시작 시도
    try {
      restartAttempts++;
      console.log(`음성 인식 재시작 시도 (${restartAttempts}/${MAX_RESTART_ATTEMPTS})`);
      recognition.start(); // 여기서 onstart가 호출되어 isRecognitionActive=true 설정됨
    } catch (e: any) {
      // start() 호출 시 즉시 에러 발생하는 경우 (예: 마이크 문제 지속)
      console.error('recognition.start() 즉시 오류:', e);
      isRecognitionActive = false; // 시작 실패 시 상태 업데이트
      // 오류 발생 시 잠시 후 다시 재시도 (지수 백오프)
      const delay = 300 * Math.pow(1.5, restartAttempts);
      console.log(`다음 재시도 대기: ${delay}ms`);
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
    // 중간 결과 처리 (누적되지 않도록)
    let currentInterim = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        // 최종 결과: 가장 확률 높은 것 선택 및 콜백 호출
        const finalTranscript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;
        console.log('최종 결과:', finalTranscript, `(신뢰도: ${confidence})`);
        onTranscript(finalTranscript, true, confidence);
        interimTranscript = ''; // 최종 결과 나왔으니 중간 결과 초기화
      } else {
        // 중간 결과: 이어붙이기
        currentInterim += event.results[i][0].transcript;
      }
    }

    // 현재 인식된 중간 결과 업데이트 (일정 간격으로)
    if (currentInterim) {
      interimTranscript = currentInterim; // 최신 중간 결과로 업데이트
      const now = Date.now();
      if (now - lastInterimTime > INTERIM_UPDATE_INTERVAL) {
         console.log('중간 결과:', interimTranscript);
        // 중간 결과 신뢰도는 보통 제공되지 않거나 부정확하므로 0.5 등으로 처리
        onTranscript(interimTranscript, false, 0.5);
        lastInterimTime = now;
      }
    }
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