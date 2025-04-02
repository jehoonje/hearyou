import { create } from 'zustand';

interface AudioState {
  volume: number;
  transcript: string;
  keywords: string[];
  setVolume: (volume: number) => void;
  setTranscript: (transcript: string) => void;
  setKeywords: (keywords: string[]) => void;
  clearTranscript: () => void;
  clearKeywords: () => void;
  resetAll: () => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  volume: 0,
  transcript: '',
  keywords: [],
  
  // 개별 setter 함수들
  setVolume: (volume) => set({ volume }),
  setTranscript: (transcript) => set({ transcript }),
  setKeywords: (keywords) => set({ keywords }),
  
  // 초기화 함수들
  clearTranscript: () => set({ transcript: '' }),
  clearKeywords: () => set({ keywords: [] }),
  resetAll: () => set({ transcript: '', keywords: [] }),
}));
