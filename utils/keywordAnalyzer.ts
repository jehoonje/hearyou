// 빈도 기반 키워드 분석기 (30초 내 두 번 이상 언급된 단어 감지)
class FrequencyAnalyzer {
  private wordFrequency: Map<string, { count: number, lastMentionTime: number }> = new Map();
  private readonly TIME_WINDOW = 30000; // 30초 시간 창 (밀리초)
  private readonly MIN_FREQUENCY = 2; // 최소 출현 빈도
  private confirmedKeywords: Set<string> = new Set();
  private readonly MIN_WORD_LENGTH = 1; // 최소 단어 길이

  // 텍스트에서 단어를 추출하고 빈도 갱신
  processText(text: string): void {
    const now = Date.now();
    // 정규 표현식을 사용하여 한글 단어 추출 (2글자 이상의 단어만)
    const words = text.match(/[가-힣]{2,}/g) || [];
    
    // 불용어 목록 (조사, 접속사 등 의미가 적은 단어)
    const stopWords = [
      '그리고', '하지만', '그래서', '또한', '그런데', '이것은', '저것은', '이렇게',
      '그러나', '그래도', '그러면', '그러므로', '왜냐하면', '이것이', '저것이',
      '그것은', '그것이', '그것을', '이것을', '저것을', '이거는', '저거는'
    ];
    
    for (const word of words) {
      // 불용어나 너무 짧은 단어 건너뛰기
      if (stopWords.includes(word) || word.length < this.MIN_WORD_LENGTH) continue;
      
      if (this.wordFrequency.has(word)) {
        const data = this.wordFrequency.get(word)!;
        data.count += 1;
        data.lastMentionTime = now;
        
        // 30초 내에 두 번 이상 언급되었으면 확정 키워드에 추가
        if (data.count >= this.MIN_FREQUENCY) {
          this.confirmedKeywords.add(word);
        }
      } else {
        this.wordFrequency.set(word, { count: 1, lastMentionTime: now });
      }
    }
    
    // 30초가 지난 단어 제거
    this.cleanupOldWords();
  }
  
  // 30초가 지난 단어 제거 (Map 순회 방식 수정)
  private cleanupOldWords(): void {
    const now = Date.now();
    // Array.from을 사용하여 Map의 키를 배열로 변환 후 순회
    Array.from(this.wordFrequency.keys()).forEach(word => {
      const data = this.wordFrequency.get(word);
      if (data && now - data.lastMentionTime > this.TIME_WINDOW) {
        this.wordFrequency.delete(word);
      }
    });
  }
  
  // 확정된 키워드 반환 및 초기화
  getConfirmedKeywords(): string[] {
    const keywords = Array.from(this.confirmedKeywords);
    this.confirmedKeywords.clear();
    return keywords;
  }
  
  // 모든 상태 초기화
  reset(): void {
    this.wordFrequency.clear();
    this.confirmedKeywords.clear();
  }
}

// 싱글톤 인스턴스
const frequencyAnalyzer = new FrequencyAnalyzer();

export const analyzeKeywords = (
  transcript: string,
  isFinal: boolean,
  confidence: number
): string[] => {
  // 신뢰도 임계값 검사
  if (confidence < 0.3) {
    return [];
  }
  
  // 텍스트 처리
  frequencyAnalyzer.processText(transcript);
  
  // 최종 결과면 확정된 키워드 반환, 아니면 빈 배열 반환
  if (isFinal) {
    return frequencyAnalyzer.getConfirmedKeywords();
  }
  return [];
};

// 외부에서 분석기 초기화용
export const resetKeywordTracker = () => {
  frequencyAnalyzer.reset();
};
