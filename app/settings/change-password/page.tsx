'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const isChangingOther = !!targetUserId;
  const backPath = isChangingOther ? '/settings/staff' : '/settings';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    const currentUser = getUser();
    if (!currentUser) {
      setError('Không tìm thấy thông tin người dùng');
      return;
    }

    const userId = targetUserId ?? currentUser.id;

    setSaving(true);
    try {
      await api.patch(`/users/${userId}/password`, { newPassword: password });
      setSuccess('Đổi mật khẩu thành công');
      setPassword('');
      setTimeout(() => {
        router.push(backPath);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg pb-24">
        <PageHeader title="Đổi mật khẩu" onBack={() => router.push(backPath)} />

        <div className="px-4 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-surface rounded-2xl border border-border-subtle p-4 space-y-3">
              <label className="block text-sm font-medium text-text-muted">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Nhập mật khẩu mới"
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none pr-12 transition-colors text-text-base caret-accent placeholder:text-text-muted ${
                    error
                      ? 'border-red-500 focus:border-red-500 bg-surface-alt'
                      : 'border-border-subtle focus:border-accent bg-surface-alt'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted active:text-text-base"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <p className="text-xs text-text-muted">Tối thiểu 8 ký tự</p>
            </div>

            {success && (
              <p className="text-green-400 text-sm text-center font-medium">{success}</p>
            )}

            <button
              type="submit"
              disabled={saving || !password}
              className="w-full bg-accent text-[#0B0B0B] py-4 rounded-full font-semibold text-base disabled:bg-surface disabled:text-text-muted"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense>
      <ChangePasswordForm />
    </Suspense>
  );
}
