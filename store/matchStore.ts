// src/store/matchStore.ts (수정된 코드)

import { create } from 'zustand';
import { DailyMatchInfo, MatchPartner, UserProfile } from '../types'; // 경로 확인
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, RealtimeChannel } from '@supabase/supabase-js';

// --- 인터페이스 확장 ---
interface MatchState {
  currentMatch: DailyMatchInfo | null;
  matchedUserProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  activeChatPartnerId: string | null;
  matchStatusMessage: string | null;
  matchChannel: RealtimeChannel | null;
  noMatchErrorShown: boolean; // 에러 표시 여부 추적
  fetchCurrentMatch: (currentUser: User | null, isCalledFromSubscription?: boolean) => Promise<void>;
  setActiveChatPartnerId: (partnerId: string | null) => void;
  subscribeToMatchChanges: (currentUser: User | null) => void; // 반환 타입은 void로 유지 (구현 기준)
  unsubscribeFromMatchChanges: () => void;
  clearMatch: () => void;
}

const supabase = createClientComponentClient();

// 사용자 프로필 정보 가져오는 함수 (변경 없음)
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // //console.log(`프로필 조회 시도: ${userId}`);
    const { data, error, status } = await supabase
      .from('profiles')
      .select('id, username') // 필요한 필드 선택
      .eq('id', userId)
      .single();

    // 406 에러(결과 없음)는 정상 처리, 그 외 에러는 throw
    if (error && status !== 406) {
      throw error;
    }
    if (data) {
      // //console.log(`프로필 조회 성공: ${userId}`, data);
      // username이 null 또는 빈 문자열일 수 있으므로 체크
      return { id: data.id, username: data.username || undefined }; // username이 없으면 undefined로 설정
    } else {
      // //console.log(`프로필 조회 결과 없음: ${userId}`);
      return null;
    }
  } catch (err: any) {
    return null;
  }
}

