import { supabase } from '../lib/supabase';

export interface Keyword {
  id: number;
  keyword: string;
  count: number;
  created_at: string;
}

// 캐싱을 위한 변수
let cachedKeywords: Keyword[] | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000; // 1초로 단축 (더 빠른 갱신)

export const fetchKeywords = async (): Promise<Keyword[] | null> => {
  const now = Date.now();
  
  // 캐시가 유효하면 캐시된 결과 반환
  if (cachedKeywords && now - lastFetchTime < CACHE_DURATION) {
    return cachedKeywords;
  }
  
  try {
    console.log('[키워드 조회] 데이터베이스에서 키워드 가져오기');
    
    // Supabase 연결 확인
    if (!supabase) {
      console.error('[키워드 조회] Supabase 클라이언트가 초기화되지 않았습니다');
      return null;
    }
    
    const { data, error } = await supabase
      .from('keywords')
      .select('id, keyword, count, created_at')
      .order('count', { ascending: false })
      .limit(50); // 최대 50개까지만 조회 (성능 개선)

    if (error) {
      console.error('[키워드 조회] 데이터베이스 오류:', error);
      throw error;
    }
    
    console.log(`[키워드 조회] ${data?.length || 0}개 키워드 조회됨`);

    if (!data || data.length === 0) {
      return [];
    }

    // 중복 키워드 통합
    const groupedData = Object.values(
      data.reduce((acc: { [key: string]: Keyword }, curr) => {
        if (acc[curr.keyword]) {
          acc[curr.keyword].count += curr.count;
        } else {
          acc[curr.keyword] = {
            id: curr.id,
            keyword: curr.keyword,
            count: curr.count,
            created_at: curr.created_at
          };
        }
        return acc;
      }, {})
    ).sort((a, b) => b.count - a.count); // 내림차순 정렬 보장

    // 캐시 업데이트
    cachedKeywords = groupedData;
    lastFetchTime = now;
    
    return groupedData;
  } catch (error) {
    console.error('[키워드 조회] 오류:', error);
    return cachedKeywords || []; // 오류 시 마지막 캐시 반환 (빈 배열보다 나음)
  }
};

// 캐시 무효화 함수
export const invalidateKeywordsCache = () => {
  console.log('[키워드 조회] 캐시 무효화');
  cachedKeywords = null;
  lastFetchTime = 0;
};
