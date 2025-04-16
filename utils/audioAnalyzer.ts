import { startSpeechRecognition } from "./speechRecognizer"; // 경로 확인 필요
import { analyzeKeywords, resetKeywordTracker } from "./keywordAnalyzer"; // 경로 확인 필요
import { saveKeyword } from "./saveKeyword"; // 경로 확인 필요
import { Keyword } from '../types'; // 경로 확인 필요
import { invalidateKeywordsCache } from "./fetchKeywords"; // 경로 확인 필요

// (Window 타입 확장 - 필요한 경우 파일 상단 또는 별도 d.ts 파일에 추가)
declare global {
  interface Window {
    _lastVolumeLogTime?: number;
  }
}

// 모듈 스코프 변수
let isAnalyzing = false;
let stopRecognitionFunc: (() => void) | null = null;
let processedKeywords = new Map<string, number>();
const KEYWORD_REDETECTION_INTERVAL = 3 * 1000;
let cleanupInterval: NodeJS.Timeout | null = null;

// 오래된 키워드 정리 함수
const cleanupOldKeywords = () => {
  const now = Date.now();
  const CLEANUP_THRESHOLD = 5 * 60 * 1000;
  processedKeywords.forEach((timestamp, keyword) => {
    if (now - timestamp > CLEANUP_THRESHOLD) {
      console.log(`[audioAnalyzer] 오래된 키워드 제거: ${keyword}`);
      processedKeywords.delete(keyword);
    }
  });
};

