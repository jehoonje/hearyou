import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Keyword } from '../types';
import { fetchKeywords } from '../utils/fetchKeywords';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../app/contexts/AuthContext';

export const useKeywords = (
  user: User | null,
  isLoading: boolean,
  initialKeywords?: Keyword[] | null
) => {
  const [keywordList, setKeywordList] = useState<Keyword[]>(initialKeywords || []);
  const [demoKeywordList, setDemoKeywordList] = useState<Keyword[]>([]); // 데모 키워드 별도 관리
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supabase = createClientComponentClient();
  const { isDemoUser } = useAuth(); // 데모 사용자 여부 확인

  // 키워드 새로고침 함수 (데모 모드에서는 동작하지 않음)
  const refreshKeywords = useCallback(async () => {
    if (!user || isDemoUser) return;
    
    setIsRefreshing(true);
    
    try {
      const keywords = await fetchKeywords(user);
      if (keywords) {
        setKeywordList(keywords);
      }
    } catch (error) {
      console.error('[useKeywords] 새로고침 실패:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [user, isDemoUser]);

  // 최초 렌더링 시 초기 데이터 설정
  useEffect(() => {
    if (!isLoading && user) {
      if (isDemoUser) {
        // 데모 사용자는 빈 배열로 시작
        setDemoKeywordList([]);
      } else if (initialKeywords && initialKeywords.length > 0) {
        setKeywordList(initialKeywords);
      } else {
        refreshKeywords();
      }
    }
  }, [user, isLoading, initialKeywords, refreshKeywords, isDemoUser]);

  // 키워드 추가 함수 (데모 모드 지원)
  const addOrUpdateKeyword = useCallback((newKeyword: Keyword | string) => {
    if (isDemoUser) {
      // 데모 모드: 문자열로 키워드만 받아서 처리
      const keyword = typeof newKeyword === 'string' ? newKeyword : newKeyword.keyword;
      
      setDemoKeywordList(prevList => {
        const existingIndex = prevList.findIndex(k => k.keyword === keyword);
        
        if (existingIndex >= 0) {
          // 기존 키워드 카운트 증가
          const newList = [...prevList];
          newList[existingIndex] = {
            ...newList[existingIndex],
            count: newList[existingIndex].count + 1,
          };
          return newList.sort((a, b) => b.count - a.count);
        } else {
          // 새 키워드 추가
          const demoKeyword: Keyword = {
            id: Date.now(), // number 타입으로 변경
            keyword,
            count: 1,
            created_at: new Date().toISOString(),
            user_id: 'demo-user'
          };
          return [...prevList, demoKeyword].sort((a, b) => b.count - a.count);
        }
      });
    } else {
      // 정식 사용자 모드
      const keywordObj = typeof newKeyword === 'string' 
        ? { keyword: newKeyword } as Keyword 
        : newKeyword;
        
      setKeywordList(prevList => {
        const existingIndex = prevList.findIndex(k => k.keyword === keywordObj.keyword);
        
        if (existingIndex >= 0) {
          const newList = [...prevList];
          newList[existingIndex] = keywordObj;
          return newList.sort((a, b) => b.count - a.count);
        } else {
          return [...prevList, keywordObj].sort((a, b) => b.count - a.count);
        }
      });
    }
  }, [isDemoUser]);

  // 실시간 데이터베이스 변경 구독 (데모 모드에서는 비활성화)
  useEffect(() => {
    if (!user || !user.id || isDemoUser) return;
    
    const channel = supabase
      .channel('keywords-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'keywords',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const keyword = payload.new as Keyword;
            addOrUpdateKeyword(keyword);
          }
          else if (payload.eventType === 'DELETE') {
            const deletedKeyword = payload.old as Keyword;
            setKeywordList(prevList => 
              prevList.filter(k => k.id !== deletedKeyword.id)
            );
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user, addOrUpdateKeyword, isDemoUser]);

  // 데모 모드 종료 시 데모 키워드 초기화
  useEffect(() => {
    if (!isDemoUser && demoKeywordList.length > 0) {
      setDemoKeywordList([]);
    }
  }, [isDemoUser, demoKeywordList.length]);

  return { 
    keywordList: isDemoUser ? demoKeywordList : keywordList, // 데모/정식 사용자에 따라 다른 리스트 반환
    isRefreshing,
    refreshKeywords,
    addOrUpdateKeyword
  };
};