export const useMatchStore = create<MatchState>((set, get) => ({
  currentMatch: null,
  matchedUserProfile: null,
  isLoading: false,
  error: null,
  activeChatPartnerId: null,
  matchStatusMessage: null,
  matchChannel: null,
  noMatchErrorShown: false,

  setActiveChatPartnerId: (partnerId) => {
    // //console.log('Setting active chat partner:', partnerId);
    set({ activeChatPartnerId: partnerId, matchStatusMessage: null });
  },

  fetchCurrentMatch: async (currentUser: User | null, isCalledFromSubscription = false) => {
    if (!currentUser) {
      set({ currentMatch: null, matchedUserProfile: null, isLoading: false, error: null, activeChatPartnerId: null, matchStatusMessage: null });
      return;
    }
  
    // 구독 호출이 아닐 때만 로딩 상태 설정
    if (!isCalledFromSubscription) {
        set({ isLoading: true, error: null });
    }
    const currentActivePartnerId = get().activeChatPartnerId;
  
    //console.log('### (RPC) 매치 정보 가져오기 시도...'); // RPC 호출 로그
  
    try {
      // --- RPC 함수 호출로 변경 ---
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_my_daily_match'); // 위에서 만든 함수 이름 호출
  
      //console.log('### (RPC) DB 조회 결과 (rpcData):', rpcData); // RPC 결과 확인
      //console.log('### (RPC) DB 조회 에러 (rpcError):', rpcError); // RPC 에러 확인
  
      if (rpcError) throw rpcError; // RPC 호출 에러 처리
      // --- RPC 함수 호출로 변경 끝 ---
  
      let newMatchStatusMessage: string | null = null;
      let partnerProfile: UserProfile | null = null;
      let fetchedPartnerId: string | null = null;
      let newMatchInfo: DailyMatchInfo | null = null; // 최종 매치 정보 상태
  
      // --- RPC 결과 처리 (배열 형태일 수 있음) ---
      if (rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        const matchData = rpcData[0]; // 첫 번째 (유일한) 결과 사용
  
        // 상대방 ID 확인
        fetchedPartnerId = matchData.user1_id === currentUser.id ? matchData.user2_id : matchData.user1_id;
  
        // 상대방 ID가 유효하면 프로필 정보 조회 시도
        if (typeof fetchedPartnerId === 'string' && fetchedPartnerId) {
          partnerProfile = await fetchUserProfile(fetchedPartnerId);
          set({ matchedUserProfile: partnerProfile }); // 상대방 프로필 상태 업데이트
  
          if (partnerProfile?.username) {
            const partner: MatchPartner = {
              userId: fetchedPartnerId,
              username: partnerProfile.username
            };
            newMatchInfo = { id: matchData.id, partner, matchDate: matchData.match_date };
            //console.log('### (RPC) 유효한 매치 및 파트너 정보 설정:', newMatchInfo);
          } else {
          }
        } else { 
          set({ error: '상대의 정보에 문제가 있어 실패하였습니다.' });
        }
  
        // 매치 상태 변경 감지 (구독 호출 시) - 이 로직은 그대로 유지
        if (isCalledFromSubscription && currentActivePartnerId && fetchedPartnerId && currentActivePartnerId !== fetchedPartnerId) {
           newMatchStatusMessage = "새로운 상대와 매칭되었습니다. 채팅을 종료합니다.";
           //console.log('Match changed while chat was active for another partner.');
        }
  
      } else {
        // RPC 결과가 없거나 비어있는 경우
        //console.log('### (RPC) 오늘의 매치 정보를 찾을 수 없습니다.');
        if (isCalledFromSubscription && currentActivePartnerId) {
             newMatchStatusMessage = "상대방과의 연결이 끊어졌습니다.";
             //console.log('Match not found while chat was active.');
        }
      }
      // --- RPC 결과 처리 끝 ---
  
      // 최종 상태 업데이트
      set({
        currentMatch: newMatchInfo, // newMatchInfo (유효하면 설정, 아니면 null)
        isLoading: false,
        error: get().error?.startsWith('매치 데이터 오류') ? get().error : null, // 에러 상태 업데이트 방식 유지
        matchStatusMessage: (newMatchStatusMessage && currentActivePartnerId) ? newMatchStatusMessage : get().matchStatusMessage,
      });
  
      // 같은 상대와 재매칭된 경우 상태 메시지 클리어 (옵션) - 유지
      if (isCalledFromSubscription && get().matchStatusMessage && newMatchInfo && currentActivePartnerId === newMatchInfo.partner?.userId ) {
           set({ matchStatusMessage: null });
      }
  
    } catch (err: any) {
      // 전체 로직 에러 처리
      const errorMessage = err.message || 'Failed to fetch match info via RPC';
      set({ currentMatch: null, matchedUserProfile: null, isLoading: false, error: errorMessage });
      if(currentActivePartnerId) {
          set({ matchStatusMessage: "매치 정보 업데이트 중 오류 발생" });
      }
    } finally {
        // 구독 호출이 아닐 때만 로딩 상태 확실히 종료 - 유지
        if(!isCalledFromSubscription) {
            set({ isLoading: false });
        }
    }
  },

  // --- 실시간 구독 관련 액션 ---
  // subscribeToMatchChanges 함수의 반환 타입은 void (수정 없음)
  subscribeToMatchChanges: (currentUser: User | null) => {
    if (!currentUser || get().matchChannel) return; // 이미 구독 중이거나 사용자 없으면 반환

    const userId = currentUser.id;
    // //console.log(`매치 변경 구독 시도: User ${userId}`);
    const channel = supabase
      .channel(`daily_matches_user_${userId}`) // 사용자별 고유 채널 이름
      .on(
        'postgres_changes',
        {
          event: '*', // 모든 이벤트 감지 (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'daily_matches',
          // filter: `user1_id=eq.${userId}`, // RLS가 적용되므로 필터링은 서버에서 처리될 수 있음
          // filter: `user2_id=eq.${userId}`  // 또는 or 필터 사용 (주의: 복잡성 증가)
        },
        (payload) => {
          // //console.log('매치 테이블 변경 감지:', payload);
          let changedRowInvolvesCurrentUser = false;
          const checkInvolvement = (rowData: any) => rowData && (rowData.user1_id === userId || rowData.user2_id === userId);

          // 변경된 데이터가 현재 사용자와 관련 있는지 확인
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              changedRowInvolvesCurrentUser = checkInvolvement(payload.new);
          } else if (payload.eventType === 'DELETE') {
              // 삭제된 경우 old 데이터 기준으로 확인
              changedRowInvolvesCurrentUser = checkInvolvement(payload.old);
          }

          // 현재 사용자와 관련된 변경일 때만 매치 정보 다시 로드
          if(changedRowInvolvesCurrentUser) {
              //console.log('매치 변경 감지 (관련 사용자), 매치 정보 업데이트 실행');
              // fetchCurrentMatch 호출 (구독으로 인한 호출임을 알림)
              get().fetchCurrentMatch(currentUser, true);
          } else {
              // //console.log('매치 변경 감지 (현재 사용자와 관련 없음)');
          }
        }
      )
      .subscribe((status, err) => {
        // 구독 상태 변경 시 콜백
        if (status === 'SUBSCRIBED') {
          //console.log(`매치 변경 성공적으로 구독: User ${userId}`);
          set({error: null}); // 성공 시 스토어 에러 초기화
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('매치 변경 구독 오류:', status, err);
          // 에러가 아직 표시되지 않았을 때만 설정
          if (!get().noMatchErrorShown) {
            set({ 
              error: '아쉽지만 오늘은 대화가 가능한 분이 없네요.', 
              matchChannel: null,
              noMatchErrorShown: true // 에러 표시됨 표시
            });
          } else {
            // 이미 에러를 표시했으면 채널만 제거
            set({ matchChannel: null });
          }
          // 필요 시 재시도 로직 추가 가능
        } else if (status === 'CLOSED') {
             //console.log('매치 변경 구독 채널 명시적 닫힘');
             // 명시적으로 닫힌 경우 채널 정보만 제거
             set({matchChannel: null});
        } else {
             // 다른 상태 (예: 'CONNECTING') 로깅
             // //console.log(`매치 변경 구독 상태: ${status}`);
        }
      });
    // 스토어에 채널 객체 저장
    set({ matchChannel: channel });
  },

  unsubscribeFromMatchChanges: () => {
    const channel = get().matchChannel;
    if (channel) {
      // //console.log('매치 변경 구독 해지 시도');
      // removeChannel은 비동기 작업일 수 있음 (async/await 사용 가능)
      supabase.removeChannel(channel)
        // .then(() => console.log('매치 변경 구독 채널 제거 완료'))
        // .catch(err => console.error('매치 변경 구독 채널 제거 오류:', err))
        .finally(() => set({ matchChannel: null })); // 성공/실패 여부와 관계없이 채널 상태 null로
    } else {
        // console.log('해지할 매치 변경 구독 채널 없음');
    }
  },

  // clearMatch 수정: 구독 해지 포함
  clearMatch: () => {
    // console.log('매치 스토어 초기화');
    get().unsubscribeFromMatchChanges(); // 구독 해지 호출
    // 스토어 상태 초기화
    set({
        currentMatch: null,
        matchedUserProfile: null,
        isLoading: false,
        error: null,
        activeChatPartnerId: null,
        matchStatusMessage: null,
        matchChannel: null, // 채널도 null로 설정
        noMatchErrorShown: false // 에러 표시 플래그 초기화
    });
  },
}));