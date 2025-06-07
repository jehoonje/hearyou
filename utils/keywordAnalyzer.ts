// keywordAnalyzer.ts - 개선된 동적 키워드 감지 시스템

// 불용어 목록 (키워드로 감지하지 않을 단어들)
const STOP_WORDS = new Set([
  // 조사
  '이', '가', '을', '를', '은', '는', '에', '에서', '으로', '로', '와', '과', '의', '에게', '한테', '께',
  // 대명사
  '나', '너', '우리', '저희', '그', '그녀', '이것', '저것', '그것',
  // 수사
  '첫', '두', '세', '네', '다섯',
  // 기타 일반적인 단어
  '수', '것', '등', '때', '중', '더', '덜', '좀', '잘', '못', '안',
  // 영어 불용어
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 's'
]);

// 단어 추출 함수 개선
const extractWords = (text: string): string[] => {
  // 소문자로 변환
  const lowerText = text.toLowerCase();
  
  // 특수문자 제거하고 공백으로 치환 (한글, 영어, 숫자만 남김)
  const cleaned = lowerText.replace(/[^가-힣a-z0-9\s]/g, ' ');
  
  // 공백으로 분리
  const words = cleaned.split(/\s+/).filter(word => word.length > 0);
  
  // 불용어 제거 및 최소 길이 필터링
  return words.filter(word => {
    // 2글자 미만 제거
    if (word.length < 2) return false;
    // 불용어 제거
    if (STOP_WORDS.has(word)) return false;
    // 숫자만으로 된 단어 제거
    if (/^\d+$/.test(word)) return false;
    // 영어는 3글자 이상만
    if (/^[a-z]+$/.test(word) && word.length < 3) return false;
    
    return true;
  });
};

// 키워드 후보와 확정 키워드를 관리하는 클래스
class DynamicKeywordTracker {
  private wordOccurrences: Map<string, { 
    count: number, 
    firstSeen: number, 
    lastSeen: number,
    contexts: Set<string> // transcript 대신 더 긴 컨텍스트 저장
  }> = new Map();
  
  // 최근 확정된 키워드 추적 (재확정 방지)
  private recentlyConfirmedKeywords: Map<string, number> = new Map();
  
  // 30초 내 2번 언급 규칙
  private readonly CONFIRMATION_COUNT = 2;
  private readonly TIME_WINDOW = 30000; // 30초
  private readonly MIN_TIME_BETWEEN_COUNTS = 2000; // 최소 2초 간격으로 증가
  private readonly CONFIRMATION_COOLDOWN = 5000; // 확정 후 5초 쿨다운

  processTranscript(transcript: string, isFinal: boolean): string[] {
    const now = Date.now();
    const words = extractWords(transcript);
    
    console.log(`[KeywordTracker] 처리: "${transcript}" (${isFinal ? '최종' : '중간'})`);
    console.log(`[KeywordTracker] 추출된 단어들:`, words);
    
    // 최종 결과만 처리 (중간 결과는 무시)
    if (!isFinal) {
      return [];
    }
    
    const newlyConfirmedKeywords: string[] = [];
    
    // 컨텍스트 생성 (처음 20자)
    const context = transcript.substring(0, 20);
    
    // 각 단어 처리
    for (const word of words) {
      const confirmedKeyword = this.addWordOccurrence(word, now, context);
      if (confirmedKeyword) {
        newlyConfirmedKeywords.push(confirmedKeyword);
      }
    }
    
    // 오래된 단어 정리
    this.cleanupOldWords();
    
    // 오래된 확정 기록 정리
    this.cleanupRecentlyConfirmed();
    
    return newlyConfirmedKeywords;
  }

