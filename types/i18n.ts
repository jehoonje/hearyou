export interface Translations {
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    close: string;
    back: string;
    continue: string;
    done: string;
    email: string;
    password: string;
    name: string;
    signIn: string;
    signUp: string;
    signOut: string;
    getStarted: string;
    or: string;
    match: string;
    chat: string;
    mainPage: string;
    delete: string;
    feedback: string;
    help: string;
    bookmark: string;
  };
  auth: {
    emailPlaceholder: string;
    passwordPlaceholder: string;
    namePlaceholder: string;
    passwordHint: string;
    invalidEmail: string;
    loginProcessing: string;
    signupProcessing: string;
    processing: string;
    createAccount: string;
    continueWithApple: string;
    quickTour: string;
    emailSent: string;
    emailSentDescription: string;
    accountInfo: string;
    signupInfo: string;
  };
  voice: {
    emptyKeyword:string;
    micButtonLabel: string;
    speakInstruction: string;
    detectedKeywords: string;
    audioError: string;
    matchmaking: string;
    matching: string;
    noMatch: string;
    demoModeNotice: string;
  };
  modal: {
    privacyPolicy: string;
    agree: string;
    disagree: string;
    helpModalTitle: string;
    bookmarkModalTitle: string;
    deleteAccountTitle: string;
    deleteAccountWarning: string;
    deleteAccountWarnings: {
      keywords: string;
      chats: string;
      matches: string;
      irreversible: string;
    };
    deleteAccountConfirm: string;
    deleteAccountPlaceholder: string;
    deleteAccountButton: string;
    deleteAccountProcessing: string;
    deleteAccountSuccess: string;
  };
  bookmark: {
    title: string;
    mobileInstructions: string;
    desktopInstructions: string;
  };
  notifications: {
    inAppBrowser: {
      title: string;
      message: string;
      suggestion: string;
    };
  };
}