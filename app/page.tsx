import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ClientPage from './client-page';
import { fetchKeywords } from '../utils/fetchKeywords';

// 서버 컴포넌트로 초기 데이터 로딩
export default async function Home() {
  // 서버 컴포넌트에서 Supabase 클라이언트 생성
  const supabase = createServerComponentClient({ cookies });
  
  // 사용자 세션 확인
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('세션 조회 오류:', error);
    return <ClientPage initialSession={null} initialKeywords={null} />;
  }
  
  // 키워드 데이터 로드 (로그인된 경우만)
  let initialKeywords = null;
  if (session?.user) {
    try {
      console.log('서버사이드에서 키워드 로드 시작:', session.user.id);
      
      // 세션 정보 디버깅
      console.log('세션 정보:', JSON.stringify({
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        aud: session.user.aud,
      }, null, 2));
      
      initialKeywords = await fetchKeywords(session.user);
      console.log('서버사이드에서 키워드 로드 완료:', initialKeywords);
    } catch (error) {
      console.error('키워드 데이터 로드 실패:', error);
    }
  } else {
    console.log('인증된 세션이 없습니다.');
  }
  
  // 클라이언트 컴포넌트에 초기 데이터 전달
  return <ClientPage initialSession={session} initialKeywords={initialKeywords} />;
}
