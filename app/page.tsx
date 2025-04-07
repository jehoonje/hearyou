import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ClientPage from './client-page';
import { fetchKeywords } from '../utils/fetchKeywords';

// 서버 컴포넌트로 초기 데이터 로딩
export default async function Home() {
  // 서버 컴포넌트에서 Supabase 클라이언트 생성
  const supabase = createServerComponentClient({ cookies });
  
  // 사용자 세션 확인
  const { data: { session } } = await supabase.auth.getSession();
  
  // 키워드 데이터 로드 (로그인된 경우만)
  let initialKeywords = null;
  if (session?.user) {
    try {
      initialKeywords = await fetchKeywords();
    } catch (error) {
      console.error('키워드 데이터 로드 실패:', error);
    }
  }
  
  // 클라이언트 컴포넌트에 초기 데이터 전달
  return <ClientPage initialSession={session} initialKeywords={initialKeywords} />;
}
