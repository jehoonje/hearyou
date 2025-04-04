import { startSpeechRecognition } from "./speechRecognizer";
import { analyzeKeywords, resetKeywordTracker } from "./keywordAnalyzer";
import { saveKeyword } from "./saveKeyword";
import { invalidateKeywordsCache } from "./fetchKeywords";

// 음성 분석 모듈의 상태
let isAnalyzing = false;
let stopRecognitionFunc: (() => void) | null = null;

// 이미 저장된 키워드 추적 (중복 방지)
let processedKeywords = new Set<string>();

export const startAudioAnalysis = async (
  onVolumeUpdate: (volume: number) => void,
  onTranscriptUpdate: (transcript: string) => void,
  onKeywordsUpdate: (keywords: string[]) => void
) => {
  if (isAnalyzing) {
    console.warn("오디오 분석이 이미 실행 중입니다.");
    return () => {};
  }

  isAnalyzing = true;
  
  // 분석 시작시 초기화
  processedKeywords.clear();
  
  // 트랜스크립트 타이머 변수
  let transcriptResetTimer: NodeJS.Timeout | null = null;
  
  try {
    // 오디오 스트림 설정
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
    } catch (initialError : any) {
      console.warn("기본 오디오 접근 실패:", initialError);
      
      if (initialError.name === 'NotFoundError') {
        throw new Error("마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인하세요.");
      } else if (initialError.name === 'NotAllowedError') {
        throw new Error("마이크 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.");
      }
      
      throw initialError;
    }

    // 오디오 컨텍스트 및 분석기 설정
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);

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
      
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let silenceTimer = 0;
    let lastVoiceTime = Date.now();
    const SILENCE_THRESHOLD = 15;

    resetKeywordTracker();

    stopRecognitionFunc = startSpeechRecognition(
      async (transcript, isFinal, confidence) => {
        if (transcript.trim() !== "") {
          // 이전 타이머가 있으면 취소
          if (transcriptResetTimer) {
            clearTimeout(transcriptResetTimer);
            transcriptResetTimer = null;
          }
          
          // 새 트랜스크립트 설정
          onTranscriptUpdate(transcript);
          
          // 3초 후 트랜스크립트 초기화 타이머 설정
          transcriptResetTimer = setTimeout(() => {
            console.log('트랜스크립트 타이머 종료, 초기화');
            onTranscriptUpdate('');
            transcriptResetTimer = null;
          }, 3000);
          
          lastVoiceTime = Date.now();
          silenceTimer = 0;

          // 빈도 기반 키워드 분석 수행
          const detectedKeywords = analyzeKeywords(transcript, isFinal, confidence);

          if (detectedKeywords.length > 0) {
            console.log('감지된 키워드 목록 (30초 내 2회 이상 언급):', detectedKeywords);
            
            // 이미 처리되지 않은 키워드만 필터링
            const newKeywords = detectedKeywords.filter(
              keyword => !processedKeywords.has(keyword)
            );
            
            if (newKeywords.length > 0) {
              // 감지된 키워드를 UI에 표시
              onKeywordsUpdate(newKeywords);
              
              // 감지된 키워드를 DB에 저장
              for (const keyword of newKeywords) {
                try {
                  const success = await saveKeyword(keyword);
                  console.log(`키워드 '${keyword}' 저장: ${success ? '성공' : '실패'}`);
                  
                  if (success) {
                    // 처리된 키워드로 표시
                    processedKeywords.add(keyword);
                  }
                } catch (error) {
                  console.error(`키워드 저장 오류:`, error);
                }
              }
              
              // 캐시 무효화
              invalidateKeywordsCache();
            }
          }
        }
      }
    );

    // 볼륨 계산 함수
    const calculateVolume = () => {
      if (!isAnalyzing) return;

      analyser.getByteFrequencyData(dataArray);

      let totalSum = 0;
      for (let i = 0; i < bufferLength; i++) {
        totalSum += dataArray[i];
      }
      const currentVolume = totalSum / bufferLength;
      
      // 볼륨 업데이트
      onVolumeUpdate(currentVolume);
      
      // 침묵 시간 계산
      if (currentVolume > SILENCE_THRESHOLD) {
        lastVoiceTime = Date.now();
        silenceTimer = 0;
      } else {
        silenceTimer = Date.now() - lastVoiceTime;
      }
      
      // 침묵이 3초 이상 지속되면 트랜스크립트와 키워드 초기화
      if (silenceTimer > 3000) {
        if (transcriptResetTimer) {
          clearTimeout(transcriptResetTimer);
          transcriptResetTimer = null;
        }
        onTranscriptUpdate('');
        onKeywordsUpdate([]);
      }
      
      if (isAnalyzing) {
        requestAnimationFrame(calculateVolume);
      }
    };

    calculateVolume();

    return () => {
      isAnalyzing = false;
      if (stopRecognitionFunc) {
        stopRecognitionFunc();
      }
      
      if (transcriptResetTimer) {
        clearTimeout(transcriptResetTimer);
      }

      stream.getTracks().forEach((track) => track.stop());
      if (audioContext.state !== "closed") {
        audioContext.close();
      }
    };
  } catch (error) {
    console.error("오디오 분석 시작 오류:", error);
    isAnalyzing = false;
    onVolumeUpdate(0);
    onTranscriptUpdate('');
    onKeywordsUpdate([]);
    return () => {};
  }
};
