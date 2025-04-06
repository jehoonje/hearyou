import { supabase } from "../lib/supabase";
import { invalidateKeywordsCache } from "./fetchKeywords";

// 디버그 로깅 활성화
const DEBUG = true;

const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[키워드 저장] ${message}`, data || "");
  }
};

export const saveKeyword = async (keyword: string): Promise<boolean> => {
  if (!keyword || keyword.trim() === "") return false;
  
  const normalizedKeyword = keyword.trim().toLowerCase();
  
  try {
    log(`키워드 저장 시작: "${normalizedKeyword}"`);
    
    if (!supabase) {
      throw new Error("Supabase 클라이언트가 초기화되지 않았습니다");
    }
    
    // 현재 인증된 사용자 확인
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      log('인증된 사용자가 없습니다. 키워드를 저장할 수 없습니다.');
      return false;
    }
    
    const userId = userData.user.id;

    // 해당 사용자의 키워드 존재 여부 확인
    const { data, error: fetchError } = await supabase
      .from("keywords")
      .select("id, count")
      .eq("keyword", normalizedKeyword)
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      log(`DB 조회 오류: ${fetchError.message}`);
      throw fetchError;
    }

    if (data) {
      // 기존 키워드 업데이트 (카운트 증가)
      const newCount = data.count + 1;
      log(`기존 키워드 업데이트: id=${data.id}, 현재=${data.count} → ${newCount}`);

      const { error: updateError } = await supabase
        .from("keywords")
        .update({ count: newCount })
        .eq("id", data.id);

      if (updateError) {
        log(`업데이트 오류: ${updateError.message}`);
        throw updateError;
      }

      log(`업데이트 성공: "${normalizedKeyword}" (count: ${newCount})`);
    } else {
      // 새 키워드 삽입
      log(`새 키워드 삽입: "${normalizedKeyword}" (user_id: ${userId})`);

      const { error: insertError } = await supabase
        .from("keywords")
        .insert([{ 
          keyword: normalizedKeyword, 
          count: 1,
          user_id: userId 
        }]);

      if (insertError) {
        log(`삽입 오류: ${insertError.message}`);
        throw insertError;
      }

      log(`삽입 성공: "${normalizedKeyword}"`);
    }

    // 캐시 무효화
    invalidateKeywordsCache();
    return true;
  } catch (error) {
    console.error(`키워드 저장 오류 (${normalizedKeyword}):`, error);
    return false;
  }
};
