import { create } from 'zustand';

// Zustand 스토어의 상태와 액션을 정의하는 인터페이스
interface AudioState {
  volume: number;         // 볼륨 상태 (숫자) - 초기값 0
  transcript: string;     // 음성 인식 결과 텍스트 (문자열)
  keywords: string[];     // 추출된 키워드 배열 (문자열 배열)
  isAnalyzing: boolean;   // 현재 오디오 분석(및 녹음) 진행 여부 상태 추가

  // 상태 업데이트 함수들 (액션)
  setVolume: (volume: number) => void;             // 볼륨 설정
  setTranscript: (transcript: string) => void;   // 텍스트 설정
  setKeywords: (keywords: string[]) => void;       // 키워드 설정
  setIsAnalyzing: (isAnalyzing: boolean) => void; // 분석 상태 설정

  // 상태 초기화 함수들 (액션)
  clearTranscript: () => void;                     // 텍스트 초기화
  clearKeywords: () => void;                       // 키워드 초기화
  resetAudioData: () => void;                      // 텍스트와 키워드 모두 초기화
}

// Zustand 스토어 생성
export const useAudioStore = create<AudioState>((set) => ({
  // 초기 상태 값 정의
  volume: 0, // 초기 볼륨은 0 (숫자 타입 유지)
  transcript: '',
  keywords: [],
  isAnalyzing: false, // 초기 분석 상태는 false

  // 개별 상태를 업데이트하는 액션 함수들
  setVolume: (volume) => {
    // NaN 이나 유효하지 않은 값이 들어오는 경우를 방지하고, 항상 숫자를 유지하도록 함
    const validVolume = typeof volume === 'number' && !isNaN(volume) ? volume : 0;
    // console.log(`[useAudioStore] setVolume: ${validVolume}`); // 디버깅 로그 추가 가능
    set({ volume: validVolume });
  },
  setTranscript: (transcript) => set({ transcript: transcript }),
  setKeywords: (keywords) => set({ keywords: keywords }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing: isAnalyzing }),

  // 특정 상태를 초기값으로 되돌리는 액션 함수들
  clearTranscript: () => set({ transcript: '' }),
  clearKeywords: () => set({ keywords: [] }),

  // 여러 상태를 한 번에 초기값으로 되돌리는 액션 함수
  resetAudioData: () => set({ transcript: '', keywords: [] }),
  // 참고: resetAudioData는 volume이나 isAnalyzing 상태는 초기화하지 않음
}));

/*
변경 사항:
1.  `isAnalyzing` 상태 추가: 오디오 분석(마이크 사용 및 볼륨 계산 등)이 활성화되어 있는지 여부를 명시적으로 관리합니다. VoiceTrackerUI 등에서 이 상태를 사용하여 UI를 조건부 렌더링할 수 있습니다.
2.  `setVolume` 액션 보강: `setVolume` 함수 내에서 입력받은 `volume` 값이 유효한 숫자인지 확인하고, 아닐 경우 0으로 설정하여 항상 숫자 타입 상태를 유지하도록 방어 코드를 추가했습니다. `undefined`나 `NaN`이 스토어 상태로 들어가는 것을 방지합니다.
*/