export const startAudioAnalysis = async (
  userId: string,
  onVolumeUpdate: (volume: number) => void,
  onTranscriptUpdate: (transcript: string) => void,
  onKeywordsUpdate: (keywords: string[]) => void,
  onKeywordSaved?: (keyword: Keyword) => void
): Promise<() => void> => {
  console.log(`%c[audioAnalyzer] +++ startAudioAnalysis 호출됨 (User: ${userId})`, 'background: #222; color: #bada55');

  if (isAnalyzing) {
    console.warn("[audioAnalyzer] 오디오 분석이 이미 실행 중입니다. 요청 무시.");
    return () => { console.log("[audioAnalyzer] 이미 실행 중이어서 빈 cleanup 반환"); };
  }

  if (!userId) {
    console.error("[audioAnalyzer] 오디오 분석을 시작하려면 사용자 ID가 필요합니다.");
    throw new Error("사용자 ID가 필요합니다.");
  }

  isAnalyzing = true;
  console.log(`%c[audioAnalyzer] +++ isAnalyzing 플래그 설정: ${isAnalyzing}`, 'background: #222; color: #bada55; font-weight: bold;');

  processedKeywords.clear();
  resetKeywordTracker();

  let transcriptResetTimer: NodeJS.Timeout | null = null;
  let silenceTimer = 0;
  let lastVoiceTime = Date.now();
  const SILENCE_THRESHOLD = 15;

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
  cleanupInterval = setInterval(cleanupOldKeywords, 60 * 1000);

  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let animationFrameId: number | null = null;

  try {
    console.log("[audioAnalyzer] 마이크 접근 시도 (getUserMedia)");
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("[audioAnalyzer] 마이크 접근 성공");
    } catch (initialError: any) {
        console.error("[audioAnalyzer] 마이크 접근 실패:", initialError.name, initialError.message);
        if (initialError.name === "NotFoundError") throw new Error("마이크를 찾을 수 없습니다.");
        else if (initialError.name === "NotAllowedError" || initialError.name === "PermissionDeniedError") throw new Error("마이크 접근 권한이 거부되었습니다.");
        else throw new Error(`마이크 접근 중 예상치 못한 오류: ${initialError.message}`);
    }

    console.log("[audioAnalyzer] AudioContext 생성 시도");
    audioContext = new AudioContext();
    console.log("[audioAnalyzer] AudioContext 생성 성공, 상태:", audioContext.state);
    const source = audioContext.createMediaStreamSource(stream);
    let analyser: AnalyserNode;

    try {
        console.log("[audioAnalyzer] 오디오 필터 및 AnalyserNode 생성 시도");
        const lowPassFilter = audioContext.createBiquadFilter();
        lowPassFilter.type = "lowpass"; lowPassFilter.frequency.value = 8000;
        const highPassFilter = audioContext.createBiquadFilter();
        highPassFilter.type = "highpass"; highPassFilter.frequency.value = 85;
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.75; // 감도 조절
        console.log(`[audioAnalyzer] GainNode 설정값: ${gainNode.gain.value}`);
        source.connect(highPassFilter).connect(lowPassFilter).connect(gainNode);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.6;
        gainNode.connect(analyser);
        console.log("[audioAnalyzer] 오디오 필터 및 AnalyserNode 생성 성공");
    } catch (filterError) {
        console.warn("[audioAnalyzer] 고급 필터링 실패, 기본 사용:", filterError);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    console.log("[audioAnalyzer] startSpeechRecognition 호출 시도");
    stopRecognitionFunc = startSpeechRecognition(
      async (transcript, isFinal, confidence) => {
        console.log(`[audioAnalyzer] SpeechRecognizer로부터 데이터 수신: isFinal=${isFinal}, conf=${confidence?.toFixed(2)}, text="${transcript}"`);
        if (transcript.trim() !== "") {
          if (transcriptResetTimer) clearTimeout(transcriptResetTimer);
          onTranscriptUpdate(transcript);
          transcriptResetTimer = setTimeout(() => {
              console.log("[audioAnalyzer] 트랜스크립트 리셋 타이머 만료");
              onTranscriptUpdate("");
              transcriptResetTimer = null;
          }, 3000);
          lastVoiceTime = Date.now(); silenceTimer = 0;

          const detectedKeywords = analyzeKeywords(transcript, isFinal, confidence);
          if (detectedKeywords.length > 0) {
            const now = Date.now();
            const newKeywords = detectedKeywords.filter(k => !processedKeywords.has(k) || now - (processedKeywords.get(k) || 0) > KEYWORD_REDETECTION_INTERVAL);
            if (newKeywords.length > 0) {
              console.log("[audioAnalyzer] 새로 처리할 키워드:", newKeywords);
              onKeywordsUpdate(newKeywords);
              for (const keyword of newKeywords) {
                  try {
                      const savedKeyword = await saveKeyword(keyword, userId);
                      if (savedKeyword) {
                          console.log(`[audioAnalyzer] 키워드 '${keyword}' 저장 성공`);
                          processedKeywords.set(keyword, Date.now());
                          if (onKeywordSaved) onKeywordSaved(savedKeyword);
                      } else { /* ... 저장 실패 로그 ... */ }
                  } catch (error) { console.error(`[audioAnalyzer] 키워드 '${keyword}' 저장 오류:`, error); }
              }
              invalidateKeywordsCache(userId);
            }
          }
        }
      }
    );
    console.log("[audioAnalyzer] startSpeechRecognition 호출 완료");

    const calculateVolume = () => {
      if (!isAnalyzing) {
         console.log(`%c[audioAnalyzer] calculateVolume 루프 중단됨 (isAnalyzing is false)`, 'color: orange; font-weight: bold;');
         if (animationFrameId) cancelAnimationFrame(animationFrameId);
         animationFrameId = null;
         return;
      }
      if (!window._lastVolumeLogTime || Date.now() - window._lastVolumeLogTime > 500) {
          console.log(`%c[audioAnalyzer] calculateVolume 실행 중 (isAnalyzing: ${isAnalyzing})`, 'color: gray');
          window._lastVolumeLogTime = Date.now();
      }
      analyser.getByteFrequencyData(dataArray);
      let totalSum = 0;
      for (let i = 0; i < bufferLength; i++) totalSum += dataArray[i];
      const currentVolume = totalSum / bufferLength;
      onVolumeUpdate(currentVolume);

      if (currentVolume > SILENCE_THRESHOLD) { lastVoiceTime = Date.now(); silenceTimer = 0; }
      else { silenceTimer = Date.now() - lastVoiceTime; }
      if (silenceTimer > 3000) {
        if (transcriptResetTimer) {
          clearTimeout(transcriptResetTimer); transcriptResetTimer = null;
          console.log("[audioAnalyzer] 침묵 감지: 트랜스크립트/키워드 초기화");
          onTranscriptUpdate(""); onKeywordsUpdate([]);
        }
      }
      animationFrameId = requestAnimationFrame(calculateVolume);
    };
    console.log(`%c[audioAnalyzer] +++ calculateVolume 루프 시작`, 'background: #222; color: #bada55');
    calculateVolume();

    // --- Cleanup 함수 반환 ---
    return () => {
      console.log(`%c[audioAnalyzer] --- Cleanup 함수 실행 시작 ---`, 'background: #222; color: #ff5733; font-weight: bold;');
      isAnalyzing = false;
      console.log(`%c[audioAnalyzer] --- isAnalyzing 플래그 설정: ${isAnalyzing}`, 'background: #222; color: #ff5733; font-weight: bold;');
      if (animationFrameId) { console.log("[audioAnalyzer] --- calculateVolume 루프 정지"); cancelAnimationFrame(animationFrameId); animationFrameId = null; }
      if (cleanupInterval) { console.log("[audioAnalyzer] --- 키워드 정리 인터벌 중지"); clearInterval(cleanupInterval); cleanupInterval = null; }
      if (stopRecognitionFunc) { console.log("[audioAnalyzer] --- 음성 인식 중지 함수 호출"); try { stopRecognitionFunc(); } catch (e) { console.error("음성 인식 중지 오류:", e); } stopRecognitionFunc = null; }
      if (transcriptResetTimer) { console.log("[audioAnalyzer] --- 트랜스크립트 리셋 타이머 제거"); clearTimeout(transcriptResetTimer); transcriptResetTimer = null; }
      if (stream) {
          console.log("[audioAnalyzer] --- 미디어 스트림 트랙 중지");
          stream.getTracks().forEach(track => track.stop());
          stream = null;
      }
      if (audioContext) {
          console.log("[audioAnalyzer] --- AudioContext 종료");
          if (audioContext.state !== "closed") { audioContext.close().catch(e => console.error("AudioContext 종료 오류:", e)); }
          audioContext = null;
      }
      if (window._lastVolumeLogTime) { delete window._lastVolumeLogTime; }
      console.log(`%c[audioAnalyzer] --- Cleanup 함수 실행 완료 ---`, 'background: #222; color: #ff5733; font-weight: bold;');
    };

  } catch (error) {
    console.error("[audioAnalyzer] startAudioAnalysis 메인 로직 오류:", error);
    isAnalyzing = false;
    console.log(`%c[audioAnalyzer] +++ 오류 발생으로 isAnalyzing 플래그 설정: ${isAnalyzing}`, 'background: #222; color: red; font-weight: bold;');
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (audioContext && audioContext.state !== "closed") audioContext.close();
    if (cleanupInterval) clearInterval(cleanupInterval); cleanupInterval = null;
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    throw error;
  }
};