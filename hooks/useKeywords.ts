import { useState, useEffect, useCallback } from 'react';
import { fetchKeywords, Keyword } from "../utils/fetchKeywords";
import { User } from "@supabase/supabase-js";

export function useKeywords(user: User | null, isLoading: boolean) {
  const [keywordList, setKeywordList] = useState<Keyword[]>([]);

  // 키워드 목록 조회 함수
  const loadKeywords = useCallback(async () => {
    if (user) {
      const keywords = await fetchKeywords();
      if (keywords) {
        setKeywordList(keywords);
      }
    }
  }, [user]);

  // 주기적으로 키워드 목록 갱신
  useEffect(() => {
    if (!isLoading && user) {
      loadKeywords();
      // 더 긴 간격으로 폴링하여 성능 향상
      const interval = setInterval(loadKeywords, 3000);
      return () => clearInterval(interval);
    }
  }, [isLoading, user, loadKeywords]);

  return { keywordList };
}
