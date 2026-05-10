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
      <div className="min-h-screen bg-[#F8F9FB] pb-24">
        <PageHeader title="Cài đặt" />

        <div className="px-4 pt-2 space-y-5">
          {/* Account section */}
          <section>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Tài khoản</p>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
              <button
                onClick={() => router.push('/settings/change-password')}
                className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <KeyRound size={16} className="text-blue-600" />
                </div>
                <span className="flex-1 text-left text-sm font-medium text-slate-900">Đổi mật khẩu</span>
                <ChevronRight size={16} className="text-slate-300" />
              </button>

              <button
                onClick={() => setLogoutOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-red-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <LogOut size={16} className="text-red-500" />
                </div>
                <span className="flex-1 text-left text-sm font-medium text-red-500">Đăng xuất</span>
              </button>
            </div>
          </section>

          {/* Admin-only section */}
          {admin && (
            <section>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Quản trị</p>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50">
                <button
                  onClick={() => router.push('/settings/staff')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Users size={16} className="text-purple-600" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-slate-900">Quản lý nhân viên</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>

                <button
                  onClick={() => router.push('/settings/reports')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <BarChart2 size={16} className="text-green-600" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-slate-900">Báo cáo doanh thu</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>

                <button
                  onClick={() => router.push('/settings/reports/partner')}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet size={16} className="text-orange-600" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-slate-900">Báo cáo đối tác</span>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>
            </section>
          )}
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
