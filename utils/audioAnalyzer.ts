import { startSpeechRecognition } from "./speechRecognizer";
import { analyzeKeywords, resetKeywordTracker } from "./keywordAnalyzer";
import { saveKeyword } from "./saveKeyword";
import { invalidateKeywordsCache } from "./fetchKeywords";

// 음성 분석 모듈의 상태
let isAnalyzing = false;
let stopRecognitionFunc: (() => void) | null = null;

// 키워드 처리를 위한 상태 관리
let lastProcessedKeywords = new Set<string>(); // 이미 처리된 키워드
let lastKeywordTime = Date.now();              // 마지막 키워드 처리 시간
const KEYWORD_COOLDOWN = 1000;                // 키워드 재감지 대기 시간 (10초)

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
  
  // 분석 시작 시 초기화
  lastProcessedKeywords.clear();
  lastKeywordTime = Date.now();
  
  // 트랜스크립트 타이머 변수
  let transcriptResetTimer: NodeJS.Timeout | null = null;
  
  try {
    // 오디오 스트림 설정 (코드 생략...)
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

    // 오디오 컨텍스트 및 분석기 설정 (코드 생략...)
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
          
          // 새 트랜스크립트 설정 (이전 내용은 완전히 대체)
          onTranscriptUpdate(transcript);
          
          // 3초 후 트랜스크립트 초기화 타이머 설정
          transcriptResetTimer = setTimeout(() => {
            console.log('트랜스크립트 타이머 종료, 초기화');
            onTranscriptUpdate('');
            transcriptResetTimer = null;
          }, 1000);
          
          lastVoiceTime = Date.now();
          silenceTimer = 0;

          const minConfidence = isFinal ? 0.3 : 0.4;

          if (confidence >= minConfidence) {
            // 키워드 분석 수행
            const detectedKeywords = analyzeKeywords(transcript, isFinal, confidence);

            if (detectedKeywords.length > 0) {
              console.log('감지된 키워드 목록:', detectedKeywords);
              
              // 현재 시간 확인
              const now = Date.now();
              
              // 재감지 쿨다운 확인 (10초 이상 지났으면 이전 처리 기록 초기화)
              if (now - lastKeywordTime > KEYWORD_COOLDOWN) {
                console.log('키워드 쿨다운 만료, 처리 기록 초기화');
                lastProcessedKeywords.clear();
                lastKeywordTime = now;
              }
              
              // 가장 최근 감지된 한 개의 키워드만 처리
              // 하나의 키워드만 선택 (마지막 키워드)
              const latestKeyword = detectedKeywords[detectedKeywords.length - 1];
              
              // 이미 처리되었는지 확인
              if (!lastProcessedKeywords.has(latestKeyword)) {
                console.log('새로 처리할 키워드:', latestKeyword);
                
                // 단일 키워드 배열로 UI에 전달
                onKeywordsUpdate([latestKeyword]);
                
                // DB에 저장 (한 번에 하나만)
                try {
                  const success = await saveKeyword(latestKeyword);
                  console.log(`키워드 '${latestKeyword}' 저장: ${success ? '성공' : '실패'}`);
                  
                  // 성공적으로 처리된 키워드는 목록에 추가
                  if (success) {
                    lastProcessedKeywords.add(latestKeyword);
                  }
                } catch (error) {
                  console.error(`키워드 저장 오류:`, error);
                }
                
                // 캐시 무효화
                invalidateKeywordsCache();
              } else {
                console.log(`키워드 '${latestKeyword}'는 이미 처리되었습니다.`);
              }
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
      
      // 볼륨 업데이트 (키워드와 트랜스크립트는 변경하지 않음)
      onVolumeUpdate(currentVolume);
      
      // 침묵 시간 계산
      if (currentVolume > SILENCE_THRESHOLD) {
        lastVoiceTime = Date.now();
        silenceTimer = 0;
      } else {
        silenceTimer = Date.now() - lastVoiceTime;
      }
      
      // 침묵이 3초 이상 지속되면 트랜스크립트와 키워드 초기화 (더 짧게 변경)
      if (silenceTimer > 1000) {
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
