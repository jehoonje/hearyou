// src/utils/keywordAnalyzer.ts

// 빈도 기반 키워드 분석기 (30초 내 두 번 이상 언급된 단어 감지)
class FrequencyAnalyzer {
  // --- 타입 정의 수정: firstMentionTime 추가 ---
  private wordFrequency: Map<
    string,
    { count: number; lastMentionTime: number; firstMentionTime: number }
  > = new Map();
  // -----------------------------------------
  private readonly TIME_WINDOW = 30000; // 30초 시간 창 (밀리초)
  private readonly MIN_FREQUENCY = 2; // 최소 출현 빈도
  private confirmedKeywords: Set<string> = new Set();
  private readonly MIN_WORD_LENGTH = 2; // 최소 단어 길이 (한글 2글자 이상)

  // 🔥 네이티브 환경에서 중복 처리 방지를 위한 추가 상태
  private lastProcessedText: string = "";
  private lastProcessTime: number = 0;
  private readonly DUPLICATE_PROCESS_THRESHOLD = 1000; // 1초 내 동일 텍스트 중복 처리 방지

  // 텍스트에서 단어를 추출하고 빈도 갱신
  processText(text: string, isFinal: boolean = true): void {
    const now = Date.now();

    // 🔥 중복 처리 방지: 네이티브 환경에서 동일한 텍스트가 짧은 시간 내에 반복 처리되는 것을 방지
    if (
      text === this.lastProcessedText &&
      now - this.lastProcessTime < this.DUPLICATE_PROCESS_THRESHOLD
    ) {
      console.log(`[KeywordAnalyzer] 중복 텍스트 처리 방지: "${text}"`);
      return;
    }

    // 🔥 최종 결과가 아닌 경우에는 처리하지 않음 (네이티브에서 중간 결과도 isFinal=true로 올 수 있으므로 별도 체크 필요)
    if (!isFinal) {
      console.log(`[KeywordAnalyzer] 중간 결과 무시: "${text}"`);
      return;
    }

    this.lastProcessedText = text;
    this.lastProcessTime = now;

    const wordRegex = new RegExp(`[가-힣]{${this.MIN_WORD_LENGTH},}`, "g");
    const words = text.match(wordRegex) || [];

    const stopWords = new Set([
      "그리고",
      "하지만",
      "그래서",
      "또한",
      "그런데",
      "이것은",
      "저것은",
      "이렇게",
      "그러나",
      "그래도",
      "그러면",
      "그러므로",
      "왜냐하면",
      "이것이",
      "저것이",
      "그것은",
      "그것이",
      "그것을",
      "이것을",
      "저것을",
      "이거는",
      "저거는",
      "은",
      "는",
      "이",
      "가",
      "을",
      "를",
      "에게",
      "에서",
      "으로",
      "하다",
      "이다",
      "있다",
      "없다",
      "되다",
      "하는",
      "있는",
      "없는",
      "되는",
      "그냥",
      "정말",
      "진짜",
      "좀",
      "막",
      "뭔가",
      "이런",
      "저런",
      "그런",
      "어떤",
      "무슨",
    ]);

    console.log(
      `[KeywordAnalyzer] 텍스트 처리 시작: "${text}", 추출된 단어: [${words.join(
        ", "
      )}]`
    );

    for (const word of words) {
      if (stopWords.has(word)) {
        console.log(`[KeywordAnalyzer] 불용어 제외: "${word}"`);
        continue;
      }

      const currentData = this.wordFrequency.get(word);

      if (currentData) {
        // 기존 단어 업데이트
        currentData.count += 1;
        currentData.lastMentionTime = now; // lastMentionTime은 항상 업데이트

        console.log(
          `[KeywordAnalyzer] 기존 단어 업데이트: "${word}" (count: ${
            currentData.count
          }, 첫언급: ${new Date(
            currentData.firstMentionTime
          ).toLocaleTimeString()})`
        );

        // 최소 빈도 충족 확인
        if (currentData.count >= this.MIN_FREQUENCY) {
          // 확정 시점에도 시간 창(첫 언급 기준) 체크
          const timeSinceFirst = now - currentData.firstMentionTime;
          if (timeSinceFirst <= this.TIME_WINDOW) {
            console.log(
              `[KeywordAnalyzer] 키워드 확정: "${word}" (${
                currentData.count
              }회, ${Math.round(timeSinceFirst / 1000)}초 간격)`
            );
            this.confirmedKeywords.add(word);
          } else {
            // 시간 창이 지났으면 해당 단어의 빈도 기록 리셋하고 다시 시작
            console.log(
              `[KeywordAnalyzer] 시간 창 초과로 리셋: "${word}" (${Math.round(
                timeSinceFirst / 1000
              )}초)`
            );
            this.wordFrequency.set(word, {
              count: 1,
              lastMentionTime: now,
              firstMentionTime: now, // 리셋 시점의 시간을 firstMentionTime으로 설정
            });
            // 리셋 시에는 confirmedKeywords에 추가하지 않음
          }
        }
        // 최소 빈도 미달 시에는 lastMentionTime만 업데이트된 상태로 둠
      } else {
        // 새 단어: firstMentionTime 포함하여 맵에 추가
        console.log(`[KeywordAnalyzer] 새 단어 등록: "${word}"`);
        this.wordFrequency.set(word, {
          count: 1,
          lastMentionTime: now,
          firstMentionTime: now, // 처음 언급된 시간 기록
        });
      }
    }

    this.cleanupOldWords();
  }

