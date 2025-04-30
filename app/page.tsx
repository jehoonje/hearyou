import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ClientPage from './client-page';
import { fetchKeywords } from '../utils/fetchKeywords';
import { Keyword } from '../types';
import { Database } from '../types/supabase';

export default async function Home() {
  // 서버 컴포넌트에서 Supabase 클라이언트 생성
  const supabase = createServerComponentClient<Database>({ cookies });

  // 사용자 세션 확인
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('세션 조회 오류:', error);
    return <ClientPage initialKeywords={null} />;
  }

  // 키워드 데이터 로드 (로그인된 경우만)
  let initialKeywords: Keyword[] | null = null;
  if (session?.user) {
    try {
      console.log('서버사이드에서 키워드 로드 시작:', session.user.id);
      initialKeywords = await fetchKeywords(session.user);
      console.log('서버사이드에서 키워드 로드 완료:', initialKeywords?.length ?? 0, '개');
    } catch (fetchError: any) {
      console.error('키워드 데이터 로드 실패:', fetchError.message || fetchError);
    }
  } else {
    console.log('인증된 세션이 없습니다. 키워드를 로드하지 않습니다.');
  }

  return <ClientPage initialKeywords={initialKeywords} />;
}