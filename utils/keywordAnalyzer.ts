// 키워드 분석 민감도 개선
const TARGET_KEYWORDS = ['안녕', '피자', '여행', '구매', '쇼핑', '호텔', '영화', '음식'];

// 유사 매칭을 위한 도우미 함수
const fuzzyMatch = (text: string, keyword: string): number => {
  // 포함 여부 확인 (부분 일치)
  if (text.includes(keyword)) return 1.0;
  
  // 단순 레벤슈타인 거리 계산 (편집 거리 - 유사도 측정)
  const calculateEditDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let i = 0; i <= a.length; i++) {
      matrix[0][i] = i;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // 삭제
          matrix[i][j - 1] + 1, // 삽입
          matrix[i - 1][j - 1] + cost // 대체
        );
      }
    }

    return matrix[b.length][a.length];
  };

  // 최대 허용 편집 거리: 키워드 길이의 1/3 (한글의 경우 자소 단위로 계산하면 더 정확)
  const maxDistance = Math.max(1, Math.floor(keyword.length / 3));
  const distance = calculateEditDistance(text, keyword);
  
  // 거리를 0~1 사이의 유사도 점수로 변환 (1이 완전 일치)
  const similarityScore = Math.max(0, 1 - distance / Math.max(text.length, keyword.length));
  
  // 일정 유사도 이상이면 매칭으로 간주
  return similarityScore > 0.7 ? similarityScore : 0;
};

// 키워드 후보와 확정 키워드를 관리하는 클래스
class KeywordTracker {
  private candidates: Map<string, { count: number, timestamp: number, score: number }> = new Map();
  private confirmedKeywords: Set<string> = new Set();
  private readonly CONFIRMATION_THRESHOLD = 1.5; // 낮춤: 민감도 증가
  private readonly CANDIDATE_EXPIRY = 15000; // 늘림: 후보 유지 시간 증가 (15초)
  private readonly MIN_SIMILARITY_SCORE = 0.65; // 유사도 임계값
  
  addCandidate(keyword: string, similarityScore: number = 1.0): void {
    const now = Date.now();
    const currentData = this.candidates.get(keyword);
    
    // 유사도가 임계값 이상인 경우만 처리
    if (similarityScore < this.MIN_SIMILARITY_SCORE) return;
    
    // 유사도에 따른 가중치 계산
    const weight = similarityScore >= 0.9 ? 1.0 : similarityScore;
    
    if (currentData) {
      // 기존 후보 업데이트 - 가중치를 고려한 점수 누적
      const updatedScore = currentData.score + weight;
      this.candidates.set(keyword, {
        count: currentData.count + 1,
        timestamp: now,
        score: updatedScore
      });
      
      // 누적 점수가 임계값 이상이면 확정 키워드로 승격
      if (updatedScore >= this.CONFIRMATION_THRESHOLD) {
        this.confirmedKeywords.add(keyword);
      }
    } else {
      // 새 후보 추가
      this.candidates.set(keyword, { 
        count: 1,
        timestamp: now,
        score: weight
      });
      
      // 첫 발견이지만 유사도가 매우 높으면 즉시 확정
      if (similarityScore >= 0.95) {
        this.confirmedKeywords.add(keyword);
      }
    }
    
    // 오래된 후보 제거
    this.cleanupCandidates();
  }
  
  private cleanupCandidates(): void {
    const now = Date.now();
    Array.from(this.candidates.keys()).forEach(keyword => {
      const data = this.candidates.get(keyword);
      if (data && now - data.timestamp > this.CANDIDATE_EXPIRY) {
        this.candidates.delete(keyword);
      }
    });
  }
  
  getConfirmedKeywords(): string[] {
    const result = Array.from(this.confirmedKeywords);
    this.confirmedKeywords.clear(); // 반환 후 초기화
    return result;
  }
  
  reset(): void {
    this.candidates.clear();
    this.confirmedKeywords.clear();
  }
}

// 동의어 및 변형 처리를 위한 매핑
const KEYWORD_VARIANTS: Record<string, string[]> = {
  '안녕': ['안녕하세요', '안녕히', '반갑', '반가워'],
  '피자': ['피자를', '피자가', '피짜', '피자는', '피자에'],
  '여행': ['여행을', '여행지', '여행가', '여행은', '트립', '관광'],
  '구매': ['구매를', '구매하', '구입', '구입하', '사다', '사자', '구매합'],
  '쇼핑': ['쇼핑을', '쇼핑몰', '쇼핑은', '쇼핑하', '쇼핑할'],
  '호텔': ['호텔을', '호텔에', '호텔은', '숙소', '숙박'],
  '영화': ['영화를', '영화는', '영화가', '무비', '영화관'],
  '음식': ['음식을', '음식은', '음식이', '먹을', '식사', '요리']
};

// 싱글톤 인스턴스
const keywordTracker = new KeywordTracker();

export const analyzeKeywords = (
  transcript: string,
  isFinal: boolean,
  confidence: number
): string[] => {
  // 신뢰도 임계값 낮춤 - 더 민감하게
  if (confidence < 0.3) {
    return [];
  }
  
  // 최종 결과와 중간 결과 모두 처리 (중간 결과도 활용)
  // 단, 중간 결과는 더 높은 신뢰도 요구
  if (!isFinal && confidence < 0.5) {
    return [];
  }
  
  // 자연어 처리를 위한 전처리
  const normalizedText = transcript.toLowerCase().trim();
  const detectedKeywords: string[] = [];
  
  // 1. 정확한 키워드 매칭
  for (const keyword of TARGET_KEYWORDS) {
    // 단어 경계 고려하여 매칭
    const wordBoundaryPattern = new RegExp(`(^|[^가-힣a-z])${keyword}([^가-힣a-z]|$)`, 'i');
    const exactMatch = wordBoundaryPattern.test(normalizedText);
    
    if (exactMatch) {
      keywordTracker.addCandidate(keyword, 1.0);
      detectedKeywords.push(keyword);
    } else {
      // 2. 퍼지 매칭 (유사도 기반)
      const similarityScore = fuzzyMatch(normalizedText, keyword);
      if (similarityScore > 0) {
        keywordTracker.addCandidate(keyword, similarityScore);
        if (similarityScore > 0.85) {
          detectedKeywords.push(keyword);
        }
      }
      
      // 3. 동의어 및 변형 검사
      const variants = KEYWORD_VARIANTS[keyword] || [];
      for (const variant of variants) {
        if (normalizedText.includes(variant)) {
          keywordTracker.addCandidate(keyword, 0.9); // 변형은 약간 낮은 가중치
          detectedKeywords.push(keyword);
          break;
        }
      }
    }
  }
  
  // 4. N-gram 분석 (단어 분리해서 각각 확인)
  const words = normalizedText.split(/\s+/);
  for (const word of words) {
    if (word.length < 2) continue; // 너무 짧은 단어는 무시
    
    for (const keyword of TARGET_KEYWORDS) {
      // 단어 내에 키워드가 포함되어 있는지
      if (word.includes(keyword)) {
        keywordTracker.addCandidate(keyword, 0.8); // 부분 포함은 낮은 가중치
      }
    }
  }
  
  // 확정된 키워드 반환과 함께 현재 감지된 키워드도 반환 (중복 제거)
  const confirmedKeywords = keywordTracker.getConfirmedKeywords();
  return Array.from(new Set([...confirmedKeywords, ...detectedKeywords]));
};

// 외부에서 키워드 트래커 초기화용
export const resetKeywordTracker = () => {
  keywordTracker.reset();
};
