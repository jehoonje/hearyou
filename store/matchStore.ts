import { create } from 'zustand';
import { DailyMatchInfo, MatchPartner, UserProfile } from '../types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, RealtimeChannel } from '@supabase/supabase-js'; // RealtimeChannel 임포트

// --- 인터페이스 확장 ---
interface MatchState {
  currentMatch: DailyMatchInfo | null; // 현재 유효한 매치 정보
  matchedUserProfile: UserProfile | null; // 현재 유효한 매치 상대의 프로필
  isLoading: boolean;
  error: string | null; // 스토어 자체 에러 (예: 구독 실패)
  activeChatPartnerId: string | null; // 현재 채팅 모달이 열려있는 상대방 ID
  matchStatusMessage: string | null; // 매치 상태 변경 시 채팅 UI에 표시할 메시지
  matchChannel: RealtimeChannel | null; // 매치 테이블 구독 채널
  fetchCurrentMatch: (currentUser: User | null, isCalledFromSubscription?: boolean) => Promise<void>;
  setActiveChatPartnerId: (partnerId: string | null) => void;
  subscribeToMatchChanges: (currentUser: User | null) => void;
  unsubscribeFromMatchChanges: () => void;
  clearMatch: () => void;
}

const supabase = createClientComponentClient();

// 사용자 프로필 정보 가져오는 함수 (제공해주신 코드 - 정상 작동 가정)
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    console.log(`프로필 조회 시도: ${userId}`);
    const { data, error, status } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', userId)
      .single();

    if (error && status !== 406) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
    if (data) {
      console.log(`프로필 조회 성공: ${userId}`, data);
      return { id: data.id, username: data.username };
    } else {
      console.log(`프로필 조회 결과 없음: ${userId}`);
      return null;
    }
  } catch (err: any) {
    console.error(`Exception fetching user profile (${userId}):`, err);
    return null;
  }
}