  // 30초가 지난 단어 제거 (마지막 언급 시간 기준)
  private cleanupOldWords(): void {
    const now = Date.now();
    const wordsToDelete: string[] = [];

    this.wordFrequency.forEach((data, word) => {
      // 마지막 언급 시간 기준으로 TIME_WINDOW 초과 시 제거
      if (now - data.lastMentionTime > this.TIME_WINDOW) {
        wordsToDelete.push(word);
      }
    });

    if (wordsToDelete.length > 0) {
      console.log(
        `[KeywordAnalyzer] 오래된 단어 제거: [${wordsToDelete.join(", ")}]`
      );
      wordsToDelete.forEach((word) => {
        this.wordFrequency.delete(word);
      });
    }
  }

  // 확정된 키워드 반환 및 초기화
  getConfirmedKeywords(): string[] {
    const keywords = Array.from(this.confirmedKeywords);
    console.log(
      `[KeywordAnalyzer] 확정된 키워드 반환: [${keywords.join(", ")}]`
    );
    this.confirmedKeywords.clear();
    return keywords;
  }

  // 모든 상태 초기화
  reset(): void {
    console.log("[KeywordAnalyzer] 전체 상태 리셋");
    this.wordFrequency.clear();
    this.confirmedKeywords.clear();
    this.lastProcessedText = "";
    this.lastProcessTime = 0;
  }

  // 🔥 디버깅을 위한 현재 상태 조회 메서드
  getDebugInfo(): any {
    const words: any[] = [];
    this.wordFrequency.forEach((data, word) => {
      words.push({
        word,
        count: data.count,
        firstMention: new Date(data.firstMentionTime).toLocaleTimeString(),
        lastMention: new Date(data.lastMentionTime).toLocaleTimeString(),
        timeElapsed: Math.round((Date.now() - data.firstMentionTime) / 1000),
      });
    });
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
    frequencyAnalyzer.processText(transcript);
    const confirmed = frequencyAnalyzer.getConfirmedKeywords();
    return confirmed;
  }

  return [];
};

// 외부에서 분석기 초기화용
export const resetKeywordTracker = () => {
  //console.log("[resetKeywordTracker] FrequencyAnalyzer reset.");
  frequencyAnalyzer.reset();
};
