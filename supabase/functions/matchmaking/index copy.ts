// supabase/functions/matchmaking/index.ts - 차단 사용자 제외 로직 추가
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { corsHeaders } from '../_shared/cors.ts';

// --- 인터페이스 정의 ---
interface UserKeywordCounts {
  userId: string;
  keywordCounts: Map<string, number>;
}
interface KeywordRecord {
  user_id: string;
  keyword: string;
  count: number;
}
interface BlockedRelation {
  user_id: string;
  blocked_user_id: string;
}

// --- 카운트 차이 계산 함수 ---
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

// --- 차단 관계 확인 함수 ---
function areUsersBlocked(userAId: string, userBId: string, blockedRelations: Set<string>): boolean {
  // A가 B를 차단했거나, B가 A를 차단한 경우
  return blockedRelations.has(`${userAId}-${userBId}`) || blockedRelations.has(`${userBId}-${userAId}`);
}

serve(async (req) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase Admin 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase URL or Service Key not found.");
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"})).toISOString().split('T')[0];
    console.log(`매칭 시작 (차단 사용자 제외): ${today}`);

    // 기존 매치 삭제
    const { error: deleteError } = await supabaseAdmin.from('daily_matches').delete().eq('match_date', today);
    if (deleteError) console.error("Error deleting existing matches:", deleteError);
    else console.log(`Deleted existing matches for ${today}`);

    // --- 차단된 사용자 관계 가져오기 (새로 추가) ---
    const { data: blockedData, error: blockedError } = await supabaseAdmin
      .from('blocked_users')
      .select('user_id, blocked_user_id');

    if (blockedError) {
      console.error("Error fetching blocked users:", blockedError);
      throw blockedError;
    }

    // 차단 관계를 Set으로 저장 (빠른 조회를 위해)
    const blockedRelations = new Set<string>();
    if (blockedData) {
      for (const relation of blockedData as BlockedRelation[]) {
        if (relation.user_id && relation.blocked_user_id) {
          blockedRelations.add(`${relation.user_id}-${relation.blocked_user_id}`);
        }
      }
    }
    console.log(`차단 관계 수: ${blockedRelations.size}`);

    // 키워드 데이터 가져오기
    const { data: keywordData, error: keywordError } = await supabaseAdmin
      .from('keywords')
      .select('user_id, keyword, count')
      .order('user_id')
      .order('count', { ascending: false });

    if (keywordError) throw keywordError;
    if (!keywordData || keywordData.length === 0) {
       return new Response(JSON.stringify({ message: 'No keywords found.' }), { 
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
         status: 200 
       });
    }

    // 사용자별 상위 20개 키워드 카운트 Map 생성
    const userKeywordCountsMap = new Map<string, UserKeywordCounts>();
    const userKeywordRank = new Map<string, number>();
    for (const record of keywordData as KeywordRecord[]) {
        if (record.user_id === null || typeof record.user_id !== 'string') { continue; }
        const currentUserId = record.user_id;
        const currentRank = userKeywordRank.get(currentUserId) ?? 0;
        if (currentRank < 20) {
            if (!userKeywordCountsMap.has(currentUserId)) { 
              userKeywordCountsMap.set(currentUserId, { userId: currentUserId, keywordCounts: new Map() }); 
            }
            userKeywordCountsMap.get(currentUserId)?.keywordCounts.set(record.keyword, record.count);
            userKeywordRank.set(currentUserId, currentRank + 1);
        }
    }
    const allUserKeywordCounts = Array.from(userKeywordCountsMap.values()).filter(user => user.userId !== null && user.keywordCounts.size > 0);
    console.log(`매칭 대상 사용자 수 (키워드 보유): ${allUserKeywordCounts.length}`);

    if (allUserKeywordCounts.length < 2) {
       return new Response(JSON.stringify({ 
         message: `Not enough users with keywords (at least 2 required, found ${allUserKeywordCounts.length}) for matching.` 
       }), { 
         headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
         status: 200 
       });
    }

    // --- 매치메이킹 로직 (차단 사용자 제외 추가) ---
    const matches: { user1_id: string; user2_id: string; match_date: string; similarity_score: number }[] = [];
    const shuffledUsers = allUserKeywordCounts.sort(() => Math.random() - 0.5);
    const availableUserIds = new Set<string>(shuffledUsers.map(u => u.userId));

    for (const userA of shuffledUsers) {
        if (!availableUserIds.has(userA.userId)) continue;

        let bestScore = Infinity;
        const potentialBestMatches: string[] = [];

        for (const userB of shuffledUsers) {
            if (userA.userId === userB.userId || !availableUserIds.has(userB.userId)) continue;

            // --- 차단 관계 확인 (새로 추가) ---
            if (areUsersBlocked(userA.userId, userB.userId, blockedRelations)) {
              console.log(`Skipping blocked relationship: ${userA.userId} <-> ${userB.userId}`);
              continue; // 차단된 사용자는 매칭에서 제외
            }

            const differenceScore = calculateCountDifference(userA, userB);

            if (differenceScore !== Infinity && differenceScore < bestScore) {
                bestScore = differenceScore;
                potentialBestMatches.length = 0;
                potentialBestMatches.push(userB.userId);
            }
            else if (differenceScore !== Infinity && differenceScore === bestScore) {
                potentialBestMatches.push(userB.userId);
            }
        }

        if (potentialBestMatches.length > 0) {
            const randomIndex = Math.floor(Math.random() * potentialBestMatches.length);
            const bestMatchUserId = potentialBestMatches[randomIndex];

            if (availableUserIds.has(bestMatchUserId)) {
                const user1Id = userA.userId;
                const user2Id = bestMatchUserId;

                const orderedUser1 = user1Id < user2Id ? user1Id : user2Id;
                const orderedUser2 = user1Id < user2Id ? user2Id : user1Id;

                matches.push({
                    user1_id: orderedUser1,
                    user2_id: orderedUser2,
                    match_date: today,
                    similarity_score: bestScore,
                });

                availableUserIds.delete(user1Id);
                availableUserIds.delete(user2Id);
                console.log(`Matched: ${user1Id} and ${user2Id} with difference score ${bestScore} (선택된 후보: ${potentialBestMatches.length}명 중)`);
            } else {
                 console.log(`Skipped match for ${userA.userId}: 선택된 상대 ${bestMatchUserId}는 이미 매칭됨.`);
            }
        } else {
             console.log(`No suitable match found for ${userA.userId} (차단된 사용자 제외)`);
        }
    }

    console.log(`최종 매치 수: ${matches.length}`);

    // 매칭 결과 DB 저장
    if (matches.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('daily_matches').insert(matches);
      if (insertError) throw insertError;
      console.log(`Successfully inserted ${matches.length} matches.`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Matchmaking completed for ${today}. ${matches.length} matches made. ${blockedRelations.size} blocked relationships excluded.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    });

  } catch (error: any) {
    console.error('Matchmaking function error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500 
    });
  }
});