  private addWordOccurrence(word: string, timestamp: number, context: string): string | null {
    // 최근에 확정된 키워드인지 확인
    const lastConfirmed = this.recentlyConfirmedKeywords.get(word);
    if (lastConfirmed && (timestamp - lastConfirmed) < this.CONFIRMATION_COOLDOWN) {
      console.log(`[KeywordTracker] "${word}"는 최근 확정됨 (${Math.round((this.CONFIRMATION_COOLDOWN - (timestamp - lastConfirmed)) / 1000)}초 쿨다운)`);
      return null;
    }
    
    const existing = this.wordOccurrences.get(word);
    
    if (existing) {
      // 이미 이 컨텍스트에서 카운트했는지 확인
      if (existing.contexts.has(context)) {
        return null; // 같은 컨텍스트에서는 중복 카운트 안함
      }
      
      // 마지막 카운트와의 시간 간격 확인
      if (timestamp - existing.lastSeen < this.MIN_TIME_BETWEEN_COUNTS) {
        console.log(`[KeywordTracker] "${word}" 너무 빠른 재언급 (${timestamp - existing.lastSeen}ms)`);
        return null; // 너무 빠른 중복 카운트 방지
      }
      
      // 시간 윈도우 확인
      const timeElapsed = timestamp - existing.firstSeen;
      if (timeElapsed > this.TIME_WINDOW) {
        // 30초가 지났으면 새로운 추적 시작
        console.log(`[KeywordTracker] "${word}" 시간 초과, 새로운 추적 시작`);
        this.wordOccurrences.set(word, {
          count: 1,
          firstSeen: timestamp,
          lastSeen: timestamp,
          contexts: new Set([context])
        });
        return null;
      }
      
      // 카운트 증가
      existing.count++;
      existing.lastSeen = timestamp;
      existing.contexts.add(context);
      
      console.log(`[KeywordTracker] "${word}" ${existing.count}번째 발견 (${timeElapsed}ms 경과)`);
      
      // 30초 내에 2번 이상 언급되면 키워드로 확정
      if (existing.count >= this.CONFIRMATION_COUNT) {
        console.log(`[KeywordTracker] ✅ "${word}" 키워드 확정!`);
        this.recentlyConfirmedKeywords.set(word, timestamp);
        // 확정된 키워드는 추적에서 제거
        this.wordOccurrences.delete(word);
        return word;
      }
    } else {
      // 첫 번째 발견
      console.log(`[KeywordTracker] "${word}" 첫 번째 발견`);
      this.wordOccurrences.set(word, {
        count: 1,
        firstSeen: timestamp,
        lastSeen: timestamp,
        contexts: new Set([context])
      });
    }
    
    return null;
  }

  private cleanupOldWords(): void {
    const now = Date.now();
    
    for (const [word, data] of Array.from(this.wordOccurrences.entries())) {
      // 30초가 지났고 확정되지 않은 단어는 제거
      if ((now - data.firstSeen) > this.TIME_WINDOW) {
        console.log(`[KeywordTracker] "${word}" 제거 (시간 초과, count: ${data.count})`);
        this.wordOccurrences.delete(word);
      }
    }
  }

  private cleanupRecentlyConfirmed(): void {
    const now = Date.now();
    
    for (const [word, timestamp] of Array.from(this.recentlyConfirmedKeywords.entries())) {
      if ((now - timestamp) > this.CONFIRMATION_COOLDOWN) {
        console.log(`[KeywordTracker] "${word}" 확정 기록 제거`);
        this.recentlyConfirmedKeywords.delete(word);
      }
    }
  }

  // 디버깅용 메서드
  getStatus(): any {
    const now = Date.now();
    return {
      wordOccurrences: Array.from(this.wordOccurrences.entries()).map(([word, data]) => ({
        word,
        count: data.count,
        timeElapsed: now - data.firstSeen,
        needsMore: Math.max(0, this.CONFIRMATION_COUNT - data.count),
        willExpireIn: Math.max(0, this.TIME_WINDOW - (now - data.firstSeen))
      })),
      recentlyConfirmed: Array.from(this.recentlyConfirmedKeywords.entries()).map(([word, timestamp]) => ({
        word,
        cooldownRemaining: Math.max(0, this.CONFIRMATION_COOLDOWN - (now - timestamp))
      }))
    };
  }

  reset(): void {
    console.log('[KeywordTracker] 리셋');
    this.wordOccurrences.clear();
    this.recentlyConfirmedKeywords.clear();
  }
}

// 싱글톤 인스턴스
const keywordTracker = new DynamicKeywordTracker();

// 디버깅용 전역 접근
if (typeof window !== 'undefined') {
  (window as any).keywordTracker = keywordTracker;
}

export const analyzeKeywords = (
  transcript: string,
  isFinal: boolean,
  confidence: number
): string[] => {
  // 너무 낮은 신뢰도는 무시
  if (confidence < 0.3) {
    return [];
  }
  
  // 빈 트랜스크립트 무시
  if (!transcript.trim()) {
    return [];
  }
  
  // 트랜스크립트 처리하고 새로 확정된 키워드만 반환
  const confirmedKeywords = keywordTracker.processTranscript(transcript, isFinal);
  
  return confirmedKeywords;
};

// 키워드 트래커 초기화
export const resetKeywordTracker = () => {
  console.log('[analyzeKeywords] 키워드 트래커 리셋');
  keywordTracker.reset();
};