import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Keyword } from '../types';
import { fetchKeywords } from '../utils/fetchKeywords';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const useKeywords = (
  user: User | null,
  isLoading: boolean,
  initialKeywords?: Keyword[] | null
) => {
  const [keywordList, setKeywordList] = useState<Keyword[]>(initialKeywords || []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supabase = createClientComponentClient();

  // 키워드 새로고침 함수
  const refreshKeywords = useCallback(async () => {
    if (!user) return;
    
    console.log('[useKeywords] 키워드 새로고침 시작');
    setIsRefreshing(true);
    
    try {
      const keywords = await fetchKeywords(user);
      console.log('[useKeywords] 새로고침 완료:', keywords);
      if (keywords) {
        setKeywordList(keywords);
      }
    } catch (error) {
      console.error('[useKeywords] 새로고침 오류:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  // 최초 렌더링 시 초기 데이터 설정 또는 새로 불러오기
  useEffect(() => {
    console.log('[useKeywords] 상태 업데이트', { 
      userId: user?.id, 
      isLoading, 
      initialKeywordsCount: initialKeywords?.length 
    });
    
    if (!isLoading && user) {
      if (initialKeywords && initialKeywords.length > 0) {
        console.log('[useKeywords] 초기 키워드 설정:', initialKeywords);
        setKeywordList(initialKeywords);
      } else {
        refreshKeywords();
      }
    }
  }, [user, isLoading, initialKeywords, refreshKeywords]);

  // 키워드 추가 함수 (즉시 UI 업데이트용)
  const addOrUpdateKeyword = useCallback((newKeyword: Keyword) => {
    setKeywordList(prevList => {
      // 이미 목록에 있는지 확인
      const existingIndex = prevList.findIndex(k => k.keyword === newKeyword.keyword);
      
      if (existingIndex >= 0) {
        // 기존 키워드 업데이트
        const newList = [...prevList];
        newList[existingIndex] = newKeyword;
        // 카운트 기준 정렬
        return newList.sort((a, b) => b.count - a.count);
      } else {
        // 새 키워드 추가
        return [...prevList, newKeyword].sort((a, b) => b.count - a.count);
      }
    });
  }, []);

  // 실시간 데이터베이스 변경 구독
  useEffect(() => {
    if (!user || !user.id) return;
    
    console.log('[useKeywords] 실시간 구독 설정');
    
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
          console.log('[useKeywords] 변경 감지:', payload);
          
          // 변경 유형에 따른 처리
          if (payload.eventType === 'INSERT') {
            // 새 키워드 추가
            const newKeyword = payload.new as Keyword;
            console.log('[useKeywords] 새 키워드 추가:', newKeyword);
            addOrUpdateKeyword(newKeyword);
          } 
          else if (payload.eventType === 'UPDATE') {
            // 키워드 업데이트
            const updatedKeyword = payload.new as Keyword;
            console.log('[useKeywords] 키워드 업데이트:', updatedKeyword);
            addOrUpdateKeyword(updatedKeyword);
          }
          else if (payload.eventType === 'DELETE') {
            // 키워드 삭제
            const deletedKeyword = payload.old as Keyword;
            console.log('[useKeywords] 키워드 삭제:', deletedKeyword);
            
            setKeywordList(prevList => 
              prevList.filter(k => k.id !== deletedKeyword.id)
            );
          }
        }
      )
      .subscribe();
      
    return () => {
      console.log('[useKeywords] 구독 정리');
      supabase.removeChannel(channel);
    };
  }, [supabase, user, addOrUpdateKeyword]);

  return { 
    keywordList, 
    isRefreshing,
    refreshKeywords,
    addOrUpdateKeyword  // UI 즉시 업데이트용 함수 노출
  };
};
