// src/utils/keywordAnalyzer.ts

// 빈도 기반 키워드 분석기 (30초 내 두 번 이상 언급된 단어 감지)
class FrequencyAnalyzer {
  // --- 타입 정의 수정: firstMentionTime 추가 ---
  private wordFrequency: Map<string, { count: number, lastMentionTime: number, firstMentionTime: number }> = new Map();
  // -----------------------------------------
  private readonly TIME_WINDOW = 30000; // 30초 시간 창 (밀리초)
  private readonly MIN_FREQUENCY = 2; // 최소 출현 빈도
  private confirmedKeywords: Set<string> = new Set();
  private readonly MIN_WORD_LENGTH = 2; // 최소 단어 길이 (한글 2글자 이상)

  // 텍스트에서 단어를 추출하고 빈도 갱신
  processText(text: string): void {
    const now = Date.now();
    const wordRegex = new RegExp(`[가-힣]{${this.MIN_WORD_LENGTH},}`, 'g');
    const words = text.match(wordRegex) || [];

    const stopWords = new Set([
      '그리고', '하지만', '그래서', '또한', '그런데', '이것은', '저것은', '이렇게',
      '그러나', '그래도', '그러면', '그러므로', '왜냐하면', '이것이', '저것이',
      '그것은', '그것이', '그것을', '이것을', '저것을', '이거는', '저거는',
      '은', '는', '이', '가', '을', '를', '에게', '에서', '으로', '하다', '이다'
    ]);

    for (const word of words) {
      if (stopWords.has(word)) continue;

      const currentData = this.wordFrequency.get(word);

      if (currentData) {
        // 기존 단어 업데이트
        currentData.count += 1;
        currentData.lastMentionTime = now; // lastMentionTime은 항상 업데이트

        // 최소 빈도 충족 확인
        if (currentData.count >= this.MIN_FREQUENCY) {
          // 확정 시점에도 시간 창(첫 언급 기준) 체크
          // 'data' -> 'currentData' 로 변수명 일치시킴 (오류1과 간접 관련)
          if (now - currentData.firstMentionTime <= this.TIME_WINDOW) {
            this.confirmedKeywords.add(word);
          } else {
            // 시간 창이 지났으면 해당 단어의 빈도 기록 리셋하고 다시 시작
            // (현재 언급이 새로운 시작점이 됨)
            this.wordFrequency.set(word, {
              count: 1,
              lastMentionTime: now,
              firstMentionTime: now // 리셋 시점의 시간을 firstMentionTime으로 설정
            });
            // 리셋 시에는 confirmedKeywords에 추가하지 않음
          }
        }
        // 최소 빈도 미달 시에는 lastMentionTime만 업데이트된 상태로 둠
      } else {
        // 새 단어: firstMentionTime 포함하여 맵에 추가
        this.wordFrequency.set(word, {
          count: 1,
          lastMentionTime: now,
          firstMentionTime: now // 처음 언급된 시간 기록
        });
      }
    }

    this.cleanupOldWords();
  }

  // 30초가 지난 단어 제거 (마지막 언급 시간 기준)
  private cleanupOldWords(): void {
    const now = Date.now();
    Array.from(this.wordFrequency.keys()).forEach(word => {
      const data = this.wordFrequency.get(word);
      // 마지막 언급 시간 기준으로 TIME_WINDOW 초과 시 제거
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
  if (confidence < 0.3) {
    return [];
  }

  // frequencyAnalyzer.processText(transcript);

  // 최종 결과일 때만 확정된 키워드 반환
  if (isFinal) {
    frequencyAnalyzer.processText(transcript); // 최종 텍스트로 빈도수 업데이트
    const confirmed = frequencyAnalyzer.getConfirmedKeywords();
    // 확정된 키워드가 있을 때만 로그 출력 (선택 사항)
    if (confirmed.length > 0) {
       ////console.log(`[analyzeKeywords] Final result. Confirmed: ${confirmed.join(', ')}`);
    }
    return confirmed;
  }

  return [];
};

// 외부에서 분석기 초기화용
export const resetKeywordTracker = () => {
  //console.log("[resetKeywordTracker] FrequencyAnalyzer reset.");
  frequencyAnalyzer.reset();
};