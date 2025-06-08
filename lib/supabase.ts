// lib/supabase.ts

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Next.js 클라이언트 컴포넌트 환경에 최적화된 클라이언트를 여기서 딱 한 번만 생성합니다.
export const supabase = createClientComponentClient()

// 기존에 만드셨던 헬퍼 함수들은 그대로 유지합니다.
// 이제 이 함수들은 Next.js에 최적화된 클라이언트를 사용하게 됩니다.
export const signUp = async (email: string, password: string, username: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username
      }
    }
  });
  
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { data, error };
};