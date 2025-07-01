// src/components/settings/SettingsPage.tsx - 차단 관리 통합 예시
import { useState } from 'react';
import { Settings, Ban, Shield, User, ChevronRight } from 'lucide-react';
import BlockedUsersManager from './BlockedUsersManager';

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const settingsSections = [
    {
      id: 'blocked-users',
      icon: Ban,
      title: '차단된 사용자',
      description: '차단한 사용자 목록을 관리합니다',
      component: BlockedUsersManager
    },
    {
      id: 'privacy',
      icon: Shield,
      title: '개인정보 보호',
      description: '개인정보 및 보안 설정',
      component: null // 추후 구현
    },
    {
      id: 'profile',
      icon: User,
      title: '프로필 설정',
      description: '프로필 정보를 수정합니다',
      component: null // 추후 구현
    }
  ];

  if (activeSection) {
    const section = settingsSections.find(s => s.id === activeSection);
    const Component = section?.component;

    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-md mx-auto">
          {/* 뒤로가기 헤더 */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setActiveSection(null)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <h1 className="text-xl font-semibold">{section?.title}</h1>
          </div>

          {/* 선택된 섹션 컴포넌트 */}
          {Component && <Component />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-md mx-auto">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-8">
          <Settings className="text-blue-400" size={24} />
          <h1 className="text-2xl font-bold">설정</h1>
        </div>

        {/* 설정 섹션 목록 */}
        <div className="space-y-3">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            const isAvailable = section.component !== null;

            return (
              <button
                key={section.id}
                onClick={() => isAvailable && setActiveSection(section.id)}
                disabled={!isAvailable}
                className={`
                  w-full p-4 rounded-lg border text-left transition-all
                  ${isAvailable
                    ? 'bg-gray-900/50 border-white/20 hover:bg-gray-800/50 hover:border-white/30'
                    : 'bg-gray-900/20 border-gray-700 opacity-50 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon 
                      size={20} 
                      className={isAvailable ? 'text-blue-400' : 'text-gray-500'} 
                    />
                    <div>
                      <h3 className="font-medium">{section.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                  {isAvailable && (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                </div>
                {!isAvailable && (
                  <div className="mt-2">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                      준비 중
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 앱 정보 */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="text-center text-gray-400 text-sm">
            <p>버전 1.0.0</p>
            <p className="mt-1">© 2025 Your App Name</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;