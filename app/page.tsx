import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import ClientPage from './client-page';
import { fetchKeywords } from '../utils/fetchKeywords'; // 경로 확인 필요
import { Keyword } from '../types'; // Keyword 타입 임포트 (필요시)
import { Database } from '../types/supabase'; // Database 타입 임포트 (필요시)

// 서버 컴포넌트로 초기 데이터 로딩
export default async function Home() {
  // 서버 컴포넌트에서 Supabase 클라이언트 생성
  const supabase = createServerComponentClient<Database>({ cookies }); // 타입 지정

  // 사용자 세션 확인
  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('세션 조회 오류:', error);
    // ClientPage 호출 시 initialSession 제거
    return <ClientPage initialKeywords={null} />;
  }

  // 키워드 데이터 로드 (로그인된 경우만)
  let initialKeywords: Keyword[] | null = null; // 타입 명시
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
      console.log('서버사이드에서 키워드 로드 완료:', initialKeywords?.length ?? 0, '개'); // 로드된 개수 로깅
    } catch (fetchError: any) { // catch 블록 에러 타입 명시
      console.error('키워드 데이터 로드 실패:', fetchError.message || fetchError);
    }
  } else {
    console.log('인증된 세션이 없습니다. 키워드를 로드하지 않습니다.');
  }

  // 클라이언트 컴포넌트에 초기 데이터 전달 (initialSession 제거)
  return <ClientPage initialKeywords={initialKeywords} />;
}