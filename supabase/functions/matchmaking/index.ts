// supabase/functions/matchmaking/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// --- 인터페이스 정의 (변경 없음) ---
interface UserKeywordCounts {
  userId: string;
  keywordCounts: Map<string, number>;
}
interface KeywordRecord {
  user_id: string;
  keyword: string;
  count: number;
}

// --- 카운트 차이 계산 함수 (변경 없음) ---
function calculateCountDifference(userA: UserKeywordCounts, userB: UserKeywordCounts): number {
  let totalDifference = 0;
  const keywordsA = new Set(userA.keywordCounts.keys());
  const keywordsB = new Set(userB.keywordCounts.keys());
  const sharedKeywords = new Set([...keywordsA].filter(k => keywordsB.has(k)));
  if (sharedKeywords.size === 0) {
    return Infinity;
  }
  for (const keyword of sharedKeywords) {
    const countA = userA.keywordCounts.get(keyword) ?? 0;
    const countB = userB.keywordCounts.get(keyword) ?? 0;
    totalDifference += Math.abs(countA - countB);
  }
  return totalDifference;
}


serve(async (req) => {
  // CORS 처리 (변경 없음)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase Admin 클라이언트 생성 (변경 없음)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase URL or Service Key not found.");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"})).toISOString().split('T')[0];
    console.log(`매칭 시작 (카운트 차이 + 랜덤 동점 처리): ${today}`);

    // 기존 매치 삭제 (변경 없음)
    const { error: deleteError } = await supabaseAdmin.from('daily_matches').delete().eq('match_date', today);
    if (deleteError) console.error("Error deleting existing matches:", deleteError);
    else console.log(`Deleted existing matches for ${today}`);

    // 키워드 데이터 가져오기 (변경 없음)
    const { data: keywordData, error: keywordError } = await supabaseAdmin
      .from('keywords')
      .select('user_id, keyword, count')
      .order('user_id')
      .order('count', { ascending: false });

    if (keywordError) throw keywordError;
    if (!keywordData || keywordData.length === 0) {
       return new Response(JSON.stringify({ message: 'No keywords found.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // 사용자별 상위 20개 키워드 카운트 Map 생성 (변경 없음 - null ID 체크 포함)
    const userKeywordCountsMap = new Map<string, UserKeywordCounts>();
    const userKeywordRank = new Map<string, number>();
    for (const record of keywordData as KeywordRecord[]) {
        if (record.user_id === null || typeof record.user_id !== 'string') { continue; } // Null ID 건너뛰기
        const currentUserId = record.user_id;
        const currentRank = userKeywordRank.get(currentUserId) ?? 0;
        if (currentRank < 20) {
            if (!userKeywordCountsMap.has(currentUserId)) { userKeywordCountsMap.set(currentUserId, { userId: currentUserId, keywordCounts: new Map() }); }
            userKeywordCountsMap.get(currentUserId)?.keywordCounts.set(record.keyword, record.count);
            userKeywordRank.set(currentUserId, currentRank + 1);
        }
    }
    const allUserKeywordCounts = Array.from(userKeywordCountsMap.values()).filter(user => user.userId !== null && user.keywordCounts.size > 0);
    console.log(`매칭 대상 사용자 수 (키워드 보유): ${allUserKeywordCounts.length}`);

    if (allUserKeywordCounts.length < 2) {
       return new Response(JSON.stringify({ message: `Not enough users with keywords (at least 2 required, found ${allUserKeywordCounts.length}) for matching.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }


    // --- UPDATED: 매치메이킹 로직 (동점자 랜덤 처리 추가) ---
    const matches: { user1_id: string; user2_id: string; match_date: string; similarity_score: number }[] = [];
    // 처리 순서에 따른 편향을 줄이기 위해 사용자 목록 섞기
    const shuffledUsers = allUserKeywordCounts.sort(() => Math.random() - 0.5);
    const availableUserIds = new Set<string>(shuffledUsers.map(u => u.userId)); // 매칭 가능한 사용자 ID 집합

    for (const userA of shuffledUsers) {
        // userA가 이미 매칭되었다면 건너뛰기
        if (!availableUserIds.has(userA.userId)) continue;

        let bestScore = Infinity; // 가장 좋은 점수 (낮을수록 좋음)
        const potentialBestMatches: string[] = []; // 가장 좋은 점수를 가진 상대방 ID 목록

        // userA와 매칭될 수 있는 다른 사용자(userB) 찾기
        for (const userB of shuffledUsers) {
            // 자기 자신이거나, userB가 이미 매칭되었다면 건너뛰기
            if (userA.userId === userB.userId || !availableUserIds.has(userB.userId)) continue;

            // 두 사용자 간 카운트 차이 점수 계산
            const differenceScore = calculateCountDifference(userA, userB);

            // 유효한 점수(Infinity 아님)이고, 현재 최고 점수보다 좋으면
            if (differenceScore !== Infinity && differenceScore < bestScore) {
                bestScore = differenceScore; // 최고 점수 갱신
                potentialBestMatches.length = 0; // 기존 동점자 목록 비우기
                potentialBestMatches.push(userB.userId); // 새 최고 점수 상대 추가
            }
            // 현재 최고 점수와 동일한 점수(동점)를 찾으면
            else if (differenceScore !== Infinity && differenceScore === bestScore) {
                potentialBestMatches.push(userB.userId); // 동점자 목록에 추가
            }
        }

        // userA에 대한 최적의 매칭 상대 후보가 1명 이상 있다면
        if (potentialBestMatches.length > 0) {
            // --- 동점자 중 한 명을 랜덤으로 선택 ---
            const randomIndex = Math.floor(Math.random() * potentialBestMatches.length);
            const bestMatchUserId = potentialBestMatches[randomIndex];

            // --- 선택된 상대방이 여전히 매칭 가능한지 최종 확인 ---
            // (Greedy 방식에서는 이미 확인되었어야 하지만 안전하게 한번 더 체크)
            if (availableUserIds.has(bestMatchUserId)) {
                const user1Id = userA.userId;
                const user2Id = bestMatchUserId;

                // user1_id < user2_id 제약조건 준수를 위해 정렬
                const orderedUser1 = user1Id < user2Id ? user1Id : user2Id;
                const orderedUser2 = user1Id < user2Id ? user2Id : user1Id;

                matches.push({
                    user1_id: orderedUser1,
                    user2_id: orderedUser2,
                    match_date: today,
                    similarity_score: bestScore, // 최고 점수 (최소 차이값) 저장
                });

                // 매칭된 두 사용자 모두 매칭 가능 목록에서 제거
                availableUserIds.delete(user1Id);
                availableUserIds.delete(user2Id);
                console.log(`Matched: ${user1Id} and ${user2Id} with difference score ${bestScore} (Randomly chosen from ${potentialBestMatches.length} potential matches)`);
            } else {
                 // 이론상 발생하기 어렵지만 로깅
                 console.log(`Skipped match for ${userA.userId}: Randomly selected best partner ${bestMatchUserId} was already matched.`);
            }
        } else {
             // userA와 매칭될 상대가 아예 없는 경우 (모두 Infinity거나 이미 매칭됨)
             console.log(`No suitable match found for ${userA.userId}`);
        }
    }
    // --- 매치메이킹 로직 업데이트 끝 ---

    console.log(`최종 매치 수: ${matches.length}`);

    // 매칭 결과 DB 저장 (변경 없음)
    if (matches.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('daily_matches').insert(matches);
      if (insertError) throw insertError;
      console.log(`Successfully inserted ${matches.length} matches.`);
    }

    // 성공 응답 반환 (변경 없음)
    return new Response(JSON.stringify({ success: true, message: `Matchmaking completed for ${today}. ${matches.length} matches made.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    // 에러 처리 (변경 없음)
    console.error('Matchmaking function error:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});