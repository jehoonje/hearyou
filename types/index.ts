import { User } from "@supabase/supabase-js";

export interface Keyword {
  id: number;
  // 'keyword' 필드가 DB 스키마와 일치하는지 확인 ('text'가 아니라 'keyword'일 수 있음)
  keyword: string; // DB 스키마에 'keyword' 컬럼이 있으므로 'text' 대신 사용
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
  username: string; // 회원가입 시 사용할 username
  emailError: string | null;
  passwordError: string | null;
  usernameError: string | null;
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

// MatchPartner 타입 (username 포함 확인)
export interface MatchPartner {
  userId: string;
  username: string; // 사용자 이름 (profiles 테이블 등에서 가져옴)
  // 필요한 다른 파트너 정보 (예: email)
}

// 매치 정보 타입 정의
export interface Match {
  id: string; // daily_matches 테이블의 id가 아닌, 로직상 필요한 고유 ID일 수 있음 (또는 user1_id, user2_id, match_date 조합)
  partner: MatchPartner | null;
  status: 'pending' | 'active' | 'closed'; // 현재 매칭 상태
  matchDate: string; // YYYY-MM-DD 형식 (daily_matches.match_date)
  created_at: string; // daily_matches.created_at
  // 필요 시 user1_id, user2_id 등 추가
}

// 사용자의 오늘의 매치 정보 (useMatchStore 상태용)
export interface DailyMatchInfo {
  id: number; // daily_matches 테이블의 id
  partner: MatchPartner | null;
  matchDate: string; // YYYY-MM-DD 형식
}

// 채팅 메시지 데이터 타입 (DB 스키마 기반)
export interface ChatMessageData {
  id: string; 
  sender_id: string;
  receiver_id: string;
  message_text: string;
  sent_at: string;
  match_date: string;
  is_deleted?: boolean;
  deleted_at?: string;
  is_read?: boolean; // 추가
  read_at?: string;  // 추가
}

export interface MessageReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
}

export interface PushNotificationToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'ios' | 'android';
  created_at: string;
  updated_at: string;
}

// 사용자 프로필 타입 (DB 스키마 기반)
export interface UserProfile {
    id: string; // UUID, auth.users.id 와 동일
    email?: string; // auth.users.email
    username?: string; // public.profiles.username
    updated_at?: string; // public.profiles.updated_at
    // 필요한 다른 프로필 정보
}