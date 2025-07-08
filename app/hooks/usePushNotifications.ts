// hooks/usePushNotifications.ts
import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from './useAuth';
import { useRouter } from 'next/navigation';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    // 푸시 토큰 핸들러 등록
    const handlePushToken = async (token: string) => {
      try {
        console.log('[Web] 푸시 토큰 받음:', token);
        
        // 플랫폼 감지
        const platform = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android';
        
        // Supabase에 토큰 저장
        const { error } = await supabase
          .from('push_tokens')
          .upsert({
            user_id: user.id,
            token: token,
            platform: platform,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,token'
          });

        if (error) {
          console.error('푸시 토큰 저장 오류:', error);
        } else {
          console.log('푸시 토큰 저장 성공');
        }
      } catch (err) {
        console.error('푸시 토큰 처리 오류:', err);
      }
    };

    // 전역 함수로 등록
    (window as any).handlePushToken = handlePushToken;

    // 이미 토큰이 있는지 확인
    if ((window as any).__EXPO_PUSH_TOKEN__) {
      handlePushToken((window as any).__EXPO_PUSH_TOKEN__);
    }

    // 토큰 이벤트 리스너
    const tokenListener = (event: CustomEvent) => {
      if (event.detail?.token) {
        handlePushToken(event.detail.token);
      }
    };

    window.addEventListener('pushtoken', tokenListener as EventListener);

    // 알림 핸들러 등록
    const handleNotification = (notification: any) => {
      console.log('[Web] 알림 수신:', notification);
      
      // 알림 처리 로직
      if (notification.request?.content?.data?.type === 'chat_message') {
        // 채팅 메시지 알림 처리
        // 토스트 표시 등
      }
    };

    (window as any).handleNotification = handleNotification;

    // 채팅 화면 이동 핸들러
    const navigateToChat = (chatData: any) => {
      console.log('[Web] 채팅으로 이동:', chatData);
      // 채팅 화면으로 라우팅
      if (chatData?.senderId) {
        // 매칭 상태 확인 후 채팅 열기
        router.push(`/?chat=${chatData.senderId}`);
      }
    };

    (window as any).navigateToChat = navigateToChat;

    // cleanup 시 푸시 토큰 상태는 유지
    return () => {
      window.removeEventListener('pushtoken', tokenListener as EventListener);
      // handlePushToken은 유지 (다른 컴포넌트에서도 사용 가능)
    };
  }, [user, supabase, router]);
};