export const useMatchStore = create<MatchState>((set, get) => ({
  currentMatch: null,
  matchedUserProfile: null,
  isLoading: false,
  error: null,
  // --- 새로운 상태 초기값 ---
  activeChatPartnerId: null,
  matchStatusMessage: null,
  matchChannel: null,

  // --- 현재 채팅 상대 ID 설정 액션 ---
  setActiveChatPartnerId: (partnerId) => {
    console.log('Setting active chat partner:', partnerId);
    // 채팅 상대를 설정할 때는 상태 메시지를 초기화
    set({ activeChatPartnerId: partnerId, matchStatusMessage: null });
  },

  // fetchCurrentMatch 수정: 구독 호출 여부 확인 및 상태 메시지 로직 추가
  fetchCurrentMatch: async (currentUser: User | null, isCalledFromSubscription = false) => {
    if (!currentUser) {
      set({ currentMatch: null, matchedUserProfile: null, isLoading: false, error: null, activeChatPartnerId: null, matchStatusMessage: null });
      return;
    }

    if (!isCalledFromSubscription) {
        set({ isLoading: true, error: null });
    }
    const today = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"})).toISOString().split('T')[0];
    const currentActivePartnerId = get().activeChatPartnerId;

    try {
      const { data, error: fetchMatchError } = await supabase
        .from('daily_matches')
        .select('id, user1_id, user2_id, match_date')
        .eq('match_date', today)
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .maybeSingle();

      if (fetchMatchError) throw fetchMatchError;

      let newMatchStatusMessage: string | null = null;
      let partnerProfile: UserProfile | null = null;
      let fetchedPartnerId: string | null = null;

      if (data) {
        fetchedPartnerId = data.user1_id === currentUser.id ? data.user2_id : data.user1_id;
        if (typeof fetchedPartnerId === 'string' && fetchedPartnerId) {
            const partner: MatchPartner = { userId: fetchedPartnerId };
            const matchInfo: DailyMatchInfo = { id: data.id, partner, matchDate: data.match_date };
            set({ currentMatch: matchInfo, isLoading: false, error: null });
            partnerProfile = await fetchUserProfile(fetchedPartnerId);
            set({ matchedUserProfile: partnerProfile });

            if (isCalledFromSubscription && currentActivePartnerId && currentActivePartnerId !== fetchedPartnerId) {
                 newMatchStatusMessage = "새로운 상대와 매칭되었습니다. 채팅을 종료합니다.";
                 console.log('Match changed while chat was active for another partner.');
            }
        } else {
             console.error('Found match data but partner ID is invalid:', data);
             set({ currentMatch: null, matchedUserProfile: null, isLoading: false, error: '매치 데이터 오류' });
        }
      } else {
        set({ currentMatch: null, matchedUserProfile: null, isLoading: false, error: null });
        if (isCalledFromSubscription && currentActivePartnerId) {
             newMatchStatusMessage = "상대방과의 연결이 끊어졌습니다.";
             console.log('Match not found while chat was active.');
        }
      }

      // 상태 메시지 업데이트 (메시지가 있고, 현재 채팅 중일 때만)
      if (newMatchStatusMessage && currentActivePartnerId) {
           set({ matchStatusMessage: newMatchStatusMessage });
      }
      // 같은 상대 재매칭 시 메시지 클리어 (옵션)
      else if (isCalledFromSubscription && get().matchStatusMessage && data && currentActivePartnerId === fetchedPartnerId ) {
           set({ matchStatusMessage: null });
      }

    } catch (err: any) {
      console.error("Error fetching current match:", err);
      const errorMessage = err.message || 'Failed to fetch match info';
      set({ currentMatch: null, matchedUserProfile: null, isLoading: false, error: errorMessage });
      // 에러 발생 시 현재 채팅 상태 메시지 설정
      if(currentActivePartnerId) {
          set({ matchStatusMessage: "매치 정보 업데이트 중 오류 발생" });
      }
    }
  },

  // --- 실시간 구독 관련 액션 ---
  subscribeToMatchChanges: (currentUser: User | null) => {
    if (!currentUser || get().matchChannel) return;

    const userId = currentUser.id;
    console.log(`매치 변경 구독 시도: User ${userId}`);
    const channel = supabase
      .channel(`daily_matches_user_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_matches' },
        (payload) => {
          console.log('매치 테이블 변경 감지:', payload);
          let changedRowInvolvesCurrentUser = false;
          const checkInvolvement = (rowData: any) => rowData && (rowData.user1_id === userId || rowData.user2_id === userId);

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              changedRowInvolvesCurrentUser = checkInvolvement(payload.new);
          } else if (payload.eventType === 'DELETE') {
              changedRowInvolvesCurrentUser = checkInvolvement(payload.old);
          }

          // 현재 사용자와 관련된 변경일 때만 매치 정보 다시 로드
          if(changedRowInvolvesCurrentUser) {
              console.log('Change involves current user, re-fetching match status.');
              get().fetchCurrentMatch(currentUser, true); // 구독으로 인한 호출임을 알림
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`매치 변경 성공적으로 구독: User ${userId}`);
          set({error: null}); // 성공 시 스토어 에러 초기화
        } else if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('매치 변경 구독 오류:', status, err);
          set({ error: '매칭 상태 업데이트 구독 실패', matchChannel: null });
        } else if (status === 'CLOSED') {
             console.log('매치 변경 구독 채널 닫힘');
             set({matchChannel: null});
        }
      });
    set({ matchChannel: channel });
  },

  unsubscribeFromMatchChanges: () => {
    const channel = get().matchChannel;
    if (channel) {
      console.log('매치 변경 구독 해지');
      supabase.removeChannel(channel).catch(err => console.error('채널 제거 오류:', err));
      set({ matchChannel: null });
    }
  },

  // clearMatch 수정: 구독 해지 포함
  clearMatch: () => {
    console.log('매치 스토어 초기화');
    get().unsubscribeFromMatchChanges(); // 구독 해지 호출
    set({
        currentMatch: null,
        matchedUserProfile: null,
        isLoading: false,
        error: null,
        activeChatPartnerId: null,
        matchStatusMessage: null,
        matchChannel: null
    });
  },
}));