// store/chatStore.ts - 단일 채널로 통합된 완전한 해결책
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
  currentMatchDate: string | null;
  lastReadCheckTime: number;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  backgroundTime: number | null;
  
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
  handleAppBackground: () => void;
  handleAppForeground: () => void;
  reconnectChannels: () => void;
  resetConnectionState: () => void;
}

const supabase = createClientComponentClient();

const createDebouncer = () => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (callback: () => void, delay: number) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
};

const readStatusDebouncer = createDebouncer();
const reconnectDebouncer = createDebouncer();

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
  currentMatchDate: null,
  lastReadCheckTime: 0,
  isConnected: false,
  isReconnecting: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 3,
  backgroundTime: null,

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
    const { currentMessage, isConnected } = get();
    if (!currentMessage.trim() || !sender || !receiverId || !matchDate) return;

    if (!isConnected) {
      console.log('[ChatStore] 연결 끊어짐, 재연결 시도');
      get().reconnectChannels();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

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

      let senderName = '사용자';
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', sender.id)
        .single();
      
      if (profileData?.username) {
        senderName = profileData.username;
      }

      await supabase.functions.invoke('send-push-notification', {
        body: {
          receiverId,
          message: currentMessage.trim(),
          senderId: sender.id,
          senderName: senderName
        }
      });

      set({ currentMessage: '', isSending: false });
      
    } catch (err: any) {
      set({ isSending: false, error: err.message || 'Failed to send message' });
    }
  },

  markMessagesAsRead: async (messageIds: string[], userId: string) => {
    if (messageIds.length === 0) return;
    
    console.log('[ChatStore] 📖 읽음 처리 시작:', messageIds.length, '개 메시지');
    console.log('[ChatStore] 📖 읽음 처리 대상:', messageIds);
    console.log('[ChatStore] 📖 읽음 처리 사용자:', userId);
    
    try {
      const readReceipts = messageIds.map(messageId => ({
        message_id: messageId,
        user_id: userId,
        read_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('message_read_receipts')
        .insert(readReceipts);

      if (error && error.code !== '23505') {
        console.error('[ChatStore] 읽음 표시 저장 오류:', error);
        return;
      }

      console.log('[ChatStore] ✅ 읽음 표시 저장 완료');
      
      // 로컬 상태 즉시 업데이트
      const now = new Date().toISOString();
      messageIds.forEach(messageId => {
        get().updateMessageReadStatus(messageId, true, now);
      });

      // 🚨 중요: 브로드캐스트 전송 (상대방에게 즉시 알림)
      const { chatChannel } = get();
      if (chatChannel) {
        try {
          console.log('[ChatStore] 📤 브로드캐스트 전송 시도');
          const broadcastResult = await chatChannel.send({
            type: 'broadcast',
            event: 'messages_read',
            payload: {
              readByUserId: userId,
              messageIds: messageIds,
              timestamp: now
            }
          });
          console.log('[ChatStore] 📤 브로드캐스트 전송 결과:', broadcastResult);
          console.log('[ChatStore] ✅ 읽음 상태 브로드캐스트 전송 완료');
        } catch (broadcastError) {
          console.error('[ChatStore] ❌ 읽음 상태 브로드캐스트 실패:', broadcastError);
        }
      } else {
        console.error('[ChatStore] ❌ 채팅 채널이 없어서 브로드캐스트 불가');
      }

    } catch (err) {
      console.error('[ChatStore] 메시지 읽음 표시 오류:', err);
    }
  },

  refreshReadStatus: async () => {
    const { messages, currentUserId, currentPartnerId, lastReadCheckTime } = get();
    
    const now = Date.now();
    if (now - lastReadCheckTime < 1000) {
      return;
    }
    
    if (!currentUserId || !currentPartnerId || messages.length === 0) return;

    try {
      console.log('[ChatStore] 📊 읽음 상태 새로고침 시작');
      set({ lastReadCheckTime: now });
      
      const messageIds = messages.map(msg => msg.id);
      
      const { data: readReceipts, error } = await supabase
        .from('message_read_receipts')
        .select('message_id, user_id, read_at')
        .in('message_id', messageIds);

      if (error) {
        console.error('[ChatStore] 읽음 상태 조회 오류:', error);
        return;
      }

      if (readReceipts && readReceipts.length > 0) {
        let hasChanges = false;
        
        readReceipts.forEach(receipt => {
          const message = messages.find(msg => msg.id === receipt.message_id);
          if (message && receipt.user_id === message.receiver_id && !message.is_read) {
            console.log('[ChatStore] 📖 읽음 상태 업데이트:', receipt.message_id);
            get().updateMessageReadStatus(receipt.message_id, true, receipt.read_at);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          console.log('[ChatStore] ✅ 읽음 상태 업데이트 완료');
        }
      }
    } catch (err) {
      console.error('[ChatStore] 읽음 상태 새로고침 오류:', err);
    }
  },

  handleAppBackground: () => {
    console.log('[ChatStore] 앱 백그라운드 진입');
    set({ 
      backgroundTime: Date.now(),
      isConnected: false 
    });
  },

  handleAppForeground: () => {
    const { backgroundTime } = get();
    console.log('[ChatStore] 앱 포그라운드 복귀');
    
    const backgroundDuration = backgroundTime ? Date.now() - backgroundTime : 0;
    console.log(`[ChatStore] 백그라운드 시간: ${backgroundDuration}ms`);
    
    set({ 
      backgroundTime: null,
      isReconnecting: true,
      reconnectAttempts: 0
    });

    reconnectDebouncer(() => {
      console.log('[ChatStore] 포그라운드 복귀 후 재연결 시작');
      get().reconnectChannels();
      
      setTimeout(() => {
        get().refreshReadStatus();
      }, 1000);
    }, 500);
  },

  reconnectChannels: () => {
    const { 
      currentUserId, 
      currentPartnerId, 
      currentMatchDate, 
      reconnectAttempts, 
      maxReconnectAttempts 
    } = get();
    
    if (!currentUserId || !currentPartnerId || !currentMatchDate) {
      set({ isReconnecting: false });
      return;
    }

    if (reconnectAttempts >= maxReconnectAttempts) {
      set({ 
        isReconnecting: false, 
        error: '연결에 실패했습니다. 채팅창을 다시 열어주세요.' 
      });
      return;
    }

    console.log(`[ChatStore] 재연결 시도 ${reconnectAttempts + 1}/${maxReconnectAttempts}`);
    set({ reconnectAttempts: reconnectAttempts + 1 });

    get().unsubscribeFromChatMessages();
    get().unsubscribeFromReadReceipts();

    setTimeout(() => {
      const userObj = { id: currentUserId } as User;
      get().subscribeToChatMessages(userObj, currentPartnerId, currentMatchDate);
      set({ isReconnecting: false });
    }, 1000 * reconnectAttempts);
  },

  resetConnectionState: () => {
    set({
      isConnected: false,
      isReconnecting: false,
      reconnectAttempts: 0,
      backgroundTime: null,
      error: null
    });
  },

  // 🚨 핵심 수정: 모든 리스너를 하나의 채널로 통합
  subscribeToChatMessages: (currentUser: User | null, partnerId: string | null, matchDate: string | null) => {
    if (!currentUser || !partnerId || !matchDate) return;

    const state = get();
    if (
      state.currentUserId === currentUser.id &&
      state.currentPartnerId === partnerId &&
      state.currentMatchDate === matchDate &&
      state.chatChannel &&
      state.isConnected
    ) {
      console.log('[ChatStore] 이미 연결된 같은 채팅방, 재구독 스킵');
      return;
    }

    get().unsubscribeFromChatMessages();
    get().unsubscribeFromReadReceipts(); // 별도 채널 해제

    console.log('[ChatStore] 🔄 새로운 통합 채팅 구독 시작');
    
    set({ 
      currentUserId: currentUser.id, 
      currentPartnerId: partnerId,
      currentMatchDate: matchDate,
      isConnected: false
    });

    const channel = supabase
      .channel(`unified-chat-${matchDate}-${[currentUser.id, partnerId].sort().join('-')}`)
      // 1. 새 메시지 리스너
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
          
          if (newMessage &&
              ((newMessage.sender_id === currentUser.id && newMessage.receiver_id === partnerId) ||
               (newMessage.sender_id === partnerId && newMessage.receiver_id === currentUser.id))
             ) {
                const currentMessages = get().messages;
                if (!currentMessages.some(msg => msg.id === newMessage.id)) {
                    console.log('[ChatStore] ✅ 새 메시지 추가:', newMessage.id);
                    get().addMessage(newMessage);
                    
                    if (newMessage.receiver_id === currentUser.id) {
                      setTimeout(() => {
                        get().markMessagesAsRead([newMessage.id], currentUser.id);
                      }, 100);
                    }
                }
           }
        }
      )
      // 2. 읽음 상태 리스너 (PostgreSQL 직접 감지)
      .on<MessageReadReceipt>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_read_receipts'
        },
        (payload) => {
          const readReceipt = payload.new as MessageReadReceipt;
          console.log('[ChatStore] 🔔 읽음 상태 DB 변화 감지:', readReceipt);
          
          const currentMessages = get().messages;
          const targetMessage = currentMessages.find(msg => msg.id === readReceipt.message_id);
          
          if (!targetMessage) {
            console.log('[ChatStore] ❌ 현재 대화의 메시지가 아님');
            return;
          }
          
          console.log('[ChatStore] 📋 읽음 상태 체크:', {
            messageId: readReceipt.message_id,
            messageSender: targetMessage.sender_id,
            messageReceiver: targetMessage.receiver_id,
            currentUser: currentUser.id,
            partnerId: partnerId,
            readByUser: readReceipt.user_id,
            isMyMessage: targetMessage.sender_id === currentUser.id,
            isReadByPartner: readReceipt.user_id === partnerId,
            isAlreadyRead: targetMessage.is_read
          });
          
          // 내가 보낸 메시지를 상대방이 읽었는지 확인
          if (targetMessage.sender_id === currentUser.id && 
              readReceipt.user_id === partnerId &&
              !targetMessage.is_read) {
            
            console.log('[ChatStore] ✅ 내 메시지 읽음 상태 즉시 업데이트:', readReceipt.message_id);
            get().updateMessageReadStatus(
              readReceipt.message_id, 
              true, 
              readReceipt.read_at
            );
          }
        }
      )
      // 3. 브로드캐스트 리스너 (즉시 알림)
      .on('broadcast', { event: 'messages_read' }, (payload) => {
        console.log('[ChatStore] 📨 읽음 상태 브로드캐스트 수신:', payload);
        
        const { readByUserId, messageIds, timestamp } = payload.payload;
        
        if (readByUserId === partnerId) {
          const currentMessages = get().messages;
          let hasUpdates = false;
          
          messageIds.forEach((messageId: string) => {
            const message = currentMessages.find(msg => msg.id === messageId);
            if (message && message.sender_id === currentUser.id && !message.is_read) {
              console.log('[ChatStore] 🚀 브로드캐스트로 읽음 상태 즉시 업데이트:', messageId);
              get().updateMessageReadStatus(messageId, true, timestamp);
              hasUpdates = true;
            }
          });
          
          if (hasUpdates) {
            console.log('[ChatStore] ✅ 브로드캐스트 읽음 상태 업데이트 완료');
          }
        }
      })
      .subscribe((status, err) => {
         console.log('[ChatStore] 📡 통합 채팅 구독 상태:', status);
         
         if (status === 'SUBSCRIBED') {
           console.log('[ChatStore] ✅ 통합 채팅 구독 성공');
           set({ 
             isConnected: true, 
             error: null,
             reconnectAttempts: 0
           });
         } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
           console.error('[ChatStore] ❌ 통합 채팅 채널 오류:', status, err);
           set({ 
             isConnected: false,
             error: `채팅 연결 오류: ${status}` 
           });
           
           if (!get().backgroundTime) {
             setTimeout(() => {
               get().reconnectChannels();
             }, 2000);
           }
         } else if (status === 'CLOSED') {
           set({ isConnected: false });
         }
      });

    set({ chatChannel: channel });

    // 초기 메시지 로드
    const fetchInitialMessages = async () => {
      try {
          console.log('[ChatStore] 📥 초기 메시지 로드 시작');
          
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
              .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
              .order('sent_at', { ascending: true });
   
          if (messagesError) throw messagesError;

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

          console.log('[ChatStore] 📥 초기 메시지 로드 완료:', processedMessages.length, '개');

          // 읽지 않은 메시지 읽음 처리
          const unreadReceivedMessages = processedMessages
            .filter(msg => msg.receiver_id === currentUser.id && !msg.is_read)
            .map(msg => msg.id);
          
          if (unreadReceivedMessages.length > 0) {
            console.log('[ChatStore] 📖 읽지 않은 메시지 읽음 처리:', unreadReceivedMessages.length, '개');
            await get().markMessagesAsRead(unreadReceivedMessages, currentUser.id);
          }
   
      } catch(err: any) {
           console.error('[ChatStore] ❌ 초기 메시지 로드 오류:', err);
           set({ error: err.message || 'Failed to load messages' });
      }
    }
    
    fetchInitialMessages();
  },

  // 🚨 subscribeToReadReceipts 함수는 더 이상 사용하지 않음 (통합됨)
  subscribeToReadReceipts: (currentUser: User | null, partnerId: string | null) => {
    console.log('[ChatStore] ℹ️ subscribeToReadReceipts는 subscribeToChatMessages에 통합됨');
    // 더 이상 별도 채널 생성하지 않음
  },

  unsubscribeFromChatMessages: () => {
    const { chatChannel } = get();
    if (chatChannel) {
      console.log('[ChatStore] 🔌 통합 채팅 구독 해제');
      supabase.removeChannel(chatChannel);
      set({ 
        chatChannel: null,
        currentMatchDate: null,
        isConnected: false
      });
    }
  },

  unsubscribeFromReadReceipts: () => {
    const { readReceiptsChannel } = get();
    if (readReceiptsChannel) {
      console.log('[ChatStore] 🔌 읽음 표시 구독 해제 (레거시)');
      supabase.removeChannel(readReceiptsChannel);
      set({ readReceiptsChannel: null });
    }
  },

  clearChat: () => {
    console.log('[ChatStore] 🧹 채팅 데이터 초기화');
    get().unsubscribeFromChatMessages();
    get().unsubscribeFromReadReceipts();
    get().resetConnectionState();
    set({ 
      messages: [], 
      currentMessage: '', 
      isSending: false, 
      error: null,
      currentUserId: null,
      currentPartnerId: null,
      currentMatchDate: null,
      lastReadCheckTime: 0
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
      console.error('[ChatStore] 읽지 않은 메시지 수 조회 오류:', err);
    }
  }
}));