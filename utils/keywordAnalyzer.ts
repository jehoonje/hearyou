// keywordAnalyzer.ts

// 빈도 기반 키워드 분석기 (30초 내 두 번 이상 언급된 단어 감지)
class FrequencyAnalyzer {
  private wordFrequency: Map<
    string,
    { count: number; lastMentionTime: number; firstMentionTime: number }
  > = new Map();
  private readonly TIME_WINDOW = 30000; // 30초 시간 창 (밀리초)
  private readonly MIN_FREQUENCY = 2; // 최소 출현 빈도
  private confirmedKeywords: Set<string> = new Set();
  private readonly MIN_WORD_LENGTH = 2; // 최소 단어 길이 (한글 2글자 이상)

  private lastProcessedText: string = "";
  private lastProcessTime: number = 0;
  private readonly DUPLICATE_PROCESS_THRESHOLD = 1000; // 1초 내 동일 텍스트 중복 처리 방지

  processText(text: string, isFinal: boolean): void {
    if (!isFinal) {
      return;
    }

    const now = Date.now();

    // 🔥 [수정] 이전에 제가 잘못 수정한 부분입니다.
    // 맵에 없는 단어의 시간을 확인하는 대신, 이전에 처리된 텍스트와 시간만을 비교하는 원래의 올바른 로직으로 되돌립니다.
    if (
      text === this.lastProcessedText &&
      now - this.lastProcessTime < this.DUPLICATE_PROCESS_THRESHOLD
    ) {
      return;
    }

    this.lastProcessedText = text;
    this.lastProcessTime = now; // 🔥 lastProcessTime을 여기서 갱신합니다.

    const wordRegex = new RegExp(`[가-힣]{${this.MIN_WORD_LENGTH},}`, "g");
    const words = text.match(wordRegex) || [];

    const stopWords = new Set([
      "그리고", "하지만", "그래서", "또한", "그런데", "이것은", "저것은",
      "이렇게", "그러나", "그래도", "그러면", "그러므로", "왜냐하면",
      "이것이", "저것이", "그것은", "그것이", "그것을", "이것을", "저것을",
      "이거는", "저거는", "은", "는", "이", "가", "을", "를", "에게", "에서",
      "으로", "하다", "이다", "있다", "없다", "되다", "하는", "있는",
      "없는", "되는", "그냥", "정말", "진짜", "좀", "막", "뭔가", "이런",
      "저런", "그런", "어떤", "무슨",
    ]);

    for (const word of words) {
      if (stopWords.has(word)) {
        continue;
      }

      const currentData = this.wordFrequency.get(word);

      if (currentData) {
        currentData.count += 1;
        currentData.lastMentionTime = now;

        if (currentData.count >= this.MIN_FREQUENCY) {
          const timeSinceFirst = now - currentData.firstMentionTime;
          if (timeSinceFirst <= this.TIME_WINDOW) {
            this.confirmedKeywords.add(word);
          } else {
            this.wordFrequency.set(word, {
              count: 1,
              lastMentionTime: now,
              firstMentionTime: now,
            });
          }
        }
      } else {
        this.wordFrequency.set(word, {
          count: 1,
          lastMentionTime: now,
          firstMentionTime: now,
        });
      }
    }

    this.cleanupOldWords(now);
  }

  private cleanupOldWords(now: number): void {
    this.wordFrequency.forEach((data, word) => {
      if (now - data.lastMentionTime > this.TIME_WINDOW) {
        this.wordFrequency.delete(word);
      }
    });
  }

  getConfirmedKeywords(): string[] {
    const keywords = Array.from(this.confirmedKeywords);
    if (keywords.length > 0) {
      this.confirmedKeywords.clear();
    }
    return keywords;
  }

  reset(): void {
    this.wordFrequency.clear();
    this.confirmedKeywords.clear();
    this.lastProcessedText = "";
    this.lastProcessTime = 0;
  }
}

const frequencyAnalyzer = new FrequencyAnalyzer();

export const analyzeKeywords = (
  transcript: string,
  isFinal: boolean,
  confidence: number
): string[] => {
  if (confidence < 0.3) {
    return [];
  }

  if (isFinal) {
    frequencyAnalyzer.processText(transcript, isFinal);
    return frequencyAnalyzer.getConfirmedKeywords();
  }

  return [];
};

export const resetKeywordTracker = () => {
  frequencyAnalyzer.reset();
};