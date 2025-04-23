// store/chatStore.ts
import { create } from 'zustand';
import { ChatMessageData } from '../types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, RealtimeChannel } from '@supabase/supabase-js';

interface ChatState {
  messages: ChatMessageData[];
  currentMessage: string;
  isSending: boolean;
  error: string | null;
  chatChannel: RealtimeChannel | null;
  setMessages: (messages: ChatMessageData[]) => void;
  setCurrentMessage: (message: string) => void;
  addMessage: (message: ChatMessageData) => void;
  sendMessage: (sender: User | null, receiverId: string | null, matchDate: string | null) => Promise<void>;
  subscribeToChatMessages: (currentUser: User | null, partnerId: string | null, matchDate: string | null) => void;
  unsubscribeFromChatMessages: () => void;
  clearChat: () => void;
}

const supabase = createClientComponentClient();

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentMessage: '',
  isSending: false,
  error: null,
  chatChannel: null,

  setMessages: (messages) => set({ messages: messages.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()) }), // 시간순 정렬
  setCurrentMessage: (message) => set({ currentMessage: message }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message].sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()) })), // 추가 시 정렬

  sendMessage: async (sender: User | null, receiverId: string | null, matchDate: string | null) => {
    const { currentMessage } = get();
    if (!currentMessage.trim() || !sender || !receiverId || !matchDate) return;

    set({ isSending: true, error: null });

    try {
      const messageToSend = {
        sender_id: sender.id,
        receiver_id: receiverId,
        message_text: currentMessage.trim(),
        match_date: matchDate,
      };

      const { error } = await supabase
        .from('chat_messages')
        .insert(messageToSend);

      if (error) throw error;

      set({ currentMessage: '', isSending: false }); // 성공 시 입력 필드 비우기
    } catch (err: any) {
      set({ isSending: false, error: err.message || 'Failed to send message' });
    }
  },

  subscribeToChatMessages: (currentUser: User | null, partnerId: string | null, matchDate: string | null) => {
    get().unsubscribeFromChatMessages(); // 기존 구독 해지
  
    // *** 여기서 currentUser, partnerId, matchDate 로그 찍어보기 ***
    //console.log('Subscribing to chat:', { userId: currentUser?.id, partnerId, matchDate });
  
    if (!currentUser || !partnerId || !matchDate) {
      return;
    }
    const channel = supabase
      .channel(`chat-${matchDate}-${[currentUser.id, partnerId].sort().join('-')}`) // 채널 이름 고유하게 생성
      .on<ChatMessageData>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          // 필터: 오늘 날짜의 나와 파트너 간의 메시지만
          filter: `match_date=eq.${matchDate}`
        },
        (payload) => {
          //console.log('New chat message received:', payload.new);
          const newMessage = payload.new as ChatMessageData;
          // 내가 보낸 메시지이거나 내가 받은 메시지인지 확인 (중복 방지 및 관련성 확인)
           if (newMessage &&
              ((newMessage.sender_id === currentUser.id && newMessage.receiver_id === partnerId) ||
               (newMessage.sender_id === partnerId && newMessage.receiver_id === currentUser.id))
             )
           {
                // 이미 로컬 상태에 있는 메시지인지 확인 (가끔 중복 수신될 수 있음)
                if (!get().messages.some(msg => msg.id === newMessage.id)) {
                    get().addMessage(newMessage);
                }
           }
        }
      )
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') {
            //console.log('Successfully subscribed to chat channel');
         }
         if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            set({ error: `Chat connection failed: ${status}` });
         }
      });

    set({ chatChannel: channel });

    // 초기 메시지 로드
    const fetchInitialMessages = async () => {
      try {
          // --- 로그 추가 및 ID 유효성 검사 ---
          //console.log('Fetching initial messages. Checking IDs...');
          // subscribeToChatMessages에서 이미 검사하지만, 여기서 한번 더 확인
          const currentUserId = currentUser?.id;
          const partnerUserId = partnerId; // subscribeToChatMessages에서 전달된 partnerId 사용 가정
   
          //console.log('Current User ID:', currentUserId, '| Type:', typeof currentUserId);
          //console.log('Partner User ID:', partnerUserId, '| Type:', typeof partnerUserId);
   
          // ID 값이 문자열이고 비어있지 않은지 확인
          if (typeof currentUserId !== 'string' || !currentUserId ||
              typeof partnerUserId !== 'string' || !partnerUserId || !matchDate) {
              set({ error: '사용자 ID 또는 상대방 ID가 유효하지 않아 메시지를 불러올 수 없습니다.' });
              return; // ID가 유효하지 않으면 쿼리 실행 중단
          }
          // --- 로그 추가 및 ID 유효성 검사 끝 ---
   
          // 이제 ID가 유효함을 확인했으므로 쿼리 실행
          const { data, error } = await supabase
              .from('chat_messages')
              .select('*')
              .eq('match_date', matchDate)
              // 변수를 직접 사용
              .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerUserId}),and(sender_id.eq.${partnerUserId},receiver_id.eq.${currentUserId})`)
              .order('sent_at', { ascending: true });
   
          if (error) throw error;
          get().setMessages(data || []);
          set({ error: null }); // 성공 시 에러 초기화
   
      } catch(err: any) {
           set({ error: err.message || 'Failed to load messages' });
      }
   }
    fetchInitialMessages();

  },

  unsubscribeFromChatMessages: () => {
    const { chatChannel } = get();
    if (chatChannel) {
      supabase.removeChannel(chatChannel);
      set({ chatChannel: null });
      //console.log('Unsubscribed from chat channel');
    }
  },

  clearChat: () => set({ messages: [], currentMessage: '', isSending: false, error: null }),
}));