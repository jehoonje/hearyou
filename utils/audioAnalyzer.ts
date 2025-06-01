/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { startSpeechRecognition } from './speechRecognizer';
import { analyzeKeywords, resetKeywordTracker } from './keywordAnalyzer';
import { saveKeyword } from './saveKeyword';
import { invalidateKeywordsCache } from './fetchKeywords';
import { Keyword } from '../types';

/* ---------- 전역 확장 ---------- */
declare global {
  interface Window {
    _lastVolumeLogTime?: number;
    isNativeApp?: boolean;
  }
}

/* ---------- 모듈 스코프 변수 ---------- */
let isAnalyzing = false;
let stopRecognitionFunc: (() => void) | null = null;
let processedKeywords = new Map<string, number>();
const KEYWORD_REDETECTION_INTERVAL = 3 * 1000;
let cleanupInterval: NodeJS.Timeout | null = null;

/* ---------- 키워드 캐시 정리 ---------- */
const cleanupOldKeywords = () => {
  const now = Date.now();
  const THRESHOLD = 5 * 60 * 1000;
  processedKeywords.forEach((ts, kw) => {
    if (now - ts > THRESHOLD) processedKeywords.delete(kw);
  });
};

/* ------------------------------------------------------------------ */
/* ---------------------  메인 진입 함수  ---------------------------- */
/* ------------------------------------------------------------------ */
export const startAudioAnalysis = async (
  userId: string,
  onVolumeUpdate: (v: number) => void,
  onTranscriptUpdate: (t: string) => void,
  onKeywordsUpdate: (kws: string[]) => void,
  onKeywordSaved?: (k: Keyword) => void,
) => {
  if (isAnalyzing) return () => {};
  if (!userId) throw new Error('userId 가 필요합니다.');
  isAnalyzing = true;
  processedKeywords.clear();
  resetKeywordTracker();

  /* *************************************************************
   *  A.  네이티브 앱에서 실행되는 경우 (window.isNativeApp == true)
   *      → getUserMedia 로 마이크를 다시 점유하지 않는다.
   ************************************************************* */
  if (window.isNativeApp) {
    console.log('[audioAnalyzer] NativeApp 모드 – getUserMedia skip');

    stopRecognitionFunc = startSpeechRecognition((txt, isFinal, conf) => {
      if (txt.trim()) {
        onTranscriptUpdate(txt);
        const kws = analyzeKeywords(txt, isFinal, conf);
        if (kws.length) {
          onKeywordsUpdate(kws);
          kws.forEach(async (kw) => {
            try {
              const saved = await saveKeyword(kw, userId);
              if (saved) {
                processedKeywords.set(kw, Date.now());
                if (onKeywordSaved) onKeywordSaved(saved);
              }
            } catch (e) {
              console.error('[audioAnalyzer] 키워드 저장 오류:', e);
            }
          });
          invalidateKeywordsCache(userId);
        }
      }
    });

    /* 네이티브에서 볼륨 값을 따로 주지 않으므로 0 으로 고정 보고 */
    onVolumeUpdate(0);

    return () => {
      isAnalyzing = false;
      if (stopRecognitionFunc) {
        try {
          stopRecognitionFunc();
        } catch (_) {}
        stopRecognitionFunc = null;
      }
    };
  }

  /* *************************************************************
   *  B.  브라우저(웹) 환경 – 기존 로직
   ************************************************************* */
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let animationId: number | null = null;
  let transcriptResetTimer: NodeJS.Timeout | null = null;
  let silenceTimer = 0;
  let lastVoiceTime = Date.now();
  const SILENCE_THRESHOLD = 15;

  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(cleanupOldKeywords, 60 * 1000);

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const bufLen = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufLen);

    stopRecognitionFunc = startSpeechRecognition(
      async (transcript, isFinal, confidence) => {
        if (!transcript.trim()) return;

        if (transcriptResetTimer) clearTimeout(transcriptResetTimer);
        onTranscriptUpdate(transcript);
        transcriptResetTimer = setTimeout(() => {
          onTranscriptUpdate('');
          transcriptResetTimer = null;
        }, 3000);

        lastVoiceTime = Date.now();
        silenceTimer = 0;

        const kws = analyzeKeywords(transcript, isFinal, confidence);
        if (kws.length) {
          const now = Date.now();
          const newKws = kws.filter(
            (kw) =>
              !processedKeywords.has(kw) ||
              now - (processedKeywords.get(kw) || 0) >
                KEYWORD_REDETECTION_INTERVAL,
          );
          if (newKws.length) {
            onKeywordsUpdate(newKws);
            for (const kw of newKws) {
              try {
                const saved = await saveKeyword(kw, userId);
                if (saved) {
                  processedKeywords.set(kw, Date.now());
                  onKeywordSaved?.(saved);
                }
              } catch (e) {
                console.error('[audioAnalyzer] saveKeyword 오류:', e);
              }
            }
            invalidateKeywordsCache(userId);
          }
        }
      },
    );

    const calcVolume = () => {
      if (!isAnalyzing) {
        if (animationId) cancelAnimationFrame(animationId);
        return;
      }
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufLen; i++) sum += dataArray[i];
      const vol = sum / bufLen;
      onVolumeUpdate(vol);

      if (vol > SILENCE_THRESHOLD) {
        lastVoiceTime = Date.now();
        silenceTimer = 0;
      } else {
        silenceTimer = Date.now() - lastVoiceTime;
      }

      if (silenceTimer > 3000 && transcriptResetTimer) {
        clearTimeout(transcriptResetTimer);
        transcriptResetTimer = null;
        onTranscriptUpdate('');
        onKeywordsUpdate([]);
      }

      animationId = requestAnimationFrame(calcVolume);
    };

    calcVolume();

    /* ---------- 정리 함수 ---------- */
    return () => {
      isAnalyzing = false;
      if (animationId) cancelAnimationFrame(animationId);
      if (cleanupInterval) clearInterval(cleanupInterval);
      if (stopRecognitionFunc) {
        try {
          stopRecognitionFunc();
        } catch (_) {}
      }
      if (transcriptResetTimer) clearTimeout(transcriptResetTimer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioContext && audioContext.state !== 'closed')
        audioContext.close();
    };
  } catch (err) {
    isAnalyzing = false;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }
    throw err;
  }
};
