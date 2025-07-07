// store/chatStore.ts
import { create } from "zustand";
import { ChatMessageData, MessageReadReceipt } from "../types";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User, RealtimeChannel } from "@supabase/supabase-js";

interface ChatState {
  messages: ChatMessageData[];
  currentMessage: string;
  isSending: boolean;
  error: string | null;
  chatChannel: RealtimeChannel | null;
  readReceiptsChannel: RealtimeChannel | null;
  unreadCount: number;
  setMessages: (messages: ChatMessageData[]) => void;
  setCurrentMessage: (message: string) => void;
  addMessage: (message: ChatMessageData) => void;
  updateMessageReadStatus: (
    messageId: string,
    isRead: boolean,
    readAt?: string
  ) => void;
  sendMessage: (
    sender: User | null,
    receiverId: string | null,
    matchDate: string | null
  ) => Promise<void>;
  markMessagesAsRead: (messageIds: string[], userId: string) => Promise<void>;
  subscribeToChatMessages: (
    currentUser: User | null,
    partnerId: string | null,
    matchDate: string | null
  ) => void;
  subscribeToReadReceipts: (
    currentUser: User | null,
    partnerId: string | null
  ) => void;
  unsubscribeFromChatMessages: () => void;
  unsubscribeFromReadReceipts: () => void;
  clearChat: () => void;
  fetchUnreadCount: (userId: string) => Promise<void>;
}

