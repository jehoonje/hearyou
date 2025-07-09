// store/chatStore.ts
import { create } from 'zustand';
import { ChatMessageData, MessageReadReceipt } from '../types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, RealtimeChannel } from '@supabase/supabase-js';

interface ChatState {
  messages: ChatMessageData[];
  currentMessage: string;
  isSending: boolean;
  error: string | null;
  chatChannel: RealtimeChannel | null;
  readReceiptsChannel: RealtimeChannel | null;
  unreadCount: number;
  currentUserId: string | null;
  currentPartnerId: string | null;
  setMessages: (messages: ChatMessageData[]) => void;
  setCurrentMessage: (message: string) => void;
  addMessage: (message: ChatMessageData) => void;
  updateMessageReadStatus: (messageId: string, isRead: boolean, readAt?: string) => void;
  sendMessage: (sender: User | null, receiverId: string | null, matchDate: string | null) => Promise<void>;
  markMessagesAsRead: (messageIds: string[], userId: string) => Promise<void>;
  subscribeToChatMessages: (currentUser: User | null, partnerId: string | null, matchDate: string | null) => void;
  subscribeToReadReceipts: (currentUser: User | null, partnerId: string | null) => void;
  unsubscribeFromChatMessages: () => void;
  unsubscribeFromReadReceipts: () => void;
  clearChat: () => void;
  fetchUnreadCount: (userId: string) => Promise<void>;
  refreshReadStatus: () => Promise<void>;
}

