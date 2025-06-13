import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Supabase Admin 클라이언트 생성
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 사용자 데이터 삭제 (CASCADE로 설정되어 있다면 자동 삭제됨)
    // 1. keywords 테이블에서 사용자 데이터 삭제
    const { error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .delete()
      .eq('user_id', userId)

    if (keywordsError) throw keywordsError

    // 2. chat_messages 테이블에서 사용자 데이터 삭제
    const { error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)

    if (messagesError) throw messagesError

    // 3. daily_matches 테이블에서 사용자 데이터 삭제
    const { error: matchesError } = await supabaseAdmin
      .from('daily_matches')
      .delete()
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

    if (matchesError) throw matchesError

    // 4. profiles 테이블에서 사용자 데이터 삭제
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) throw profileError

    // 5. Auth 사용자 삭제
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) throw authError

    return new Response(
      JSON.stringify({ success: true, message: 'User data deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error:any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})