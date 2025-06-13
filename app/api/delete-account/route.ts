import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 1. 현재 로그인한 사용자 확인
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: '인증되지 않은 사용자입니다.' },
        { status: 401 }
      );
    }
    
    console.log(`회원 탈퇴 요청: ${user.email} (${user.id})`);

    // 2. Service Role을 사용한 Admin 클라이언트 생성
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 3. 트랜잭션처럼 순차적으로 데이터 삭제
    const deletionResults = {
      keywords: false,
      messages: false,
      matches: false,
      profile: false,
      auth: false
    };

    // 3-1. keywords 테이블 데이터 삭제
    try {
      const { error } = await supabaseAdmin
        .from('keywords')
        .delete()
        .eq('user_id', user.id);
      
      if (error && error.code !== 'PGRST116') { // PGRST116은 행이 없을 때 발생
        console.error('Keywords 삭제 오류:', error);
      } else {
        deletionResults.keywords = true;
      }
    } catch (e) {
      console.error('Keywords 삭제 실패:', e);
    }

    // 3-2. chat_messages 테이블 데이터 삭제
    try {
      const { error } = await supabaseAdmin
        .from('chat_messages')
        .delete()
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      
      if (error && error.code !== 'PGRST116') {
        console.error('Messages 삭제 오류:', error);
      } else {
        deletionResults.messages = true;
      }
    } catch (e) {
      console.error('Messages 삭제 실패:', e);
    }

    // 3-3. daily_matches 테이블 데이터 삭제
    try {
      const { error } = await supabaseAdmin
        .from('daily_matches')
        .delete()
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      if (error && error.code !== 'PGRST116') {
        console.error('Matches 삭제 오류:', error);
      } else {
        deletionResults.matches = true;
      }
    } catch (e) {
      console.error('Matches 삭제 실패:', e);
    }

    // 3-4. profiles 테이블 데이터 삭제
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', user.id);
      
      if (error && error.code !== 'PGRST116') {
        console.error('Profile 삭제 오류:', error);
      } else {
        deletionResults.profile = true;
      }
    } catch (e) {
      console.error('Profile 삭제 실패:', e);
    }

    // 4. Auth 사용자 삭제 (가장 마지막에 실행)
    try {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error('Auth 사용자 삭제 오류:', deleteError);
        throw new Error(`사용자 계정 삭제 실패: ${deleteError.message}`);
      }
      deletionResults.auth = true;
    } catch (e) {
      console.error('Auth 삭제 실패:', e);
      // Auth 삭제 실패 시 전체 프로세스 실패로 처리
      throw e;
    }

    console.log('삭제 결과:', deletionResults);
    console.log('회원 탈퇴 완료, 세션 쿠키 제거 시작');

    // 5. 성공 응답 생성 및 세션 쿠키 제거
    const response = NextResponse.json({ 
      success: true,
      message: '회원 탈퇴가 완료되었습니다.',
      deletionResults 
    });

    // Supabase 인증 관련 쿠키 제거
    // sb-<project-ref>-auth-token 형식의 쿠키를 찾아서 제거
    const allCookies = cookieStore.getAll();
    
    allCookies.forEach(cookie => {
      if (cookie.name.includes('sb-') && cookie.name.includes('-auth-token')) {
        response.cookies.set(cookie.name, '', {
          path: '/',
          expires: new Date(0),
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        });
        console.log(`쿠키 제거: ${cookie.name}`);
      }
    });

    // 추가적인 Supabase 관련 쿠키 제거
    response.cookies.set('sb-access-token', '', {
      path: '/',
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    
    response.cookies.set('sb-refresh-token', '', {
      path: '/',
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    // Next.js Auth Helper 관련 쿠키도 제거
    response.cookies.set('supabase-auth-token', '', {
      path: '/',
      expires: new Date(0),
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });

    console.log('세션 쿠키 제거 완료');

    return response;

  } catch (error: any) {
    console.error('회원 탈퇴 처리 오류:', error);
    return NextResponse.json(
      { 
        error: error.message || '회원 탈퇴 중 오류가 발생했습니다.',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

// OPTIONS 메서드 처리 (CORS)
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200 });
}