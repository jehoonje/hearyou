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
      createAccount: 'Sign In',
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
    chat: {
      headerTitle: '{name}님과의 대화',
      headerStatusChanged: '대화 상태 변경됨',
      partner: '상대',
      menuTooltip: '메뉴',
      reportUser: '신고하기',
      blockUser: '차단하기',
      firstMessagePrompt: '첫 메시지를 보내보세요',
      blockedUserMessage: '차단된 사용자입니다.',
      closeChatInfo: '이 채팅 창을 닫아주세요.',
      reportModalTitle: '사용자 신고',
      blockModalTitle: '사용자 차단',
      reportReasonLabel: '신고 사유',
      reportDescriptionLabel: '상세 설명 (선택사항)',
      reportPlaceholder: '구체적인 내용을 입력해주세요...',
      reportNotice: '* 신고된 내용은 24시간 내에 검토되며, 필요시 적절한 조치가 취해집니다.',
      submitting: '제출 중...',
      processing: '처리 중...',
      blockConfirm: '{name}님을 차단하시겠습니까? 차단된 사용자와는 더 이상 대화할 수 없으며, 매칭되지 않습니다.',
      reportMessage: '메시지 신고',
      messageOptionsTooltip: '메시지 옵션',
      reportTargetMessage: '신고 대상 메시지:',
      inputPlaceholderDisabled: '대화 상태가 변경되었습니다.',
      inputPlaceholderDefault: '메시지 입력...',
      inappropriateContentWarning: '부적절한 언어가 포함되어 있습니다.',
      policyViolationWarning: '서비스 정책에 위반되는 내용이 포함되어 있습니다.',
      cantSendWarning: '메시지를 전송할 수 없습니다. {reason}',
      inappropriateContentDetected: '부적절한 내용이 감지되었습니다.',
      sendButtonBlockedTooltip: '부적절한 내용이 포함되어 있습니다',
      sendButtonTooltip: '메시지 전송',
      moderationNotice: '부적절한 내용이 자동으로 감지되며, 신고된 내용은 24시간 내 검토됩니다.',
      alert: {
        selfReport: '자신을 신고할 수 없습니다.',
        alreadyReportedUser: '이미 신고한 사용자입니다.',
        alreadyReportedMessage: '이미 신고한 메시지입니다.',
        permissionError: '권한이 없습니다. 로그인 상태를 확인해주세요.',
        duplicateError: '이미 신고한 내용입니다.',
        reportError: '신고 제출 중 오류가 발생했습니다: {message}',
        reportSuccess: '신고가 접수되었습니다. 24시간 내에 검토하여 조치하겠습니다.',
        genericError: '제출 중 예상치 못한 오류가 발생했습니다.',
        selfBlock: '자신을 차단할 수 없습니다.',
        alreadyBlocked: '이미 차단한 사용자입니다.',
        blockError: '차단 처리 중 오류가 발생했습니다: {message}',
        blockSuccess: '사용자를 차단했습니다.',
        selfReportMessage: '자신의 메시지는 신고할 수 없습니다.',
      },
      reportReasons: {
        select: '선택하세요',
        inappropriateContent: '부적절한 콘텐츠',
        harassment: '괴롭힘 또는 욕설',
        spam: '스팸',
        impersonation: '사칭',
        sexualContent: '성적인 내용',
        other: '기타',
      },
    },
    tutorial: {
      step1: '안녕하세요!\n마이크 버튼을 눌러 음성 인식을 시작해보세요.',
      step2: '단 시간에 여러번 말한 키워드가 기록됩니다.\n일상적인 대화도, 떠오르는 단어도 좋아요.',
      step3: '매일 자정, 오늘 하루동안 나와 비슷한 키워드를 가진 사람이 있다면 Chat 버튼이 나타나요.',
      step4: '우연히 만난 상대와 단 하루동안 대화할 수 있어요. 키워드는 자정에 초기화 돼요.',
      next: '다음',
      start: '시작하기',
    },
    settings: {
      title: '차단된 사용자 관리',
      manageBlockedList: '차단 목록 관리',
      refresh: '새로고침',
      unblock: '차단해제',
      unblocking: '해제 중',
      unblockConfirm: '{name}님의 차단을 해제하시겠습니까?',
      unblockNotice: '차단을 해제하면 다음 매칭부터 해당 사용자와 다시 매칭될 수 있습니다.',
      blockedOnDate: '에 차단됨',
      noBlockedUsers: '차단된 사용자가 없습니다.',
      unknownUser: '알 수 없는 사용자',
      loginRequired: '로그인이 필요합니다.',
      alert: {
        loadError: '차단 목록을 불러오는 중 오류가 발생했습니다.',
        unblockError: '차단 해제 중 오류가 발생했습니다.',
        unblockSuccess: '{name}님의 차단이 해제되었습니다.',
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
      createAccount: 'Sign In',
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
    chat: {
      headerTitle: 'Chat with {name}',
      headerStatusChanged: 'Conversation Status Changed',
      partner: 'Partner',
      menuTooltip: 'Menu',
      reportUser: 'Report',
      blockUser: 'Block',
      firstMessagePrompt: 'Send the first message.',
      blockedUserMessage: 'This user is blocked.',
      closeChatInfo: 'Please close this chat window.',
      reportModalTitle: 'Report User',
      blockModalTitle: 'Block User',
      reportReasonLabel: 'Reason for reporting',
      reportDescriptionLabel: 'Detailed description (optional)',
      reportPlaceholder: 'Please enter specific details...',
      reportNotice: '* Reports are reviewed within 24 hours, and appropriate action will be taken if necessary.',
      submitting: 'Submitting...',
      processing: 'Processing...',
      blockConfirm: 'Are you sure you want to block {name}? You will no longer be able to chat with or be matched with this user.',
      reportMessage: 'Report Message',
      messageOptionsTooltip: 'Message options',
      reportTargetMessage: 'Message to report:',
      inputPlaceholderDisabled: 'Conversation status has changed.',
      inputPlaceholderDefault: 'type message...',
      inappropriateContentWarning: 'Inappropriate language is included.',
      policyViolationWarning: 'Content violates our service policy.',
      cantSendWarning: 'Cannot send message. {reason}',
      inappropriateContentDetected: 'Inappropriate content detected.',
      sendButtonBlockedTooltip: 'Contains inappropriate content',
      sendButtonTooltip: 'Send Message',
      moderationNotice: 'Inappropriate content is automatically detected, and reported content is reviewed within 24 hours.',
      alert: {
        selfReport: 'You cannot report yourself.',
        alreadyReportedUser: 'You have already reported this user.',
        alreadyReportedMessage: 'You have already reported this message.',
        permissionError: 'You do not have permission. Please check your login status.',
        duplicateError: 'You have already reported this.',
        reportError: 'An error occurred while submitting the report: {message}',
        reportSuccess: 'Your report has been received. We will review it within 24 hours.',
        genericError: 'An unexpected error occurred while submitting.',
        selfBlock: 'You cannot block yourself.',
        alreadyBlocked: 'You have already blocked this user.',
        blockError: 'An error occurred while blocking the user: {message}',
        blockSuccess: 'User has been blocked.',
        selfReportMessage: 'You cannot report your own message.',
      },
      reportReasons: {
        select: 'Select a reason',
        inappropriateContent: 'Inappropriate Content',
        harassment: 'Harassment or Abuse',
        spam: 'Spam',
        impersonation: 'Impersonation',
        sexualContent: 'Sexual Content',
        other: 'Other',
      },
    },
    tutorial: {
      step1: 'Hello!\nPress the microphone button to start voice recognition.',
      step2: 'Keywords you say multiple times in a short period will be recorded.\nEveryday conversations or random words are all good.',
      step3: 'Every day at midnight, if there\'s someone with similar keywords to yours from today, a Chat button will appear.',
      step4: 'You can chat with the person you randomly met for just one day. Keywords reset at midnight.',
      next: 'Next',
      start: 'Get Started',
    },
    settings: {
      title: 'Manage Blocked Users',
      manageBlockedList: 'Manage Blocked List',
      refresh: 'Refresh',
      unblock: 'Unblock',
      unblocking: 'Unblocking',
      unblockConfirm: 'Are you sure you want to unblock {name}?',
      unblockNotice: 'If you unblock this user, you may be matched with them again.',
      blockedOnDate: 'Blocked on',
      noBlockedUsers: 'No blocked users.',
      unknownUser: 'Unknown User',
      loginRequired: 'Login is required.',
      alert: {
        loadError: 'Failed to load the blocked list.',
        unblockError: 'An error occurred while unblocking.',
        unblockSuccess: '{name} has been unblocked.',
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