const supabase = createClientComponentClient();

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentMessage: '',
  isSending: false,
  error: null,
  chatChannel: null,
  readReceiptsChannel: null,
  unreadCount: 0,
  currentUserId: null,
  currentPartnerId: null,

  setMessages: (messages) => set({ 
    messages: messages.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()) 
  }),
  
  setCurrentMessage: (message) => set({ currentMessage: message }),
  
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message].sort((a, b) => 
      new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    ) 
  })),

  updateMessageReadStatus: (messageId, isRead, readAt) => set((state) => ({
    messages: state.messages.map(msg => 
      msg.id === messageId ? { ...msg, is_read: isRead, read_at: readAt } : msg
    )
  })),

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

      // 사용자 이름 가져오기
      let senderName = '사용자';
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', sender.id)
        .single();
      
      if (profileData?.username) {
        senderName = profileData.username;
      }

      // 푸시 알림 트리거
      await supabase.functions.invoke('send-push-notification', {
        body: {
          receiverId,
          message: currentMessage.trim(),
          senderId: sender.id,
          senderName: senderName
        }
      });

      set({ currentMessage: '', isSending: false });
      
      // 메시지 전송 후 읽음 상태 체크 (이전 메시지들의 읽음 상태 확인)
      setTimeout(() => {
        console.log('[ChatStore] 메시지 전송 후 읽음 상태 체크');
        get().refreshReadStatus();
      }, 1000);
    } catch (err: any) {
      set({ isSending: false, error: err.message || 'Failed to send message' });
    }
  },

  markMessagesAsRead: async (messageIds: string[], userId: string) => {
    if (messageIds.length === 0) return;
    
    console.log('[ChatStore] 읽음 처리 시작:', { messageIds, userId });
    
    try {
      // 배치로 읽음 표시 저장
      const readReceipts = messageIds.map(messageId => ({
        message_id: messageId,
        user_id: userId,
        read_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('message_read_receipts')
        .insert(readReceipts);

      if (error && error.code !== '23505') { // UNIQUE 제약 오류는 무시
        console.error('읽음 표시 저장 오류:', error);
        return;
      }

      console.log('[ChatStore] 읽음 표시 저장 완료');
      
      // 로컬 상태 업데이트
      messageIds.forEach(messageId => {
        get().updateMessageReadStatus(messageId, true, new Date().toISOString());
      });

      // 읽음 처리 후 전체 읽음 상태 새로고침 (상대방이 내 메시지를 읽었는지도 확인)
      setTimeout(() => {
        console.log('[ChatStore] 읽음 처리 완료 후 전체 상태 새로고침');
        get().refreshReadStatus();
      }, 300);

    } catch (err) {
      console.error('메시지 읽음 표시 오류:', err);
    }
  },

  refreshReadStatus: async () => {
    const { messages, currentUserId, currentPartnerId } = get();
    if (!currentUserId || !currentPartnerId || messages.length === 0) return;

    try {
      console.log('[ChatStore] 읽음 상태 새로고침 시작');
      
      const messageIds = messages.map(msg => msg.id);
      
      const { data: readReceipts, error } = await supabase
        .from('message_read_receipts')
        .select('message_id, user_id, read_at')
        .in('message_id', messageIds);

      if (error) {
        console.error('읽음 상태 조회 오류:', error);
        return;
      }

      // 읽음 상태 업데이트
      if (readReceipts) {
        readReceipts.forEach(receipt => {
          const message = messages.find(msg => msg.id === receipt.message_id);
          if (message && receipt.user_id === message.receiver_id) {
            get().updateMessageReadStatus(receipt.message_id, true, receipt.read_at);
          }
        });
      }

      console.log('[ChatStore] 읽음 상태 새로고침 완료');
    } catch (err) {
      console.error('읽음 상태 새로고침 오류:', err);
    }
  },

  subscribeToChatMessages: (currentUser: User | null, partnerId: string | null, matchDate: string | null) => {
    get().unsubscribeFromChatMessages();
  
    if (!currentUser || !partnerId || !matchDate) {
      return;
    }

    console.log('[ChatStore] 채팅 구독 시작:', { currentUser: currentUser.id, partnerId, matchDate });

    // 현재 사용자와 파트너 ID 저장
    set({ currentUserId: currentUser.id, currentPartnerId: partnerId });

    const channel = supabase
      .channel(`chat-${matchDate}-${[currentUser.id, partnerId].sort().join('-')}`)
      .on<ChatMessageData>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `match_date=eq.${matchDate}`
        },
        (payload) => {
          const newMessage = payload.new as ChatMessageData;
          console.log('[ChatStore] 새 메시지 수신:', newMessage);
          
          if (newMessage &&
              ((newMessage.sender_id === currentUser.id && newMessage.receiver_id === partnerId) ||
               (newMessage.sender_id === partnerId && newMessage.receiver_id === currentUser.id))
             )
           {
                if (!get().messages.some(msg => msg.id === newMessage.id)) {
                    console.log('[ChatStore] 메시지 추가:', newMessage.id);
                    get().addMessage(newMessage);
                    
                    // 내가 받은 메시지라면 자동으로 읽음 표시
                    if (newMessage.receiver_id === currentUser.id) {
                      console.log('[ChatStore] 받은 메시지 자동 읽음 처리:', newMessage.id);
                      // 약간의 지연 후 읽음 처리 (UI 업데이트 후)
                      setTimeout(() => {
                        get().markMessagesAsRead([newMessage.id], currentUser.id);
                      }, 100);
                    }
                    
                    // 메시지 수신 시마다 읽음 상태 새로고침 (내가 보낸 메시지의 읽음 상태 확인)
                    if (newMessage.sender_id === partnerId) {
                      console.log('[ChatStore] 상대방 메시지 수신으로 인한 읽음 상태 새로고침');
                      setTimeout(() => {
                        get().refreshReadStatus();
                      }, 500);
                    }
                }
           }
        }
      )
      .subscribe((status, err) => {
         console.log('[ChatStore] 채팅 구독 상태:', status);
         if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            set({ error: `Chat connection failed: ${status}` });
         }
      });

    set({ chatChannel: channel });

    // 초기 메시지 로드
    const fetchInitialMessages = async () => {
      try {
          const currentUserId = currentUser?.id;
          const partnerUserId = partnerId;
   
          if (typeof currentUserId !== 'string' || !currentUserId ||
              typeof partnerUserId !== 'string' || !partnerUserId || !matchDate) {
              set({ error: '사용자 ID 또는 상대방 ID가 유효하지 않아 메시지를 불러올 수 없습니다.' });
              return;
          }
   
          console.log('[ChatStore] 초기 메시지 로드 시작');
          
          // 메시지와 읽음 상태를 함께 조회
          const { data: messages, error: messagesError } = await supabase
              .from('chat_messages')
              .select(`
                *,
                message_read_receipts!left(
                  user_id,
                  read_at
                )
              `)
              .eq('match_date', matchDate)
              .eq('is_deleted', false)
              .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerUserId}),and(sender_id.eq.${partnerUserId},receiver_id.eq.${currentUserId})`)
              .order('sent_at', { ascending: true });
   
          if (messagesError) throw messagesError;

          console.log('[ChatStore] 초기 메시지 로드 완료:', messages?.length);

          // 메시지 데이터 가공 (읽음 상태 포함)
          const processedMessages = (messages || []).map(msg => {
            const readReceipts = Array.isArray(msg.message_read_receipts) 
              ? msg.message_read_receipts 
              : [];
            
            const readReceipt = readReceipts.find(
              (receipt: any) => receipt.user_id === msg.receiver_id
            );
            
            return {
              ...msg,
              is_read: !!readReceipt,
              read_at: readReceipt?.read_at
            };
          });

          get().setMessages(processedMessages);
          set({ error: null });

          // 내가 받은 읽지 않은 메시지들을 읽음 표시
          const unreadReceivedMessages = processedMessages
            .filter(msg => msg.receiver_id === currentUserId && !msg.is_read)
            .map(msg => msg.id);
          
          console.log('[ChatStore] 읽지 않은 받은 메시지:', unreadReceivedMessages);
          
          if (unreadReceivedMessages.length > 0) {
            await get().markMessagesAsRead(unreadReceivedMessages, currentUserId);
          }
   
      } catch(err: any) {
           console.error('[ChatStore] 초기 메시지 로드 오류:', err);
           set({ error: err.message || 'Failed to load messages' });
      }
   }
    
    fetchInitialMessages();
    
    // 읽음 표시 구독을 별도로 시작
    setTimeout(() => {
      get().subscribeToReadReceipts(currentUser, partnerId);
    }, 1000);
  },

  subscribeToReadReceipts: (currentUser: User | null, partnerId: string | null) => {
    // 이미 구독 중이면 중복 구독 방지
    const { readReceiptsChannel } = get();
    if (readReceiptsChannel) {
      console.log('[ChatStore] 읽음 표시 이미 구독 중, 중복 구독 방지');
      return;
    }

    get().unsubscribeFromReadReceipts();

    if (!currentUser || !partnerId) {
      console.log('[ChatStore] 읽음 표시 구독 조건 미충족');
      return;
    }

    console.log('[ChatStore] 읽음 표시 구독 시작:', { 
      currentUser: currentUser.id, 
      partnerId 
    });

    // 고유한 채널명 생성
    const channelName = `read-receipts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const channel = supabase
      .channel(channelName)
      .on<MessageReadReceipt>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts'
        },
        async (payload) => {
          const readReceipt = payload.new as MessageReadReceipt;
          console.log('[ChatStore] 읽음 표시 수신:', readReceipt.message_id);
          
          const messages = get().messages;
          const targetMessage = messages.find(msg => msg.id === readReceipt.message_id);
          
          if (targetMessage) {
            // 내가 보낸 메시지를 상대방이 읽었는지 확인
            if (targetMessage.sender_id === currentUser.id && 
                readReceipt.user_id === partnerId &&
                targetMessage.receiver_id === partnerId) {
              console.log('[ChatStore] ✅ 내 메시지 읽음 상태 실시간 업데이트:', targetMessage.id);
              get().updateMessageReadStatus(
                readReceipt.message_id, 
                true, 
                readReceipt.read_at
              );
            }
          }
        }
      )
      .subscribe((status, error) => {
        console.log('[ChatStore] 읽음 표시 구독 상태:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('[ChatStore] ✅ 읽음 표시 구독 성공');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[ChatStore] ❌ 읽음 표시 구독 오류:', status, error);
        }
      });

    set({ readReceiptsChannel: channel });
  },

  unsubscribeFromChatMessages: () => {
    const { chatChannel } = get();
    if (chatChannel) {
      console.log('[ChatStore] 채팅 구독 해제');
      supabase.removeChannel(chatChannel);
      set({ chatChannel: null });
    }
  },

  unsubscribeFromReadReceipts: () => {
    const { readReceiptsChannel } = get();
    if (readReceiptsChannel) {
      console.log('[ChatStore] 읽음 표시 구독 해제');
      supabase.removeChannel(readReceiptsChannel);
      set({ readReceiptsChannel: null });
    }
  },

  clearChat: () => {
    console.log('[ChatStore] 채팅 데이터 초기화');
    get().unsubscribeFromChatMessages();
    get().unsubscribeFromReadReceipts();
    set({ 
      messages: [], 
      currentMessage: '', 
      isSending: false, 
      error: null,
      currentUserId: null,
      currentPartnerId: null
    });
  },

  fetchUnreadCount: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('receiver_id', userId)
        .is('message_read_receipts.id', null);

      if (!error && data) {
        set({ unreadCount: data.length });
      }
    } catch (err) {
      console.error('읽지 않은 메시지 수 조회 오류:', err);
    }
  }
}));