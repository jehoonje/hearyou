import { User } from "@supabase/supabase-js";

export interface Keyword {
  id: number;
  keyword: string;
  count: number;
  created_at: string;
  user_id?: string;
}

export interface AuthState {
  user: User | null;
  authView: "login" | "signup";
  authLoading: boolean;
  authError: string | null;
  authMessage: string | null;
  email: string;
  password: string;
  username: string;
  emailError: string;
  passwordError: string;
  usernameError: string;
}

export interface VoiceState {
  volume: number;
  transcript: string;
  keywords: string[];
  newKeywords: string[];
  keywordList: Keyword[];
  listening: boolean;
  error: string | null;
}

export interface MatchPartner {
  userId: string;
  // email 또는 username 등 필요한 정보 추가 가능
  // 예: email?: string;
}

export interface DailyMatchInfo {
  id: number;
  partner: MatchPartner | null;
  matchDate: string; // YYYY-MM-DD 형식
}

export interface ChatMessageData {
  id: number;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  sent_at: string; // ISO 8601 형식 문자열
  match_date: string;
}

// 사용자 정보 (채팅 상대방 이름 표시 등에 필요)
export interface UserProfile {
    id: string;
    email?: string;
    username?: string; // auth.users.raw_user_meta_data.username 에서 가져옴
    // 필요한 다른 프로필 정보
}
