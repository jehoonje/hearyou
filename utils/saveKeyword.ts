import { supabase } from "../lib/supabase";
import { invalidateKeywordsCache } from "./fetchKeywords";

const keywordCache: Map<
  string,
  { count: number; lastSaved: number; dbCount: number }
> = new Map();
const MIN_INTERVAL = 3000; // 3초 간격
const MAX_BATCH_SIZE = 5;
let batchSaveTimeout: NodeJS.Timeout | null = null;
let saveAttempts = 0;

// 디버그 로깅 활성화
const DEBUG = true;

const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[키워드 저장] ${message}`, data || "");
  }
};

export const saveKeyword = async (keyword: string) => {
  if (keyword.trim() === "") return;

  log(`키워드 저장 요청: "${keyword}"`);

  const now = Date.now();
  const cachedData = keywordCache.get(keyword);

  // 캐시에 키워드 정보 업데이트
  if (cachedData) {
    // 카운트 증가 (항상 증가)
    const newCount = cachedData.count + 1;
    keywordCache.set(keyword, {
      count: newCount,
      lastSaved: cachedData.lastSaved,
      dbCount: cachedData.dbCount || 0,
    });
    log(
      `캐시 업데이트: "${keyword}" (캐시 카운트: ${newCount}, DB 카운트: ${
        cachedData.dbCount || 0
      })`
    );

    // 저장 조건: 마지막 저장 후 일정 시간이 지났거나, 카운트가 일정 수준 이상
    if (now - cachedData.lastSaved >= MIN_INTERVAL || newCount >= 3) {
      log(`저장 조건 충족: "${keyword}" (캐시 카운트: ${newCount})`);

      // DB에 누적 저장
      const success = await saveToDatabase(keyword, newCount);
      if (success) {
        // 저장 성공 시 카운트 리셋 (누적값은 DB에 보존됨)
        const dbCount = (cachedData.dbCount || 0) + newCount;
        keywordCache.set(keyword, {
          count: 0,
          lastSaved: now,
          dbCount: dbCount, // DB에 있는 누적 카운트 기억
        });
        log(`저장 후 캐시 업데이트: "${keyword}" (DB 누적: ${dbCount})`);
      }
    } else {
      // 아직 저장 조건 미충족, 배치 저장 예약
      scheduleBatchSave();
    }
  } else {
    // 새 키워드: DB 확인 후 추가
    log(`새 키워드 감지: "${keyword}"`);

    try {
      // 기존 DB 레코드 확인
      const { data, error } = await supabase
        .from("keywords")
        .select("id, count")
        .eq("keyword", keyword)
        .single();

      if (error && error.code !== "PGRST116") {
        log(`DB 조회 오류: ${error.message}`);
        throw error;
      }

      if (data) {
        // DB에 이미 있는 키워드
        log(`기존 DB 키워드: "${keyword}" (DB 카운트: ${data.count})`);
        keywordCache.set(keyword, {
          count: 1, // 새로 감지된 1회
          lastSaved: now - MIN_INTERVAL - 1000, // 바로 저장 가능하도록
          dbCount: data.count, // 현재 DB 값 기억
        });

        // 즉시 DB 업데이트
        await saveToDatabase(keyword, 1);
      } else {
        // 완전히 새로운 키워드
        log(`완전히 새로운 키워드: "${keyword}"`);
        keywordCache.set(keyword, {
          count: 1,
          lastSaved: 0,
          dbCount: 0,
        });

        // 새 키워드는 즉시 저장
        await saveToDatabase(keyword, 1);
        keywordCache.set(keyword, {
          count: 0,
          lastSaved: now,
          dbCount: 1, // 이제 DB에 1개 있음
        });
      }
    } catch (error) {
      // 오류 시 일단 캐시에 추가
      log(`초기 처리 오류, 캐시만 업데이트: "${keyword}"`);
      keywordCache.set(keyword, {
        count: 1,
        lastSaved: 0,
        dbCount: 0,
      });
      scheduleBatchSave();
    }
  }
};

// 배치 저장 함수 - 기존과 유사하지만 dbCount 추가
const scheduleBatchSave = () => {
  if (batchSaveTimeout) return;

  log("배치 저장 타이머 시작");
  batchSaveTimeout = setTimeout(async () => {
    try {
      log("배치 저장 시작");
      const keywordsToSave: { keyword: string; count: number }[] = [];
      const now = Date.now();

      // 저장할 키워드 수집
      Array.from(keywordCache.keys()).forEach((keyword) => {
        const data = keywordCache.get(keyword);
        if (data && data.count > 0) {
          keywordsToSave.push({ keyword, count: data.count });

          // 저장 예정으로 표시 (성공 시에만 리셋)
          keywordCache.set(keyword, {
            count: 0, // 임시로 0으로 설정
            lastSaved: now,
            dbCount: data.dbCount || 0,
          });

          log(`배치에 추가: "${keyword}" (카운트: ${data.count})`);

          if (keywordsToSave.length >= MAX_BATCH_SIZE) return;
        }
      });

      // 저장할 키워드가 있으면 DB에 저장
      if (keywordsToSave.length > 0) {
        log(`${keywordsToSave.length}개 키워드 배치 저장`);
        const success = await batchSaveToDatabase(keywordsToSave);

        // 실패 시 캐시에 다시 추가, 성공 시 dbCount 업데이트
        keywordsToSave.forEach(({ keyword, count }) => {
          const current = keywordCache.get(keyword);
          if (current) {
            if (!success) {
              // 실패 시 캐시 복원
              keywordCache.set(keyword, {
                count: current.count + count, // 기존 카운트 복원
                lastSaved: current.lastSaved,
                dbCount: current.dbCount,
              });
            } else {
              // 성공 시 DB 카운트 업데이트
              keywordCache.set(keyword, {
                count: current.count, // 이미 0으로 설정됨
                lastSaved: now,
                dbCount: (current.dbCount || 0) + count, // DB 카운트 증가
              });
            }
          }
        });
      }
    } catch (error) {
      console.error("배치 저장 오류:", error);
    } finally {
      batchSaveTimeout = null;

      // 아직 저장할 키워드가 있으면 다시 스케줄링
      const hasMoreToSave = Array.from(keywordCache.values()).some(
        (data) => data.count > 0
      );
      if (hasMoreToSave) {
        scheduleBatchSave();
      }
    }
  }, 2000);
};

// 단일 키워드 저장 - DB 영구 저장
const saveToDatabase = async (
  keyword: string,
  count: number
): Promise<boolean> => {
  try {
    log(`DB 저장 시도: "${keyword}" (카운트: ${count})`);
    saveAttempts++;

    if (!supabase) {
      throw new Error("Supabase 클라이언트가 초기화되지 않았습니다");
    }

    log(`==== DB 요청 #${saveAttempts} - ${keyword} ====`);

    const { data, error: fetchError } = await supabase
      .from("keywords")
      .select("id, count")
      .eq("keyword", keyword)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    if (data) {
      // 중요: 기존 DB 값에 증가값 누적
      const newCount = data.count + count;
      log(
        `기존 키워드 업데이트: id=${data.id}, 현재=${data.count} + ${count} = ${newCount}`
      );

      const { error: updateError } = await supabase
        .from("keywords")
        .update({ count: newCount })
        .eq("id", data.id);

      if (updateError) throw updateError;

      log(`업데이트 성공: "${keyword}" (DB 누적: ${newCount})`);

      // 캐시도 업데이트
      invalidateKeywordsCache();

      return true;
    } else {
      // 새 키워드 삽입
      log(`새 키워드 삽입: "${keyword}" (${count})`);

      const { error: insertError } = await supabase
        .from("keywords")
        .insert([{ keyword, count }]);

      if (insertError) throw insertError;

      log(`삽입 성공: "${keyword}" (${count})`);

      // 캐시 무효화
      invalidateKeywordsCache();

      return true;
    }
  } catch (error: any) {
    console.error(`키워드 저장 오류 (${keyword}):`, error.message || error);
    return false;
  }
};

