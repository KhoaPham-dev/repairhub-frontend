'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { setAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json() as { success: boolean; data?: { token: string; user: unknown }; error?: string };
      if (!json.success) { setError(json.error || 'Đăng nhập thất bại'); return; }
      setAuth(json.data!.token, json.data!.user as Parameters<typeof setAuth>[1]);
      router.push('/orders');
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full bg-bg flex items-center justify-center px-4">
      <div className="bg-surface border border-border-subtle rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔧</div>
          <h1 className="text-2xl font-bold text-accent">RepairHub</h1>
          <p className="text-text-muted text-sm mt-1">Quản lý sửa chữa thiết bị</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-surface outline-none focus:border-accent caret-accent placeholder:text-text-muted text-text-base text-base"
              placeholder="Nhập tên đăng nhập"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-surface outline-none focus:border-accent caret-accent placeholder:text-text-muted text-text-base text-base"
              placeholder="Nhập mật khẩu"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-[#0B0B0B] py-3 rounded-xl font-semibold text-base disabled:bg-surface disabled:text-text-muted mt-2"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