const supabase = createClientComponentClient();

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentMessage: "",
  isSending: false,
  error: null,
  chatChannel: null,
  readReceiptsChannel: null,
  unreadCount: 0,

  setMessages: (messages) =>
    set({
      messages: messages.sort(
        (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
      ),
    }),

  setCurrentMessage: (message) => set({ currentMessage: message }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message].sort(
        (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
      ),
    })),

  updateMessageReadStatus: (messageId, isRead, readAt) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, is_read: isRead, read_at: readAt }
          : msg
      ),
    })),

  sendMessage: async (
    sender: User | null,
    receiverId: string | null,
    matchDate: string | null
  ) => {
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
        .from("chat_messages")
        .insert(messageToSend);

      if (error) throw error;

      // 푸시 알림 트리거 (서버사이드에서 처리)
      await supabase.functions.invoke("send-push-notification", {
        body: {
          receiverId,
          message: currentMessage.trim(),
          senderId: sender.id,
          senderName: sender.user_metadata?.username || "사용자",
        },
      });

      set({ currentMessage: "", isSending: false });
    } catch (err: any) {
      set({ isSending: false, error: err.message || "Failed to send message" });
    }
  },

  markMessagesAsRead: async (messageIds: string[], userId: string) => {
    try {
      const readReceipts = messageIds.map((messageId) => ({
        message_id: messageId,
        user_id: userId,
      }));

      const { error } = await supabase
        .from("message_read_receipts")
        .upsert(readReceipts, { onConflict: "message_id,user_id" });

      if (error) throw error;

      // 로컬 상태 업데이트
      messageIds.forEach((messageId) => {
        get().updateMessageReadStatus(
          messageId,
          true,
          new Date().toISOString()
        );
      });
    } catch (err) {
      console.error("메시지 읽음 표시 오류:", err);
    }
  },

  subscribeToChatMessages: (
    currentUser: User | null,
    partnerId: string | null,
    matchDate: string | null
  ) => {
    get().unsubscribeFromChatMessages();

    if (!currentUser || !partnerId || !matchDate) {
      return;
    }

    const channel = supabase
      .channel(
        `chat-${matchDate}-${[currentUser.id, partnerId].sort().join("-")}`
      )
      .on<ChatMessageData>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `match_date=eq.${matchDate}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessageData;
          if (
            newMessage &&
            ((newMessage.sender_id === currentUser.id &&
              newMessage.receiver_id === partnerId) ||
              (newMessage.sender_id === partnerId &&
                newMessage.receiver_id === currentUser.id))
          ) {
            if (!get().messages.some((msg) => msg.id === newMessage.id)) {
              // 내가 받은 메시지라면 자동으로 읽음 표시
              if (newMessage.receiver_id === currentUser.id) {
                get().markMessagesAsRead([newMessage.id], currentUser.id);
              }
              get().addMessage(newMessage);
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          set({ error: `Chat connection failed: ${status}` });
        }
      });

    set({ chatChannel: channel });

    // 초기 메시지 로드 (읽음 상태 포함)
    const fetchInitialMessages = async () => {
      try {
        const currentUserId = currentUser?.id;
        const partnerUserId = partnerId;

        if (
          typeof currentUserId !== "string" ||
          !currentUserId ||
          typeof partnerUserId !== "string" ||
          !partnerUserId ||
          !matchDate
        ) {
          set({
            error:
              "사용자 ID 또는 상대방 ID가 유효하지 않아 메시지를 불러올 수 없습니다.",
          });
          return;
        }

        // 메시지와 읽음 상태를 함께 조회
        const { data: messages, error: messagesError } = await supabase
          .from("chat_messages")
          .select(
            `
    *,
    message_read_receipts!left(
      user_id,
      read_at
    )
  `
          )
          .eq("match_date", matchDate)
          .eq("is_deleted", false) // 삭제되지 않은 메시지만
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerUserId}),and(sender_id.eq.${partnerUserId},receiver_id.eq.${currentUserId})`
          )
          .order("sent_at", { ascending: true });

        if (messagesError) throw messagesError;

        // 메시지 데이터 가공 (읽음 상태 포함)
        const processedMessages = (messages || []).map((msg) => {
          const readReceipt = msg.message_read_receipts?.find(
            (receipt: any) => receipt.user_id === msg.receiver_id
          );
          return {
            ...msg,
            is_read: !!readReceipt,
            read_at: readReceipt?.read_at,
          };
        });

        get().setMessages(processedMessages);
        set({ error: null });

        // 내가 받은 읽지 않은 메시지들을 읽음 표시
        const unreadReceivedMessages = processedMessages
          .filter((msg) => msg.receiver_id === currentUserId && !msg.is_read)
          .map((msg) => msg.id);

        if (unreadReceivedMessages.length > 0) {
          await get().markMessagesAsRead(unreadReceivedMessages, currentUserId);
        }
      } catch (err: any) {
        set({ error: err.message || "Failed to load messages" });
      }
    };

    fetchInitialMessages();
    get().subscribeToReadReceipts(currentUser, partnerId);
  },

  subscribeToReadReceipts: (
    currentUser: User | null,
    partnerId: string | null
  ) => {
    get().unsubscribeFromReadReceipts();

    if (!currentUser || !partnerId) return;

    const channel = supabase
      .channel(`read-receipts-${[currentUser.id, partnerId].sort().join("-")}`)
      .on<MessageReadReceipt>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_read_receipts",
        },
        (payload) => {
          const readReceipt = payload.new as MessageReadReceipt;

          // 상대방이 내 메시지를 읽었을 때만 업데이트
          const messages = get().messages;
          const message = messages.find(
            (msg) => msg.id === readReceipt.message_id
          );

          if (
            message &&
            message.sender_id === currentUser.id &&
            readReceipt.user_id === partnerId
          ) {
            get().updateMessageReadStatus(
              readReceipt.message_id,
              true,
              readReceipt.read_at
            );
          }
        }
      )
      .subscribe();

    set({ readReceiptsChannel: channel });
  },

  unsubscribeFromChatMessages: () => {
    const { chatChannel } = get();
    if (chatChannel) {
      supabase.removeChannel(chatChannel);
      set({ chatChannel: null });
    }
  },

  unsubscribeFromReadReceipts: () => {
    const { readReceiptsChannel } = get();
    if (readReceiptsChannel) {
      supabase.removeChannel(readReceiptsChannel);
      set({ readReceiptsChannel: null });
    }
  },

  clearChat: () =>
    set({
      messages: [],
      currentMessage: "",
      isSending: false,
      error: null,
    }),

  fetchUnreadCount: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id")
        .eq("receiver_id", userId)
        .is("message_read_receipts.id", null);

      if (!error && data) {
        set({ unreadCount: data.length });
      }
    } catch (err) {
      console.error("읽지 않은 메시지 수 조회 오류:", err);
    }
  },
}));
