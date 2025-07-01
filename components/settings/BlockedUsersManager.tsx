// src/components/settings/BlockedUsersManager.tsx - 수정된 버전
import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../app/contexts/LanguageContext';
import { Ban, Trash2, RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlockedUser {
  id: string;
  blocked_user_id: string;
  created_at: string;
  username?: string;
}

interface BlockedUsersManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BlockedUsersManager = ({ isOpen, onClose }: BlockedUsersManagerProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const loadBlockedUsers = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // 1. 먼저 blocked_users 테이블에서 차단된 사용자 ID만 가져오기
      const { data: blockedData, error: blockedError } = await supabase
        .from('blocked_users')
        .select('id, blocked_user_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (blockedError) throw blockedError;

      if (!blockedData || blockedData.length === 0) {
        setBlockedUsers([]);
        return;
      }

      // 2. 차단된 사용자들의 프로필 정보 가져오기
      const blockedUserIds = blockedData.map(item => item.blocked_user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', blockedUserIds);

      if (profilesError) {
        console.error('프로필 조회 오류:', profilesError);
        // 프로필 정보가 없어도 차단 목록은 표시
      }

      // 3. 데이터 병합
      const formattedData = blockedData.map(blockedItem => {
        const profile = profilesData?.find(p => p.id === blockedItem.blocked_user_id);
        return {
          id: blockedItem.id,
          blocked_user_id: blockedItem.blocked_user_id,
          created_at: blockedItem.created_at,
          username: profile?.username || t.settings.unknownUser
        };
      });

      setBlockedUsers(formattedData);
    } catch (error) {
      console.error('차단 목록 조회 오류:', error);
      alert(t.settings.alert.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase, t]);

  const handleUnblock = useCallback(async (blockId: string, username: string) => {
    if (!confirm(t.settings.unblockConfirm.replace('{name}', username))) return;

    setIsUnblocking(blockId);
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(user => user.id !== blockId));
      alert(t.settings.alert.unblockSuccess.replace('{name}', username));
    } catch (error) {
      console.error('차단 해제 오류:', error);
      alert(t.settings.alert.unblockError);
    } finally {
      setIsUnblocking(null);
    }
  }, [supabase, t]);

  useEffect(() => {
    if (isOpen) {
      loadBlockedUsers();
    }
  }, [isOpen, loadBlockedUsers]);

  const dateLocale = language === 'ko' ? 'ko-KR' : 'en-US';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-md w-full mx-auto bg-gray-900/20 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden"
            onClick={(e: any) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Ban className="text-red-400" size={20} />
                <h2 className="text-lg font-semibold text-white">{t.settings.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadBlockedUsers}
                  disabled={isLoading}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title={t.settings.refresh}
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title={t.common.close}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 내용 */}
            <div className="max-h-96 overflow-y-auto">
              {!user ? (
                <div className="p-8 text-center text-gray-400">
                  {t.settings.loginRequired}
                </div>
              ) : isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-gray-400">{t.common.loading}</p>
                </div>
              ) : blockedUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Ban size={32} className="mx-auto mb-4 opacity-50" />
                  <p>{t.settings.noBlockedUsers}</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {blockedUsers.map((blockedUser) => (
                    <div key={blockedUser.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{blockedUser.username}</p>
                        <p className="text-xs text-gray-400">
                          {`${new Date(blockedUser.created_at).toLocaleDateString(dateLocale, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })} ${t.settings.blockedOnDate}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleUnblock(blockedUser.id, blockedUser.username || t.settings.unknownUser)}
                        disabled={isUnblocking === blockedUser.id}
                        className="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                      >
                        {isUnblocking === blockedUser.id ? (
                          <>
                            <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                            {t.settings.unblocking}
                          </>
                        ) : (
                          <>
                            <Trash2 size={14} />
                            {t.settings.unblock}
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 안내 메시지 */}
            {blockedUsers.length > 0 && (
              <div className="p-4 bg-gray-800/50 border-t border-white/10">
                <p className="text-xs text-gray-400 text-center">
                  {t.settings.unblockNotice}
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BlockedUsersManager;