// Deno 표준 라이브러리 및 Supabase 클라이언트 import
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'; // SupabaseClient 타입 명시
import { corsHeaders } from '../_shared/cors.ts'; // 공유 CORS 헤더 경로 확인

// 요청 페이로드 인터페이스 정의
interface reqPayload {
  email: string;
}

console.info('check-email-exists function started');

// 환경 변수 로드
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Supabase Admin Client 초기화 함수 (에러 처리 강화)
function initializeSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    return null;
  }
  try {
    return createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  } catch (error) {
    console.error("Error initializing Supabase Admin Client:", error);
    return null;
  }
}

// Admin 클라이언트 초기화 시도
const supabaseAdmin = initializeSupabaseAdmin();

// serve 함수를 사용하여 요청 핸들러 실행
serve(async (req: Request) => {
  // Preflight 요청 처리 (OPTIONS 메서드)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // CORS 헤더 포함하여 응답 생성하는 헬퍼 함수
  const createJsonResponse = (body: object, status: number) => {
    return new Response(JSON.stringify(body), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  };

  // Supabase Admin 클라이언트가 초기화되지 않았으면 즉시 500 에러 반환
  if (!supabaseAdmin) {
    console.error('Supabase Admin client is not initialized. Check environment variables and initialization logic.');
    return createJsonResponse({ error: 'Internal Server Error: Admin client failed to initialize' }, 500);
  }

  try {
    // 요청 본문 및 Content-Type 확인
    if (!req.headers.get('content-type')?.includes('application/json')) {
       return createJsonResponse({ error: 'Invalid content type, expected application/json' }, 415);
     }

    const payload: reqPayload = await req.json();
    const email = payload?.email;

    // 이메일 유효성 검사
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return createJsonResponse({ error: 'Valid email is required in the request body' }, 400);
    }

    console.log(`Checking existence for email using listUsers: ${email}`);

    // *** 수정된 부분: getUserByEmail 대신 listUsers 사용 ***
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      // 페이지네이션 기본값은 50이지만, 이메일은 고유하므로 1개만 확인하면 됨
      // perPage: 1, // 필요시 추가하여 성능 최적화 가능
      // email 필터는 직접 지원하지 않을 수 있음 - listUsers 후 필터링 또는 다른 방법 고려
      // Supabase 최신 버전에서는 listUsers 필터가 다를 수 있으므로 확인 필요
      // 일단 모든 사용자를 가져와서 필터링하는 대신, 다른 방법을 찾아보거나
      // 이메일이 정확히 일치하는 사용자가 있는지 확인하기 위해 listUsers 결과 사용
    });


    let exists = false;
    if (listError) {
      // listUsers 호출 자체의 에러 처리
      console.error(`Error listing users from Supabase for email check (${email}):`, listError);
      return createJsonResponse({ error: 'Failed to check email existence due to an internal error while listing users' }, 500);
    } else {
      // listUsers는 성공했으나, 반환된 users 배열에서 이메일 일치 여부 확인
      // 중요: listUsers는 email 필터를 직접 지원하지 않을 수 있습니다.
      // 이 경우, 다른 방법(예: RPC 함수)을 고려하거나, 결과 배열에서 직접 찾아야 합니다.
      // 여기서는 결과 배열에서 찾는 방식으로 구현합니다.
      const foundUser = users.find(user => user.email === email);
      if (foundUser) {
        console.log(`User with email ${email} found in the list.`);
        exists = true;
      } else {
        console.log(`User with email ${email} not found in the list.`);
        exists = false;
      }
    }

    // 클라이언트에 결과 반환 (성공)
    return createJsonResponse({ exists: exists }, 200);

  } catch (error) {
    // 요청 처리 중 발생한 예외 (JSON 파싱 실패 등)
    console.error('Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return createJsonResponse({ error: 'Internal Server Error', details: 'Failed to process request' }, 500);
  }
});
