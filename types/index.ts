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
