'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }

    const user = getUser();
    if (!user) {
      setError('Không tìm thấy thông tin người dùng');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/users/${user.id}/password`, { newPassword: password });
      setSuccess('Đổi mật khẩu thành công');
      setPassword('');
      setTimeout(() => {
        router.push('/settings');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8F9FB] pb-24">
        <PageHeader title="Đổi mật khẩu" onBack={() => router.push('/settings')} />

        <div className="px-4 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Nhập mật khẩu mới"
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none pr-12 transition-colors ${
                    error
                      ? 'border-red-400 focus:border-red-500 bg-red-50'
                      : 'border-slate-200 focus:border-[#715DF2] bg-[#f8fafc]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 active:text-slate-600"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <p className="text-xs text-slate-400">Tối thiểu 8 ký tự</p>
            </div>

            {success && (
              <p className="text-green-600 text-sm text-center font-medium">{success}</p>
            )}

            <button
              type="submit"
              disabled={saving || !password}
              className="w-full bg-[#715DF2] text-white py-4 rounded-full font-semibold text-base disabled:opacity-60 shadow-sm"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
