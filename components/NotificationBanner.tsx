import { memo, useState, useEffect, useRef } from 'react'; 

interface NotificationBannerProps {
  message: string | null; // 표시할 메시지
  type: 'error' | 'warning' | 'info'; // 배경색 등 스타일 구분용
  onDismiss: () => void; // 클릭 시 숨김 처리 함수
}


export const NotificationBanner = memo<NotificationBannerProps>(({ message, type, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 메시지가 있고, 현재 보이지 않는 상태일 때 보이도록 처리
    if (message && !isVisible) {
      setIsVisible(true);
      // 기존 타이머가 있으면 제거
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      // 3초 후 자동으로 사라지도록 타이머 설정
      timerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
    }
    // 메시지가 없어졌는데, 현재 보이는 상태일 때 숨김 처리
    else if (!message && isVisible) {
       setIsVisible(false);
       if (timerRef.current) {
        clearTimeout(timerRef.current);
       }
    }

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [message]); // message 가 변경될 때마다 effect 실행

  const baseClasses = "sticky top-0 w-full p-2 text-center z-50 font-mono pointer-events-auto text-sm shadow transition-opacity duration-500 ease-in-out";
  const typeClasses = {
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-orange-600 text-white', // 매칭 오류용
  };

  const handleClick = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current); // 타이머 제거
    }
    setIsVisible(false); // 즉시 숨김
    // 필요하다면 부모의 에러 상태도 여기서 초기화할 수 있지만,
    // 부모 컴포넌트에서 message prop을 null로 바꾸는 것이 더 일반적
    // onDismiss(); // 부모에게 숨김 이벤트 알림 (옵션)
  };

  return (
    <div
      className={`${baseClasses} ${typeClasses[type]} ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={handleClick} // 클릭 시 숨김 처리
      role="alert"
      aria-live="assertive"
    >
      {message}
    </div>
  );
});
NotificationBanner.displayName = 'NotificationBanner';
export default NotificationBanner;