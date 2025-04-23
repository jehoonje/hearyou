import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { invalidateKeywordsCache } from "./fetchKeywords";
import { Keyword } from '../types';

// 디버그 로깅 활성화
const DEBUG = true;

const log = (message: string, data?: any) => {
  if (DEBUG) {
    //console.log(`[키워드 저장] ${message}`, data || "");
  }
};

// 반환 타입을 Keyword로 변경
export const saveKeyword = async (keyword: string, userId: string): Promise<Keyword | null> => {
  if (!keyword || keyword.trim() === "") return null;
  if (!userId) {
    log('유효한 사용자 ID가 제공되지 않았습니다.');
    return null;
  }
  
  const normalizedKeyword = keyword.trim().toLowerCase();
  
  try {
    log(`키워드 저장 시작: "${normalizedKeyword}" (사용자 ID: ${userId})`);
    
    // 매번 새로운 클라이언트 생성
    const supabase = createClientComponentClient();
    
    // 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    log('현재 세션 확인:', session ? '세션 있음' : '세션 없음');
    
    if (!session) {
      log('세션이 없습니다. 인증 상태를 확인하세요.');
      return null;
    }
    
    // 해당 사용자의 키워드 존재 여부 확인
    log(`키워드 조회: ${normalizedKeyword}, 사용자 ID: ${userId}`);
    const { data, error: fetchError } = await supabase
      .from("keywords")
      .select("id, keyword, count, created_at, user_id")
      .eq("keyword", normalizedKeyword)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      log(`DB 조회 오류: ${fetchError.message}`);
      throw fetchError;
    }

    let savedKeyword: Keyword | null = null;

    if (data) {
      // 기존 키워드 업데이트 (카운트 증가)
      const newCount = data.count + 1;
      log(`기존 키워드 업데이트: id=${data.id}, 현재=${data.count} → ${newCount}`);

      const { data: updatedData, error: updateError } = await supabase
        .from("keywords")
        .update({ count: newCount })
        .eq("id", data.id)
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        log(`업데이트 오류: ${updateError.message}`);
        throw updateError;
      }

      log(`업데이트 성공: "${normalizedKeyword}" (count: ${newCount})`);
      savedKeyword = updatedData;
    } else {
      // 새 키워드 삽입
      log(`새 키워드 삽입: "${normalizedKeyword}" (user_id: ${userId})`);

      const { data: insertedData, error: insertError } = await supabase
        .from("keywords")
        .insert([{ 
          keyword: normalizedKeyword, 
          count: 1,
          user_id: userId 
        }])
        .select()
        .single();

      if (insertError) {
        log(`삽입 오류: ${insertError.message}`, insertError);
        throw insertError;
      }

      log(`삽입 성공: "${normalizedKeyword}"`);
      savedKeyword = insertedData;
    }

    // 사용자별 캐시 무효화
    invalidateKeywordsCache(userId);
    
    return savedKeyword;
  } catch (error) {
    console.error(`키워드 저장 오류 (${normalizedKeyword}):`, error);
    return null;
  }
};
