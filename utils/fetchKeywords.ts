import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User } from '@supabase/supabase-js';

export interface Keyword {
  id: number;
  keyword: string;
  count: number;
  created_at: string;
  user_id: string;
}

// 사용자별 캐싱
let cachedKeywords: { [userId: string]: Keyword[] } = {};
let lastFetchTime: { [userId: string]: number } = {};
const CACHE_DURATION = 1000; // 1초로 단축

export const fetchKeywords = async (user?: User): Promise<Keyword[] | null> => {
  if (!user || !user.id) {
    console.error('[키워드 조회] 유효한 사용자 정보가 없습니다.');
    return [];
  }
  
  const userId = user.id;
  const now = Date.now();
  
  // 캐시 확인
  if (cachedKeywords[userId] && lastFetchTime[userId] && 
      now - lastFetchTime[userId] < CACHE_DURATION) {
    //console.log('[키워드 조회] 캐시된 데이터 반환:', userId);
    return cachedKeywords[userId];
  }
  
  try {
    //console.log('[키워드 조회] 데이터베이스에서 키워드 가져오기 시작', { userId });
    
    // 매번 새로운 클라이언트 생성
    const supabase = createClientComponentClient();
    
    // 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[키워드 조회] 세션이 없습니다. 인증 상태를 확인하세요.');
      return [];
    }
    
    //console.log(`[키워드 조회] 사용자 ID로 쿼리 실행: ${userId}`);
    
    const { data, error } = await supabase
      .from('keywords')
      .select('id, keyword, count, created_at, user_id')
      .eq('user_id', userId)
      .order('count', { ascending: false })
      .limit(50);

    //console.log('[키워드 조회] 쿼리 결과:', data || 'No data', error || 'No error');

    if (error) {
      console.error('[키워드 조회] 데이터베이스 오류:', error);
      throw error;
    }
    
    //console.log(`[키워드 조회] ${data?.length || 0}개 키워드 조회됨`, data);

    if (!data || data.length === 0) {
      //console.log('[키워드 조회] 조회된 키워드가 없습니다.');
      cachedKeywords[userId] = [];
      lastFetchTime[userId] = now;
      return [];
    }

    const groupedData = Object.values(
      data.reduce((acc: { [key: string]: Keyword }, curr) => {
        if (acc[curr.keyword]) {
          acc[curr.keyword].count += curr.count;
        } else {
          acc[curr.keyword] = curr;
        }
        return acc;
      }, {})
    ).sort((a, b) => b.count - a.count);

    // 사용자별 캐시 업데이트
    cachedKeywords[userId] = groupedData;
    lastFetchTime[userId] = now;
    
    return groupedData;
  } catch (error) {
    console.error('[키워드 조회] 오류:', error);
    return cachedKeywords[userId] || [];
  }
};

// 캐시 무효화 함수
export const invalidateKeywordsCache = (userId?: string) => {
  if (userId) {
    //console.log(`[키워드 조회] 사용자 ${userId}의 캐시 무효화`);
    delete cachedKeywords[userId];
    delete lastFetchTime[userId];
  } else {
    //console.log('[키워드 조회] 모든 캐시 무효화');
    cachedKeywords = {};
    lastFetchTime = {};
  }
};
