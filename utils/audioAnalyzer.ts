// audioAnalyzer.ts

import { startSpeechRecognition } from "./speechRecognizer"; // 경로 확인 필요
import { analyzeKeywords, resetKeywordTracker } from "./keywordAnalyzer"; // 경로 확인 필요
import { saveKeyword } from "./saveKeyword"; // 경로 확인 필요
import { Keyword } from '../types'; // 경로 확인 필요
import { invalidateKeywordsCache } from "./fetchKeywords"; // 경로 확인 필요

// --- 전역 Window 타입 확장 ---
declare global {
  interface Window {
    isNativeApp?: boolean; // 네이티브 앱인지 여부 (네이티브에서 주입)
    _lastVolumeLogTime?: number; // 웹 환경 볼륨 로깅용 (선택적)
    ReactNativeWebView?: { // 네이티브와 통신을 위한 WebView 객체
      postMessage: (message: string) => void;
    };
    // 네이티브로부터 볼륨 업데이트를 받기 위한 핸들러
    handleNativeVolumeUpdate?: (volume: number) => void;
    // 네이티브 음성 인식 결과를 직접 받는 핸들러 (speechRecognizer.ts 에서 사용될 수 있음)
    // speechRecognizer.ts의 구현에 따라 이 부분이 필요할 수도, 아닐 수도 있습니다.
    // handleNativeSpeechResult?: (transcript: string, isFinal: boolean, confidence: number) => void;
  }
}

// --- 모듈 스코프 변수 ---
let isAnalyzing = false; // 현재 오디오 분석 중인지 상태 플래그
let stopRecognitionFunc: (() => void) | null = null; // 음성 인식 중지 함수 참조
let processedKeywords = new Map<string, number>(); // 최근 처리된 키워드와 처리 시간 (중복 감지 방지용)
const KEYWORD_REDETECTION_INTERVAL = 3 * 1000; // 동일 키워드 재인식까지 최소 간격 (3초)
let cleanupOldKeywordsInterval: NodeJS.Timeout | null = null; // 오래된 processedKeywords 정리용 인터벌 ID

const TRANSCRIPT_RESET_TIMEOUT = 3 * 1000; // 새 음성 입력 없을 시 트랜스크립트 UI 초기화 대기 시간 (3초)

// --- 오래된 키워드 기록 정리 함수 (processedKeywords Map 정리) ---
const cleanupOldProcessedKeywords = () => {
  const now = Date.now();
  const KEYWORD_CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5분 이상 지난 키워드 기록 제거
  processedKeywords.forEach((timestamp, keyword) => {
    if (now - timestamp > KEYWORD_CACHE_EXPIRY_MS) {
      // console.log(`[AudioAnalyzer] 오래된 처리 기록 키워드 제거: ${keyword}`);
      processedKeywords.delete(keyword);
    }
  });
};

