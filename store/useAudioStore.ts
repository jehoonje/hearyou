import { create } from 'zustand';

interface AudioState {
  volume: number;
  transcript: string;
  keywords: string[];
  setAudioData: (volume: number, transcript: string, keywords: string[]) => void;
  clearKeywords: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  volume: 0,
  transcript: '',
  keywords: [],
  setAudioData: (volume, transcript, keywords) => set(state => {
    // 기존 코드의 문제점: 새 키워드가 이전 키워드를 대체하지 않음
    // 수정된 방식: 항상 최신 키워드로 업데이트하고, 키워드가 없을 때만 이전 상태 유지
    if (keywords && keywords.length > 0) {
      // 디버깅을 위한 로그
      console.log('새 키워드 감지됨:', keywords);
      return { volume, transcript, keywords };
    }
    return { volume, transcript, keywords: [] }; // 이전 키워드 유지하지 않고 비움
  }),
  clearKeywords: () => set({ keywords: [] })
}));
