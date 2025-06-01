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
const KEYWORD_REDETECTION_INTERVAL = 3_000;
let cleanupInterval: NodeJS.Timeout | null = null;

/* ---------- 키워드 캐시 정리 ---------- */
const cleanupOldKeywords = () => {
  const now = Date.now();
  const THRESHOLD = 5 * 60 * 1_000;
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
   *  A.  네이티브 앱 환경  (window.isNativeApp === true)
   ************************************************************* */
  if (window.isNativeApp) {
    console.log('[audioAnalyzer] NativeApp 모드 – getUserMedia skip');

    stopRecognitionFunc = startSpeechRecognition(async (txt, isFinal, conf) => {
      if (!txt.trim()) return;

      onTranscriptUpdate(txt);

      const kws = analyzeKeywords(txt, isFinal, conf);
      if (!kws.length) return;

      const now = Date.now();
      const newKws = kws.filter(
        (kw) =>
          !processedKeywords.has(kw) ||
          now - (processedKeywords.get(kw) || 0) > KEYWORD_REDETECTION_INTERVAL,
      );
      if (!newKws.length) return;

      onKeywordsUpdate(newKws);

      for (const kw of newKws) {
        try {
          const saved = await saveKeyword(kw, userId);
          if (saved) {
            processedKeywords.set(kw, Date.now());
            onKeywordSaved?.(saved);
          }
        } catch (e) {
          console.error('[audioAnalyzer] 키워드 저장 오류:', e);
        }
      }
      invalidateKeywordsCache(userId); // 성공/실패와 무관하게 1회만
    });

    /* 네이티브에서 볼륨 값 전달 안 하므로 0 고정 */
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
   *  B.  브라우저(웹) 환경
   ************************************************************* */
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let animationId: number | null = null;
  let transcriptResetTimer: NodeJS.Timeout | null = null;
  let silenceTimer = 0;
  let lastVoiceTime = Date.now();
  const SILENCE_THRESHOLD = 15;

  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(cleanupOldKeywords, 60 * 1_000);

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
        }, 3_000);

        lastVoiceTime = Date.now();
        silenceTimer = 0;

        const kws = analyzeKeywords(transcript, isFinal, confidence);
        if (!kws.length) return;

        const now = Date.now();
        const newKws = kws.filter(
          (kw) =>
            !processedKeywords.has(kw) ||
            now - (processedKeywords.get(kw) || 0) > KEYWORD_REDETECTION_INTERVAL,
        );
        if (!newKws.length) return;

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
      },
    );

    const calcVolume = () => {
      if (!isAnalyzing) {
        if (animationId) cancelAnimationFrame(animationId);
        return;
      }
      analyser.getByteFrequencyData(dataArray);
      const vol = dataArray.reduce((s, v) => s + v, 0) / bufLen;
      onVolumeUpdate(vol);

      if (vol > SILENCE_THRESHOLD) {
        lastVoiceTime = Date.now();
        silenceTimer = 0;
      } else {
        silenceTimer = Date.now() - lastVoiceTime;
      }

      if (silenceTimer > 3_000 && transcriptResetTimer) {
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
      if (audioContext && audioContext.state !== 'closed') audioContext.close();
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
