import { startSpeechRecognition } from "./speechRecognizer";
import { analyzeKeywords, resetKeywordTracker } from "./keywordAnalyzer";
import { saveKeyword } from "./saveKeyword";
import { invalidateKeywordsCache } from "./fetchKeywords";

// 음성 분석 모듈의 상태
let isAnalyzing = false;
let stopRecognitionFunc: (() => void) | null = null;

export const startAudioAnalysis = async (
  onUpdate: (
    volume: number,
    transcript: string,
    detectedKeywords: string[]
  ) => void
) => {
  if (isAnalyzing) {
    console.warn("오디오 분석이 이미 실행 중입니다.");
    return () => {};
  }

  isAnalyzing = true;

  try {
    // Try with simple constraints first
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true  // Use minimal constraints initially
      });
    } catch (initialError : any) {
      console.warn("기본 오디오 접근 실패:", initialError);
      
      // If no device or permission denied, show specific error
      if (initialError.name === 'NotFoundError') {
        throw new Error("마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인하세요.");
      } else if (initialError.name === 'NotAllowedError') {
        throw new Error("마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.");
      }
      
      // Re-throw other errors
      throw initialError;
    }

    // Audio context setup
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

    // Setup audio processing chain with error handling
    let analyser;
    try {
      // 음성 강화를 위한 필터 체인 추가
      const lowPassFilter = audioContext.createBiquadFilter();
      lowPassFilter.type = "lowpass";
      lowPassFilter.frequency.value = 8000;

      const highPassFilter = audioContext.createBiquadFilter();
      highPassFilter.type = "highpass";
      highPassFilter.frequency.value = 85;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1.25;

      source.connect(highPassFilter);
      highPassFilter.connect(lowPassFilter);
      lowPassFilter.connect(gainNode);

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      gainNode.connect(analyser);
    } catch (filterError) {
      console.warn("고급 오디오 필터링 실패, 기본 설정 사용:", filterError);
      
      // Fallback to basic analyzer if advanced processing fails
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let latestTranscript = "";
    let confirmedKeywords: string[] = [];
    const recentVolumes: number[] = [];

    // Rest of your existing code...
    let silenceTimer = 0;
    let lastVoiceTime = Date.now();
    const SILENCE_THRESHOLD = 15;

    resetKeywordTracker();

    stopRecognitionFunc = startSpeechRecognition(
      (transcript, isFinal, confidence) => {
        // Your existing callback code...
        if (transcript.trim() !== "") {
          latestTranscript = transcript;
          lastVoiceTime = Date.now();
          silenceTimer = 0;

          const minConfidence = isFinal ? 0.3 : 0.4;

          if (confidence >= minConfidence) {
            const keywords = analyzeKeywords(transcript, isFinal, confidence);

            if (keywords.length > 0) {
              confirmedKeywords = Array.from(
                new Set([...confirmedKeywords, ...keywords])
              );

              keywords.forEach(async (keyword) => {
                await saveKeyword(keyword);
              });

              invalidateKeywordsCache();
            }
          }
        }
      }
    );

    // Continue with your volume calculation function...
    const calculateVolumeAndKeywords = () => {
      // Your existing calculation code...
      if (!isAnalyzing) return;

      analyser.getByteFrequencyData(dataArray);

      let voiceSum = 0;
      let totalSum = 0;
      const voiceFreqMinBin = Math.floor(
        (300 * bufferLength) / audioContext.sampleRate
      );
      const voiceFreqMaxBin = Math.floor(
        (3400 * bufferLength) / audioContext.sampleRate
      );

      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        totalSum += value;

        if (i >= voiceFreqMinBin && i <= voiceFreqMaxBin) {
          voiceSum += value * 1.5;
        }
      }

      const currentVolume = totalSum / bufferLength;
      const voiceVolume =
        voiceFreqMaxBin > voiceFreqMinBin
          ? voiceSum / (voiceFreqMaxBin - voiceFreqMinBin)
          : 0;

      const isVoiceActive = voiceVolume > SILENCE_THRESHOLD;

      if (isVoiceActive) {
        lastVoiceTime = Date.now();
        silenceTimer = 0;
      } else {
        silenceTimer = Date.now() - lastVoiceTime;
      }

      recentVolumes.push(Math.max(currentVolume, voiceVolume));
      if (recentVolumes.length > 5) {
        recentVolumes.shift();
      }
      const averageVolume =
        recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;

      onUpdate(averageVolume, latestTranscript, confirmedKeywords);

      if (silenceTimer > 3000) {
        confirmedKeywords = [];
      }

      if (isAnalyzing) {
        requestAnimationFrame(calculateVolumeAndKeywords);
      }
    };

    calculateVolumeAndKeywords();

    return () => {
      isAnalyzing = false;
      if (stopRecognitionFunc) {
        stopRecognitionFunc();
      }

      stream.getTracks().forEach((track) => track.stop());

      if (audioContext.state !== "closed") {
        audioContext.close();
      }
    };
  } catch (error) {
    console.error("오디오 분석 시작 오류:", error);
    isAnalyzing = false;
    
    // Set a specific error message for the UI
    onUpdate(0, "", []);
    return () => {};
  }
};

