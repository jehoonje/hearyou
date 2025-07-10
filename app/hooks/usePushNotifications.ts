// hooks/usePushNotifications.ts (수정된 버전)
import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from './useAuth';
import { useRouter } from 'next/navigation';
import { useMatchStore } from '../../store/matchStore';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { fetchCurrentMatch } = useMatchStore();

  useEffect(() => {
    console.log('[usePushNotifications] 훅 실행, user:', user?.id);
    
    if (!user) {
      console.log('[usePushNotifications] 사용자 없음, 종료');
      return;
    }

    // 푸시 토큰 핸들러 등록
    const handlePushToken = async (token: string) => {
      try {
        console.log('[Web] 푸시 토큰 받음:', token);
        console.log('[Web] 현재 사용자:', user.id);
        
        // 플랫폼 감지
        const platform = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android';
        console.log('[Web] 플랫폼:', platform);
        
        // Supabase에 토큰 저장
        const { data, error } = await supabase
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
    console.log('[Web] handlePushToken 함수 등록 완료');

    // 이미 토큰이 있는지 확인
    setTimeout(() => {
      if ((window as any).__EXPO_PUSH_TOKEN__) {
        console.log('[Web] 기존 토큰 발견, 저장 시도');
        handlePushToken((window as any).__EXPO_PUSH_TOKEN__);
      } else {
        console.log('[Web] 저장된 토큰 없음');
      }
    }, 1000);

    // 토큰 이벤트 리스너
    const tokenListener = (event: CustomEvent) => {
      console.log('[Web] pushtoken 이벤트 수신:', event.detail);
      if (event.detail?.token) {
        handlePushToken(event.detail.token);
      }
    };

    window.addEventListener('pushtoken', tokenListener as EventListener);
    console.log('[Web] pushtoken 이벤트 리스너 등록 완료');

    // 알림 핸들러 등록
    const handleNotification = (notification: any) => {
      console.log('[Web] 알림 수신:', notification);
      
      const notificationData = notification.request?.content?.data;
      
      // 알림 처리 로직
      if (notificationData?.type === 'chat_message') {
        // 채팅 메시지 알림 처리
        showNotificationToast({
          title: '새 메시지',
          message: notification.request?.content?.body || '새로운 메시지가 도착했습니다.',
          type: 'message'
        });
      } else if (notificationData?.type === 'new_match') {
        // 매칭 알림 처리
        console.log('[Web] 새 매칭 알림:', notificationData);
        
        // 매치 정보 새로고침
        fetchCurrentMatch(user);
        
        // 매칭 성공 토스트 표시
        showNotificationToast({
          title: '🎉 매칭 성공!',
          message: notification.request?.content?.body || '새로운 친구와 매칭되었습니다!',
          type: 'match'
        });
      }
    };

    (window as any).handleNotification = handleNotification;

    // 채팅 화면 이동 핸들러
    const navigateToChat = (chatData: any) => {
      console.log('[Web] 채팅으로 이동:', chatData);
      
      if (chatData?.type === 'new_match') {
        // 매칭 알림에서 채팅으로 이동
        fetchCurrentMatch(user); // 매치 정보 새로고침
        router.push('/'); // 메인 화면으로 이동 (자동으로 매치 정보 표시됨)
      } else if (chatData?.senderId) {
        // 일반 채팅 메시지 알림
        router.push(`/?chat=${chatData.senderId}`);
      }
    };

    (window as any).navigateToChat = navigateToChat;

    // cleanup 시 푸시 토큰 상태는 유지
    return () => {
      window.removeEventListener('pushtoken', tokenListener as EventListener);
      console.log('[Web] pushtoken 이벤트 리스너 제거');
    };
  }, [user, supabase, router, fetchCurrentMatch]);
};

// 토스트 표시 함수 (실제 구현은 프로젝트에 맞게 수정)
function showNotificationToast({ title, message, type }: {
  title: string;
  message: string;
  type: 'message' | 'match';
}) {
  // 여기에 실제 토스트 표시 로직 구현
  // 예: react-toastify, chakra-ui toast 등 사용
  console.log('[Toast]', type, title, message);
  
  // 임시로 브라우저 기본 알림 사용
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: '/icon-192.png', // 앱 아이콘 경로
      badge: '/icon-72.png',
      tag: type === 'match' ? 'match-notification' : 'message-notification',
    });
  }
}