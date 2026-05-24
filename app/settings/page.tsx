'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart2, ChevronRight, FileSpreadsheet, KeyRound, LogOut, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import ConfirmModal from '@/components/ConfirmModal';
import { api } from '@/lib/api';
import { isAdmin, clearAuth } from '@/lib/auth';

export default function SettingsPage() {
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const admin = isAdmin();

  function handleLogoutConfirm() {
    setLogoutOpen(false);
    api.post('/auth/logout').finally(() => {
      clearAuth();
      router.replace('/login');
    });
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg pb-24">
        <PageHeader title="Cài đặt" />

        <div className="px-4 pt-2 space-y-5">
          {/* Admin-only section */}
          {admin && (
            <section>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">Quản trị</p>
              <div className="bg-surface rounded-2xl border border-border-subtle divide-y divide-border-subtle">
                <button
                  onClick={() => router.push('/settings/staff')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-alt transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Users size={16} className="text-purple-400" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-text-base">Quản lý nhân viên</span>
                  <ChevronRight size={16} className="text-text-muted" />
                </button>

                <button
                  onClick={() => router.push('/settings/reports')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-alt transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <BarChart2 size={16} className="text-green-400" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-text-base">Báo cáo doanh thu</span>
                  <ChevronRight size={16} className="text-text-muted" />
                </button>

                <button
                  onClick={() => router.push('/settings/reports/partner')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-alt transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet size={16} className="text-orange-400" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-text-base">Báo cáo đối tác</span>
                  <ChevronRight size={16} className="text-text-muted" />
                </button>
              </div>
            </section>
          )}

          {/* Account section */}
          <section>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 px-1">Tài khoản</p>
            <div className="bg-surface rounded-2xl border border-border-subtle divide-y divide-border-subtle">
              <button
                onClick={() => router.push('/settings/change-password')}
                className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-alt transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <KeyRound size={16} className="text-accent" />
                </div>
                <span className="flex-1 text-left text-sm font-medium text-text-base">Đổi mật khẩu</span>
                <ChevronRight size={16} className="text-text-muted" />
              </button>

              <button
                onClick={() => setLogoutOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-red-900/20 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <LogOut size={16} className="text-red-400" />
                </div>
                <span className="flex-1 text-left text-sm font-medium text-red-400">Đăng xuất</span>
              </button>
            </div>
          </section>
        </div>

        <ConfirmModal
          open={logoutOpen}
          title="Đăng xuất"
          message="Bạn có chắc chắn muốn đăng xuất không?"
          confirmLabel="Đăng xuất"
          onConfirm={handleLogoutConfirm}
          onCancel={() => setLogoutOpen(false)}
        />
      </div>
    </AuthGuard>
  );
}