// 여러 키워드 배치 저장 (결과 반환 추가)
const batchSaveToDatabase = async (keywordsData: { keyword: string, count: number }[]): Promise<boolean> => {
  try {
    if (keywordsData.length === 0) return true;

    // 저장할 항목 로깅
    log(
      `배치 저장 시작: ${keywordsData
        .map((k) => `${k.keyword} (${k.count})`)
        .join(", ")}`
    );

    // 기존 레코드 확인
    const keywords = keywordsData.map((k) => k.keyword);
    const { data: existingData, error: fetchError } = await supabase
      .from("keywords")
      .select("id, keyword, count")
      .in("keyword", keywords);

    if (fetchError) {
      log(`배치 조회 오류: ${fetchError.message}`);
      throw fetchError;
    }

    log(`기존 레코드 조회 결과: ${existingData?.length || 0}개`);

    // 업데이트할 레코드와 삽입할 레코드 분리
    const existingMap = new Map(
      existingData?.map((item) => [item.keyword, item]) || []
    );
    const toUpdate = [];
    const toInsert = [];

    for (const { keyword, count } of keywordsData) {
      const existing = existingMap.get(keyword);
      if (existing) {
        toUpdate.push({
          id: existing.id,
          count: existing.count + count,
          keyword, // 디버깅용
        });
      } else {
        toInsert.push({ keyword, count });
      }
    }

    log(
      `업데이트할 항목: ${toUpdate.length}개, 삽입할 항목: ${toInsert.length}개`
    );

    // 업데이트 수행
    if (toUpdate.length > 0) {
      for (const item of toUpdate) {
        log(`항목 업데이트: ${item.keyword} (${item.count})`);
        const { error } = await supabase
          .from("keywords")
          .update({ count: item.count })
          .eq("id", item.id);

        if (error) {
          log(`배치 업데이트 오류: ${error.message}`);
          throw error;
        }
      }
    }

    // 삽입 수행
    if (toInsert.length > 0) {
      log(
        `일괄 삽입: ${toInsert
          .map((i) => `${i.keyword} (${i.count})`)
          .join(", ")}`
      );
      const { error } = await supabase.from("keywords").insert(toInsert);

      if (error) {
        log(`배치 삽입 오류: ${error.message}`);
        throw error;
      }
    }

    // 성공 처리
    invalidateKeywordsCache();
    log('배치 저장 성공');
    return true;
  } catch (error: any) {
    console.error("배치 키워드 저장 오류:", error.message || error);
    return false;
  }
};