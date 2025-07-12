// store/chatStore.ts - 채팅창 상태에 따른 알림 제어 버전
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
  
  // 채팅창 열림 상태 관리
  isChatOpen: boolean;
  partnerChatOpen: boolean;
  
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
  setChatOpen: (isOpen: boolean) => void;
  broadcastChatStatus: (isOpen: boolean) => void;
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
  isChatOpen: false,
  partnerChatOpen: false,

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

  setChatOpen: (isOpen) => {
    console.log('[ChatStore] 채팅창 상태 변경:', isOpen);
    set({ isChatOpen: isOpen });
    // 상태가 변경되면 즉시 브로드캐스트
    get().broadcastChatStatus(isOpen);
  },

  broadcastChatStatus: (isOpen) => {
    const { chatChannel, currentUserId } = get();
    if (chatChannel && currentUserId) {
      console.log('[ChatStore] 채팅창 상태 브로드캐스트:', isOpen);
      chatChannel.send({
        type: 'broadcast',
        event: 'chat_status',
        payload: {
          userId: currentUserId,
          isChatOpen: isOpen,
          timestamp: new Date().toISOString()
        }
      }).catch(err => {
        console.error('[ChatStore] 채팅창 상태 브로드캐스트 실패:', err);
      });
    }
  },

  sendMessage: async (sender: User | null, receiverId: string | null, matchDate: string | null) => {
    const { currentMessage, isConnected, partnerChatOpen } = get();
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

      // 상대방이 채팅창을 열고 있지 않을 때만 푸시 알림 전송
      if (!partnerChatOpen) {
        console.log('[ChatStore] 상대방 채팅창 닫혀있음, 푸시 알림 전송');
        
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
      } else {
        console.log('[ChatStore] 상대방 채팅창 열려있음, 푸시 알림 생략');
      }

      set({ currentMessage: '', isSending: false });
      
      // 즉시 새로고침 (지연 제거)
      setTimeout(() => {
        get().refreshReadStatus();
      }, 200);
    } catch (err: any) {
      set({ isSending: false, error: err.message || 'Failed to send message' });
    }
  },

  markMessagesAsRead: async (messageIds: string[], userId: string) => {
    if (messageIds.length === 0) return;
    
    console.log('[ChatStore] 📖 읽음 처리 시작:', messageIds.length, '개 메시지');
    
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

      // 상대방에게 즉시 브로드캐스트
      const { chatChannel } = get();
      if (chatChannel) {
        try {
          await chatChannel.send({
            type: 'broadcast',
            event: 'messages_read',
            payload: {
              readByUserId: userId,
              messageIds: messageIds,
              timestamp: now
            }
          });
          console.log('[ChatStore] 📤 읽음 상태 브로드캐스트 전송 완료');
        } catch (broadcastError) {
          console.error('[ChatStore] 📤 읽음 상태 브로드캐스트 실패:', broadcastError);
        }
      }

      // 즉시 새로고침 (지연 제거)
      setTimeout(() => {
        get().refreshReadStatus();
      }, 100);

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
      isConnected: false,
      isChatOpen: false 
    });
    // 백그라운드 진입 시 채팅창 닫힘 상태 브로드캐스트
    get().broadcastChatStatus(false);
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

    console.log('[ChatStore] 새로운 채팅 구독 시작');
    
    set({ 
      currentUserId: currentUser.id, 
      currentPartnerId: partnerId,
      currentMatchDate: matchDate,
      isConnected: false,
      partnerChatOpen: false // 초기화
    });

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
          
          if (newMessage &&
              ((newMessage.sender_id === currentUser.id && newMessage.receiver_id === partnerId) ||
               (newMessage.sender_id === partnerId && newMessage.receiver_id === currentUser.id))
             ) {
                const currentMessages = get().messages;
                if (!currentMessages.some(msg => msg.id === newMessage.id)) {
                    console.log('[ChatStore] ✅ 메시지 추가:', newMessage.id);
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
      .on('broadcast', { event: 'messages_read' }, (payload) => {
        console.log('[ChatStore] 📨 읽음 상태 브로드캐스트 수신:', payload);
        
        const { readByUserId, messageIds, timestamp } = payload.payload;
        
        // 상대방이 내 메시지를 읽었는지 확인
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
      .on('broadcast', { event: 'chat_status' }, (payload) => {
        console.log('[ChatStore] 채팅창 상태 브로드캐스트 수신:', payload);
        
        const { userId, isChatOpen } = payload.payload;
        
        // 상대방의 채팅창 상태 업데이트
        if (userId === partnerId) {
          console.log('[ChatStore] 상대방 채팅창 상태 업데이트:', isChatOpen);
          set({ partnerChatOpen: isChatOpen });
        }
      })
      .subscribe((status, err) => {
         console.log('[ChatStore] 채팅 구독 상태:', status);
         
         if (status === 'SUBSCRIBED') {
           set({ 
             isConnected: true, 
             error: null,
             reconnectAttempts: 0
           });
           
           // 구독 성공 시 현재 채팅창 상태 브로드캐스트
           const { isChatOpen } = get();
           get().broadcastChatStatus(isChatOpen);
         } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
           console.error('[ChatStore] 채팅 채널 오류:', status, err);
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
          console.log('[ChatStore] 초기 메시지 로드 시작');
          
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

          // 읽지 않은 메시지 읽음 처리
          const unreadReceivedMessages = processedMessages
            .filter(msg => msg.receiver_id === currentUser.id && !msg.is_read)
            .map(msg => msg.id);
          
          if (unreadReceivedMessages.length > 0) {
            console.log('[ChatStore] 📖 읽지 않은 메시지 개수:', unreadReceivedMessages.length);
            await get().markMessagesAsRead(unreadReceivedMessages, currentUser.id);
          }
   
      } catch(err: any) {
           console.error('[ChatStore] 초기 메시지 로드 오류:', err);
           set({ error: err.message || 'Failed to load messages' });
      }
    }
    
    fetchInitialMessages();
  },

  subscribeToReadReceipts: (currentUser: User | null, partnerId: string | null) => {
    // DB 구독 대신 브로드캐스트만 사용하므로 이 함수는 더 이상 필요없음
    console.log('[ChatStore] 읽음 표시는 브로드캐스트로만 처리됩니다');
  },

  unsubscribeFromChatMessages: () => {
    const { chatChannel, isChatOpen } = get();
    if (chatChannel) {
      console.log('[ChatStore] 채팅 구독 해제');
      
      // 구독 해제 전에 채팅창 닫힘 상태 브로드캐스트
      if (isChatOpen) {
        get().broadcastChatStatus(false);
      }
      
      supabase.removeChannel(chatChannel);
      set({ 
        chatChannel: null,
        currentMatchDate: null,
        isConnected: false,
        isChatOpen: false,
        partnerChatOpen: false
      });
    }
  },

  unsubscribeFromReadReceipts: () => {
    // DB 구독 대신 브로드캐스트만 사용하므로 이 함수는 더 이상 필요없음
    console.log('[ChatStore] 읽음 표시는 브로드캐스트로만 처리됩니다');
  },

  clearChat: () => {
    console.log('[ChatStore] 채팅 데이터 초기화');
    get().unsubscribeFromChatMessages();
    get().resetConnectionState();
    set({ 
      messages: [], 
      currentMessage: '', 
      isSending: false, 
      error: null,
      currentUserId: null,
      currentPartnerId: null,
      currentMatchDate: null,
      lastReadCheckTime: 0,
      isChatOpen: false,
      partnerChatOpen: false
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