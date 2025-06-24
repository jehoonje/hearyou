// 2. lib/i18n.ts - 다국어 설정 및 번역 데이터
import { Translations } from '../types/i18n';

export const translations: Record<string, Translations> = {
  ko: {
    common: {
      loading: '로딩 중...',
      error: '오류',
      success: '성공',
      cancel: '취소',
      confirm: '확인',
      close: '닫기',
      back: '뒤로',
      continue: '계속하기',
      done: '완료!',
      email: 'Email',
      password: 'Password',
      name: 'Name',
      signIn: 'Sign In',
      signUp: '회원가입',
      signOut: 'Sign Out',
      getStarted: 'Get Started',
      or: 'OR',
      match: 'Match',
      chat: 'Chat',
      mainPage: '메인으로',
      delete: '삭제',
      feedback: 'Email Feedback',
      help: '도움말',
      bookmark: 'Add Bookmark',
    },
    auth: {
      emailPlaceholder: '이메일 주소',
      passwordPlaceholder: '비밀번호',
      namePlaceholder: '닉네임',
      passwordHint: '비밀번호 (6자 이상)',
      invalidEmail: '유효한 이메일 주소를 입력해주세요.',
      loginProcessing: '로그인 중...',
      signupProcessing: '처리 중...',
      processing: '처리 중...',
      createAccount: 'Create account',
      continueWithApple: 'Apple로 계속하기',
      quickTour: '간단히 둘러보기',
      emailSent: '완료!',
      emailSentDescription: '이메일 주소로 확인 링크를 발송했습니다. 계정을 활성화하려면 이메일을 확인해주세요.',
      accountInfo: '아이디: ',
      signupInfo: '회원가입: ',
    },
    voice: {
      emptyKeyword: '아직 등록된 키워드가 없습니다.',
      micButtonLabel: '마이크 토글',
      speakInstruction: '스위치 버튼을 누르고 말씀해보세요.',
      detectedKeywords: '감지된 키워드:',
      audioError: '오디오 오류:',
      matchmaking: '매치메이킹',
      matching: '매칭중...',
      noMatch: '매치를 찾을 수 없습니다.',
      demoModeNotice: '체험 모드입니다. 키워드는 저장되지 않습니다. 매칭은 로그인한 계정에 한해 이루어집니다.',
    },
    modal: {
      privacyPolicy: '개인정보처리방침',
      agree: '동의',
      disagree: '미동의',
      helpModalTitle: '도움말',
      bookmarkModalTitle: '웹 이용 시 즐겨찾기 추가하는 방법 💡',
      deleteAccountTitle: '회원 탈퇴',
      deleteAccountWarning: '회원 탈퇴 시 주의사항:',
      deleteAccountWarnings: {
        keywords: '모든 키워드 데이터가 삭제됩니다',
        chats: '모든 채팅 기록이 삭제됩니다',
        matches: '매칭 기록이 모두 삭제됩니다',
        irreversible: '삭제된 데이터는 복구할 수 없습니다',
      },
      deleteAccountConfirm: '탈퇴를 원하시면 아래에 "탈퇴하겠습니다"를 입력하세요:',
      deleteAccountPlaceholder: '탈퇴하겠습니다',
      deleteAccountButton: '탈퇴하기',
      deleteAccountProcessing: '처리중...',
      deleteAccountSuccess: '회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.',
    },
    bookmark: {
      title: '웹 이용 시 즐겨찾기 추가하는 방법 💡',
      mobileInstructions: 'Univoice를 홈 화면에 추가하려면:\n1. 브라우저 메뉴(⋮ 또는 공유 버튼)를 열고\n2. "홈 화면에 추가"를 선택하세요.\n이렇게 하면 앱처럼 바로 접근할 수 있습니다!',
      desktopInstructions: 'Univoice를 즐겨찾기에 추가하려면:\n1. 브라우저의 북마크 메뉴를 열거나\n2. Ctrl+D (Windows) 또는 Cmd+D (Mac)를 누르세요.\n즐겨찾기 폴더에 저장해 쉽게 방문하세요!',
    },
    notifications: {
      inAppBrowser: {
        title: '알림',
        message: '음성 인식 기능은 현재 앱 내 브라우저에서 불안정할 수 있습니다. 최적의 경험을 위해 Safari 또는 Chrome과 같은 기본 브라우저에서 열어주세요.',
        suggestion: '(화면 우측 상단 \'...\' 또는 \'공유\' 버튼을 눌러 \'시스템 브라우저에서 열기\'를 선택해 보세요.)',
      },
    },
  },
  en: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      cancel: 'Cancel',
      confirm: 'Confirm',
      close: 'Close',
      back: 'Back',
      continue: 'Continue',
      done: 'Done!',
      email: 'Email',
      password: 'Password',
      name: 'Name',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      getStarted: 'Get Started',
      or: 'OR',
      match: 'Match',
      chat: 'Chat',
      mainPage: 'Main',
      delete: 'Delete',
      feedback: 'Email Feedback',
      help: 'Help',
      bookmark: 'Add Bookmark',
    },
    auth: {
      emailPlaceholder: 'Email address',
      passwordPlaceholder: 'Password',
      namePlaceholder: 'Nickname',
      passwordHint: 'Password (6+ characters)',
      invalidEmail: 'Please enter a valid email address.',
      loginProcessing: 'Signing in...',
      signupProcessing: 'Processing...',
      processing: 'Processing...',
      createAccount: 'Create account',
      continueWithApple: 'Continue with Apple',
      quickTour: 'Quick Tour',
      emailSent: 'Done!',
      emailSentDescription: 'We\'ve sent a verification link to your email. Please check your email to activate your account.',
      accountInfo: 'Account: ',
      signupInfo: 'Sign up: ',
    },
    voice: {
      emptyKeyword: 'No keywords found',
      micButtonLabel: 'Toggle microphone',
      speakInstruction: 'Press the switch button and speak.',
      detectedKeywords: 'Detected keywords:',
      audioError: 'Audio error:',
      matchmaking: 'Matchmaking',
      matching: 'Matching...',
      noMatch: 'No match found.',
      demoModeNotice: 'Demo mode. Keywords are not saved. Matching is only available for logged-in accounts.',
    },
    modal: {
      privacyPolicy: 'Privacy Policy',
      agree: 'Agree',
      disagree: 'Disagree',
      helpModalTitle: 'Help',
      bookmarkModalTitle: 'How to Add Bookmark 💡',
      deleteAccountTitle: 'Delete Account',
      deleteAccountWarning: 'Account deletion warnings:',
      deleteAccountWarnings: {
        keywords: 'All keyword data will be deleted',
        chats: 'All chat history will be deleted',
        matches: 'All match history will be deleted',
        irreversible: 'Deleted data cannot be recovered',
      },
      deleteAccountConfirm: 'To delete your account, please type "DELETE MY ACCOUNT" below:',
      deleteAccountPlaceholder: 'DELETE MY ACCOUNT',
      deleteAccountButton: 'Delete Account',
      deleteAccountProcessing: 'Processing...',
      deleteAccountSuccess: 'Account deletion completed. Thank you for using our service.',
    },
    bookmark: {
      title: 'How to Add Bookmark 💡',
      mobileInstructions: 'To add Univoice to your home screen:\n1. Open browser menu (⋮ or share button)\n2. Select "Add to Home Screen"\nThis way you can access it like an app!',
      desktopInstructions: 'To bookmark Univoice:\n1. Open browser bookmark menu or\n2. Press Ctrl+D (Windows) or Cmd+D (Mac)\nSave to bookmark folder for easy access!',
    },
    notifications: {
      inAppBrowser: {
        title: 'Notice',
        message: 'Voice recognition may be unstable in the current in-app browser. For the best experience, please open in a default browser like Safari or Chrome.',
        suggestion: '(Try tapping the \'...\' or \'share\' button at the top right and select \'Open in browser\'.)',
      },
    },
  },
};