// --- 메인 오디오 분석 함수 ---
export const startAudioAnalysis = async (
  userId: string,
  onVolumeUpdate: (volume: number) => void, // 볼륨 변경 시 호출될 콜백
  onTranscriptUpdate: (transcript: string) => void, // 음성 인식 텍스트 변경 시 호출될 콜백
  onKeywordsUpdate: (keywords: string[]) => void, // 감지된 키워드 변경 시 호출될 콜백
  onKeywordSaved?: (keyword: Keyword) => void // 키워드 저장 성공 시 호출될 콜백 (선택적)
): Promise<() => void> => {
  // console.log(`%c[AudioAnalyzer] +++ startAudioAnalysis 호출 (User: ${userId}, isNativeApp: ${!!window.isNativeApp})`, 'background: #222; color: #bada55');

  if (isAnalyzing) {
    // console.warn("[AudioAnalyzer] 오디오 분석이 이미 실행 중입니다. 요청 무시.");
    return () => { /* console.log("[AudioAnalyzer] 이미 실행 중, 빈 cleanup 반환"); */ };
  }

  if (!userId) {
    // console.error("[AudioAnalyzer] 오디오 분석을 시작하려면 사용자 ID가 필요합니다.");
    throw new Error("사용자 ID가 필요합니다.");
  }

  isAnalyzing = true;
  // console.log(`%c[AudioAnalyzer] +++ isAnalyzing 플래그 설정: true`, 'background: #222; color: #bada55; font-weight: bold;');

  processedKeywords.clear(); // 분석 시작 시 이전 키워드 처리 기록 초기화
  resetKeywordTracker(); // keywordAnalyzer 내부 상태(단어 빈도 등) 초기화

  // 주기적으로 오래된 키워드 기록 정리 (이미 실행 중이면 중지 후 재시작)
  if (cleanupOldKeywordsInterval) clearInterval(cleanupOldKeywordsInterval);
  cleanupOldKeywordsInterval = setInterval(cleanupOldProcessedKeywords, 60 * 1000); // 1분마다 실행

  // --- 공통 음성 인식 결과 처리 핸들러 (웹/네이티브) ---
  let transcriptResetTimer: NodeJS.Timeout | null = null; // 트랜스크립트 UI 자동 초기화 타이머 ID

  const commonSpeechResultHandler = async (transcript: string, isFinal: boolean, confidence: number) => {
    // console.log(`[AudioAnalyzer] commonSpeechResultHandler: isFinal=${isFinal}, conf=${confidence?.toFixed(2)}, text="${transcript}"`);

    if (transcriptResetTimer) clearTimeout(transcriptResetTimer); // 이전 타이머 취소

    if (transcript.trim()) { // 내용이 있는 트랜스크립트인 경우
      onTranscriptUpdate(transcript); // UI에 트랜스크립트 업데이트
      // console.log(`[AudioAnalyzer] onTranscriptUpdate 호출: "${transcript}"`);

      // 새 음성이 들어왔으므로, 일정 시간 후 UI 초기화를 위한 타이머 재설정
      transcriptResetTimer = setTimeout(() => {
        // console.log("[AudioAnalyzer] 트랜스크립트 리셋 타이머 만료. UI 초기화.");
        onTranscriptUpdate(""); // 트랜스크립트 UI 초기화
        onKeywordsUpdate([]); // 키워드 UI도 함께 초기화
        transcriptResetTimer = null;
      }, TRANSCRIPT_RESET_TIMEOUT);

      // 키워드 분석 로직 (isFinal 결과 또는 신뢰도 높은 중간 결과에 대해 수행)
      const detectedKeywords = analyzeKeywords(transcript, isFinal, confidence);

      if (detectedKeywords.length > 0) {
        const now = Date.now();
        // KEYWORD_REDETECTION_INTERVAL 내에 다시 감지되지 않은 "새로운" 키워드만 필터링
        const newKeywordsToProcess = detectedKeywords.filter(
          (kw) =>
            !processedKeywords.has(kw) || // 이전에 처리된 적이 없거나
            now - (processedKeywords.get(kw) || 0) > KEYWORD_REDETECTION_INTERVAL, // 또는 재탐지 간격이 지났거나
        );

        if (newKeywordsToProcess.length > 0) {
          // console.log("[AudioAnalyzer] 새로 처리할 키워드:", newKeywordsToProcess);
          onKeywordsUpdate(newKeywordsToProcess); // UI에 새로운 키워드 목록 업데이트

          for (const kw of newKeywordsToProcess) {
            try {
              const savedKeyword = await saveKeyword(kw, userId); // 키워드 저장 시도
              if (savedKeyword) {
                // console.log(`[AudioAnalyzer] 키워드 '${kw}' 저장 성공`);
                processedKeywords.set(kw, Date.now()); // 재탐지 방지를 위해 처리 시간 기록
                if (onKeywordSaved) onKeywordSaved(savedKeyword); // 저장 성공 콜백 호출
              }
            } catch (e) {
              console.error(`[AudioAnalyzer] 키워드 '${kw}' 저장 오류:`, e);
            }
          }
          invalidateKeywordsCache(userId); // 키워드 저장 작업 후 관련 캐시 무효화
        }
      }
    } else { // 빈 트랜스크립트 수신 시 (초기화 목적 등)
      // console.log('[AudioAnalyzer] 빈 트랜스크립트 수신. UI 즉시 초기화.');
      onTranscriptUpdate(''); // 👈 이 부분이 호출되어 UI의 트랜스크립트가 지워집니다.
      onKeywordsUpdate([]);   // 👈 감지된 키워드 UI도 함께 초기화됩니다.
      if (transcriptResetTimer) { // 혹시 모를 타이머도 정리
        clearTimeout(transcriptResetTimer);
        transcriptResetTimer = null;
      }
    }
  };

  // ====================================================================
  // ===== 네이티브 앱 환경 분기 (window.isNativeApp 플래그 사용) =====
  // ====================================================================
  if (window.isNativeApp) {
    console.log('[AudioAnalyzer] NativeApp 모드 실행');

    // 1. 네이티브 음성 인식 시작 (speechRecognizer.ts 내부에서 네이티브 STT 연동 처리)
    //    commonSpeechResultHandler를 콜백으로 전달
    stopRecognitionFunc = startSpeechRecognition(commonSpeechResultHandler);

    // 2. 네이티브로부터 볼륨 값을 받기 위한 핸들러를 window 객체에 설정
    //    네이티브 App.tsx에서는 webviewRef.injectJavaScript(`window.handleNativeVolumeUpdate(${측정된볼륨값});`) 형태로 이 함수를 호출
    window.handleNativeVolumeUpdate = (volumeFromNative: number) => {
      // console.log('[AudioAnalyzer Native] 네이티브로부터 볼륨 수신:', volumeFromNative);
      onVolumeUpdate(volumeFromNative); // 수신된 볼륨 값으로 UI 업데이트 콜백 호출
    };

    // 3. (선택적이지만 권장) 네이티브 앱에 볼륨 업데이트 시작 요청 메시지 전송
    //    App.tsx의 handleMessage 함수에서 이 메시지를 받아 네이티브 볼륨 측정을 시작해야 함.
    if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
      // console.log('[AudioAnalyzer Native] 네이티브에 START_VOLUME_UPDATES 메시지 전송');
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'START_VOLUME_UPDATES' }));
    }

    // --- 네이티브 환경 Cleanup 함수 반환 ---
    return () => {
      // console.log(`%c[AudioAnalyzer Native] --- Cleanup 시작 ---`, 'background: #222; color: #ff5733; font-weight: bold;');
      isAnalyzing = false;
      // console.log(`%c[AudioAnalyzer Native] --- isAnalyzing 플래그 설정: false`, 'background: #222; color: #ff5733; font-weight: bold;');

      if (stopRecognitionFunc) { // 음성 인식 중지
        // console.log('[AudioAnalyzer Native] 음성 인식 중지 함수 호출');
        try { stopRecognitionFunc(); } catch (e) { console.error("[AudioAnalyzer Native] 음성 인식 중지 중 오류:", e); }
        stopRecognitionFunc = null;
      }
      if (transcriptResetTimer) { // 트랜스크립트 초기화 타이머 제거
        // console.log('[AudioAnalyzer Native] 트랜스크립트 리셋 타이머 제거');
        clearTimeout(transcriptResetTimer);
        transcriptResetTimer = null;
      }
      if (cleanupOldKeywordsInterval) { // 오래된 키워드 정리 인터벌 중지
        // console.log('[AudioAnalyzer Native] 오래된 키워드 정리 인터벌 중지');
        clearInterval(cleanupOldKeywordsInterval);
        cleanupOldKeywordsInterval = null;
      }

      // (선택적이지만 권장) 네이티브 앱에 볼륨 업데이트 중지 요청 메시지 전송
      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        // console.log('[AudioAnalyzer Native] 네이티브에 STOP_VOLUME_UPDATES 메시지 전송');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STOP_VOLUME_UPDATES' }));
      }
      window.handleNativeVolumeUpdate = undefined; // 등록한 핸들러 정리
      // console.log(`%c[AudioAnalyzer Native] --- Cleanup 완료 ---`, 'background: #222; color: #ff5733; font-weight: bold;');
    };
  }
  // ====================================================================
  // ===== 웹 브라우저 환경 분기 (window.isNativeApp이 false 또는 undefined) =====
  // ====================================================================
  else {
    console.log('[AudioAnalyzer] Web 모드 실행');
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let animationFrameId: number | null = null; // requestAnimationFrame ID (볼륨 계산 루프용)

    // 웹 환경용 침묵 감지 변수 (선택적: commonSpeechResultHandler의 타이머로도 어느 정도 커버됨)
    let silenceTimerValueWeb = 0;
    let lastVoiceTimeWeb = Date.now();
    const SILENCE_THRESHOLD_WEB = 15; // 웹용 침묵 감지 볼륨 임계값

    try {
      // console.log("[AudioAnalyzer Web] 마이크 접근 시도 (getUserMedia)");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // console.log("[AudioAnalyzer Web] 마이크 접근 성공");

      // console.log("[AudioAnalyzer Web] AudioContext 생성 시도");
      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      let analyserNode: AnalyserNode;

      try { // 고급 필터 적용 시도
        // console.log("[AudioAnalyzer Web] 오디오 필터 및 AnalyserNode 생성 시도 (고급)");
        const lowPassFilter = audioContext.createBiquadFilter();
        lowPassFilter.type = "lowpass"; lowPassFilter.frequency.value = 8000;
        const highPassFilter = audioContext.createBiquadFilter();
        highPassFilter.type = "highpass"; highPassFilter.frequency.value = 85;
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.75; // 감도 조절
        source.connect(highPassFilter).connect(lowPassFilter).connect(gainNode);
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 512; analyserNode.smoothingTimeConstant = 0.6;
        gainNode.connect(analyserNode);
        // console.log("[AudioAnalyzer Web] 고급 필터 및 AnalyserNode 생성 성공");
      } catch (filterError) {
        // console.warn("[AudioAnalyzer Web] 고급 필터링 실패, 기본 AnalyserNode 사용:", filterError);
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 512;
        source.connect(analyserNode);
      }

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // console.log("[AudioAnalyzer Web] startSpeechRecognition 호출 시도");
      // commonSpeechResultHandler를 콜백으로 전달
      stopRecognitionFunc = startSpeechRecognition(commonSpeechResultHandler);
      // console.log("[AudioAnalyzer Web] startSpeechRecognition 호출 완료");

      // 볼륨 계산 및 웹 전용 침묵 감지 루프
      const calculateVolumeAndDetectSilenceWeb = () => {
        if (!isAnalyzing) { // 분석 중지 시 루프 종료
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
          return;
        }

        analyserNode.getByteFrequencyData(dataArray); // 주파수 데이터 가져오기
        let totalSum = 0;
        for (let i = 0; i < bufferLength; i++) totalSum += dataArray[i];
        const currentVolume = totalSum / bufferLength; // 평균 볼륨 계산
        onVolumeUpdate(currentVolume); // 볼륨 UI 업데이트 콜백 호출

        // 웹 환경용 침묵 감지 로직 (선택적)
        if (currentVolume > SILENCE_THRESHOLD_WEB) {
          lastVoiceTimeWeb = Date.now();
          silenceTimerValueWeb = 0;
        } else {
          silenceTimerValueWeb = Date.now() - lastVoiceTimeWeb;
        }

        // 일정 시간 이상 침묵 지속 시 (웹 전용)
        if (silenceTimerValueWeb > TRANSCRIPT_RESET_TIMEOUT) {
          // commonSpeechResultHandler의 타이머가 이미 트랜스크립트를 초기화했을 수 있음
          // 중복 호출을 피하거나, 여기서 더 명시적인 초기화가 필요하다면 추가 로직 구현
          // 예를 들어, 현재 트랜스크립트가 비어있지 않을 때만 초기화
          // if (/* 현재 onTranscriptUpdate로 전달된 트랜스크립트가 비어있지 않다면 */) {
          //   console.log("[AudioAnalyzer Web] 웹 침묵 감지: 트랜스크립트/키워드 초기화 (보조)");
          //   onTranscriptUpdate("");
          //   onKeywordsUpdate([]);
          // }
        }
        animationFrameId = requestAnimationFrame(calculateVolumeAndDetectSilenceWeb); // 다음 프레임에 루프 계속
      };
      // console.log(`%c[AudioAnalyzer Web] calculateVolumeAndDetectSilenceWeb 루프 시작`, 'background: #222; color: #bada55');
      calculateVolumeAndDetectSilenceWeb(); // 볼륨 계산 루프 시작

      // --- 웹 환경 Cleanup 함수 반환 ---
      return () => {
        // console.log(`%c[AudioAnalyzer Web] --- Cleanup 시작 ---`, 'background: #222; color: #ff5733; font-weight: bold;');
        isAnalyzing = false;
        // console.log(`%c[AudioAnalyzer Web] --- isAnalyzing 플래그 설정: false`, 'background: #222; color: #ff5733; font-weight: bold;');

        if (animationFrameId) { /* console.log("[AudioAnalyzer Web] calculateVolume 루프 정지"); */ cancelAnimationFrame(animationFrameId); animationFrameId = null; }
        if (stopRecognitionFunc) { /* console.log("[AudioAnalyzer Web] 음성 인식 중지 함수 호출"); */ try { stopRecognitionFunc(); } catch (e) { console.error("[AudioAnalyzer Web] 음성 인식 중지 중 오류:", e); } stopRecognitionFunc = null; }
        if (transcriptResetTimer) { /* console.log("[AudioAnalyzer Web] 트랜스크립트 리셋 타이머 제거"); */ clearTimeout(transcriptResetTimer); transcriptResetTimer = null; }
        if (cleanupOldKeywordsInterval) { /* console.log("[AudioAnalyzer Web] 오래된 키워드 정리 인터벌 중지"); */ clearInterval(cleanupOldKeywordsInterval); cleanupOldKeywordsInterval = null; }

        if (stream) { // 미디어 스트림 트랙 중지
          // console.log("[AudioAnalyzer Web] 미디어 스트림 트랙 중지");
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
        if (audioContext) { // AudioContext 종료
          // console.log("[AudioAnalyzer Web] AudioContext 종료");
          if (audioContext.state !== "closed") {
            audioContext.close().catch(e => console.error("[AudioAnalyzer Web] AudioContext 종료 중 오류:", e));
          }
          audioContext = null;
        }
        // console.log(`%c[AudioAnalyzer Web] --- Cleanup 완료 ---`, 'background: #222; color: #ff5733; font-weight: bold;');
      };

    } catch (error) { // 웹 환경 초기화 중 오류 발생 시
      console.error("[AudioAnalyzer Web] startAudioAnalysis 웹 환경 메인 로직 오류:", error);
      isAnalyzing = false; // 분석 상태 플래그 해제
      // console.log(`%c[AudioAnalyzer Web] +++ 오류 발생으로 isAnalyzing 플래그 설정: false`, 'background: #222; color: red; font-weight: bold;');

      // 이미 할당된 자원들 정리
      if (stopRecognitionFunc) { try { stopRecognitionFunc(); } catch (e) {} } // 이미 stopRecognitionFunc이 할당되었다면 호출
      if (transcriptResetTimer) clearTimeout(transcriptResetTimer);
      if (cleanupOldKeywordsInterval) clearInterval(cleanupOldKeywordsInterval);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (audioContext && audioContext.state !== "closed") audioContext.close().catch(e => {});
      
      throw error; // 오류를 다시 던져서 상위 호출자에게 알림
    }
  }
};