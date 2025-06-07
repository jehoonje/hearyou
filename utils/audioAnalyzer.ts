// audioAnalyzer.ts - 키워드 감지 문제 수정 버전

import { startSpeechRecognition } from "./speechRecognizer";
import { analyzeKeywords, resetKeywordTracker } from "./keywordAnalyzer";
import { saveKeyword } from "./saveKeyword";
import { Keyword } from '../types';
import { invalidateKeywordsCache } from "./fetchKeywords";

declare global {
  interface Window {
    isNativeApp?: boolean;
    _lastVolumeLogTime?: number;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    handleNativeVolumeUpdate?: (volume: number) => void;
    resetTranscriptTimer?: () => void;
  }
}

let isAnalyzing = false;
let stopRecognitionFunc: (() => void) | null = null;

const TRANSCRIPT_RESET_TIMEOUT = 3 * 1000;

export const startAudioAnalysis = async (
  userId: string,
  onVolumeUpdate: (volume: number) => void,
  onTranscriptUpdate: (transcript: string) => void,
  onKeywordsUpdate: (keywords: string[]) => void,
  onKeywordSaved?: (keyword: Keyword) => void
): Promise<() => void> => {
  console.log(`[AudioAnalyzer] 시작 - userId: ${userId}, isNativeApp: ${!!window.isNativeApp}`);

  if (isAnalyzing) {
    console.warn("[AudioAnalyzer] 이미 실행 중");
    return () => {};
  }

  if (!userId) {
    throw new Error("사용자 ID가 필요합니다.");
  }

  isAnalyzing = true;
  resetKeywordTracker();

  let transcriptResetTimer: NodeJS.Timeout | null = null;

  const commonSpeechResultHandler = async (transcript: string, isFinal: boolean, confidence: number) => {
    console.log(`[AudioAnalyzer] 음성 인식 결과: "${transcript}", isFinal: ${isFinal}, confidence: ${confidence}`);

    if (transcriptResetTimer) clearTimeout(transcriptResetTimer);

    if (transcript === "" && isFinal) {
      onTranscriptUpdate("");
      return;
    }
    
    if (transcript.trim()) {
      onTranscriptUpdate(transcript);
      console.log(`[AudioAnalyzer] 트랜스크립트 업데이트: "${transcript}"`);

      transcriptResetTimer = setTimeout(() => {
        console.log("[AudioAnalyzer] 트랜스크립트 리셋");
        onTranscriptUpdate("");
      }, TRANSCRIPT_RESET_TIMEOUT);

      // 키워드 분석 - analyzeKeywords가 이제 확정된 키워드만 반환
      const confirmedKeywords = analyzeKeywords(transcript, isFinal, confidence);
      console.log(`[AudioAnalyzer] 확정된 키워드:`, confirmedKeywords);

      if (confirmedKeywords.length > 0) {
        console.log("[AudioAnalyzer] 저장할 확정 키워드:", confirmedKeywords);
        
        // UI에 키워드 표시
        onKeywordsUpdate(confirmedKeywords);

        // 각 키워드 저장
        for (const kw of confirmedKeywords) {
          try {
            const savedKeyword = await saveKeyword(kw, userId);
            if (savedKeyword) {
              console.log(`[AudioAnalyzer] ✅ 키워드 '${kw}' 저장 성공`);
              if (onKeywordSaved) onKeywordSaved(savedKeyword);
            }
          } catch (e) {
            console.error(`[AudioAnalyzer] 키워드 '${kw}' 저장 오류:`, e);
          }
        }
        
        // 캐시 무효화
        invalidateKeywordsCache(userId);
      }
    } else {
      console.log('[AudioAnalyzer] 빈 트랜스크립트');
      onTranscriptUpdate('');
      if (transcriptResetTimer) {
        clearTimeout(transcriptResetTimer);
        transcriptResetTimer = null;
      }
    }
  };

  // 웹 환경 (네이티브가 아닌 경우)
  if (!window.isNativeApp) {
    console.log('[AudioAnalyzer] 웹 모드 실행');
    let stream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let animationFrameId: number | null = null;

    let silenceTimerValueWeb = 0;
    let lastVoiceTimeWeb = Date.now();
    const SILENCE_THRESHOLD_WEB = 15;

    try {
      console.log("[AudioAnalyzer] 마이크 권한 요청");
      stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          autoGainControl: false,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      console.log("[AudioAnalyzer] 마이크 권한 획득");

      audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      let analyserNode: AnalyserNode;

      try {
        const lowPassFilter = audioContext.createBiquadFilter();
        lowPassFilter.type = "lowpass";
        lowPassFilter.frequency.value = 8000;
        
        const highPassFilter = audioContext.createBiquadFilter();
        highPassFilter.type = "highpass";
        highPassFilter.frequency.value = 85;
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1.5;
        
        source.connect(highPassFilter).connect(lowPassFilter).connect(gainNode);
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 512;
        analyserNode.smoothingTimeConstant = 0.6;
        gainNode.connect(analyserNode);
      } catch (filterError) {
        console.warn("[AudioAnalyzer] 필터 생성 실패:", filterError);
        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 512;
        source.connect(analyserNode);
      }

      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      console.log("[AudioAnalyzer] 음성 인식 시작");
      stopRecognitionFunc = startSpeechRecognition(commonSpeechResultHandler);

      const calculateVolumeAndDetectSilenceWeb = () => {
        if (!isAnalyzing) {
          if (animationFrameId) cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
          return;
        }

        analyserNode.getByteFrequencyData(dataArray);
        let totalSum = 0;
        for (let i = 0; i < bufferLength; i++) totalSum += dataArray[i];
        const currentVolume = totalSum / bufferLength;
        onVolumeUpdate(currentVolume);

        if (currentVolume > SILENCE_THRESHOLD_WEB) {
          lastVoiceTimeWeb = Date.now();
          silenceTimerValueWeb = 0;
        } else {
          silenceTimerValueWeb = Date.now() - lastVoiceTimeWeb;
        }

        animationFrameId = requestAnimationFrame(calculateVolumeAndDetectSilenceWeb);
      };
      
      calculateVolumeAndDetectSilenceWeb();

      return () => {
        console.log("[AudioAnalyzer] 정리 시작");
        isAnalyzing = false;
        
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        if (stopRecognitionFunc) {
          stopRecognitionFunc();
          stopRecognitionFunc = null;
        }
        if (transcriptResetTimer) {
          clearTimeout(transcriptResetTimer);
          transcriptResetTimer = null;
        }
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          stream = null;
        }
        if (audioContext && audioContext.state !== "closed") {
          audioContext.close().catch(e => console.error("[AudioAnalyzer] AudioContext 종료 오류:", e));
          audioContext = null;
        }
        console.log("[AudioAnalyzer] 정리 완료");
      };

    } catch (error) {
      console.error("[AudioAnalyzer] 오류:", error);
      isAnalyzing = false;
      
      if (stopRecognitionFunc) stopRecognitionFunc();
      if (transcriptResetTimer) clearTimeout(transcriptResetTimer);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (audioContext && audioContext.state !== "closed") audioContext.close().catch(e => {});
      
      throw error;
    }
  }
  // 네이티브 앱 환경
  else {
    console.log('[AudioAnalyzer] 네이티브 모드 실행');
    
    window.resetTranscriptTimer = () => {
      if (transcriptResetTimer) clearTimeout(transcriptResetTimer);
      transcriptResetTimer = setTimeout(() => {
        onTranscriptUpdate("");
      }, TRANSCRIPT_RESET_TIMEOUT);
    };

    stopRecognitionFunc = startSpeechRecognition(commonSpeechResultHandler);

    window.handleNativeVolumeUpdate = (volumeFromNative: number) => {
      onVolumeUpdate(volumeFromNative);
    };

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'START_VOLUME_UPDATES' }));
    }

    return () => {
      console.log("[AudioAnalyzer Native] 정리 시작");
      isAnalyzing = false;
      
      if (stopRecognitionFunc) {
        stopRecognitionFunc();
        stopRecognitionFunc = null;
      }
      if (transcriptResetTimer) {
        clearTimeout(transcriptResetTimer);
        transcriptResetTimer = null;
      }
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STOP_VOLUME_UPDATES' }));
      }
      window.handleNativeVolumeUpdate = undefined;
      console.log("[AudioAnalyzer Native] 정리 완료");
    };
  }
};