// 언어 감지 함수
// lib/i18n.ts에서 detectLanguage() 함수 수정

export function detectLanguage(): string {
  // 1. React Native WebView에서 전달받은 언어 정보 확인 (최우선)
  if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
    const nativeLanguage = (window as any).__EXPO_LANGUAGE__;
    if (nativeLanguage) {
      console.log('Language detected from Expo:', nativeLanguage);
      return nativeLanguage;
    }
  }

  // 2. URL 파라미터에서 언어 확인
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang && ['ko', 'en'].includes(urlLang)) {
      console.log('Language detected from URL:', urlLang);
      return urlLang;
    }
  }

  // 3. 로컬 스토리지에서 저장된 언어 확인
  if (typeof window !== 'undefined') {
    try {
      const savedLang = localStorage.getItem('univoice-language');
      if (savedLang && ['ko', 'en'].includes(savedLang)) {
        console.log('Language detected from localStorage:', savedLang);
        return savedLang;
      }
    } catch (error) {
      console.log('localStorage access error:', error);
    }
  }

  // 4. 브라우저 언어 감지 (웹 브라우저에서만)
  if (typeof window !== 'undefined' && !(window as any).ReactNativeWebView) {
    const browserLanguage = navigator.language || navigator.languages?.[0] || 'ko'; // 기본값을 'ko'로 변경
    const detectedLang = browserLanguage.startsWith('ko') ? 'ko' : 'en';
    console.log('Language detected from browser:', detectedLang);
    return detectedLang;
  }

  console.log('Using default language: ko'); // 기본값을 'ko'로 변경
  return 'ko'; // 한국어를 기본값으로 설정
}