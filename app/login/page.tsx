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
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json() as { success: boolean; data?: { token: string; user: unknown }; error?: string };
      if (!json.success) { setError(json.error || 'Đăng nhập thất bại'); return; }
      setAuth(json.data!.token, json.data!.user as Parameters<typeof setAuth>[1]);
      router.push('/');
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#e6f0fa] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#004EAB]">
            <span className="text-2xl font-bold">R</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">RepairHub</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý sửa chữa thiết bị</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 block">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#f8fafc] border border-transparent focus:border-[#004EAB] focus:bg-white focus:ring-1 focus:ring-[#004EAB] outline-none rounded-xl px-4 py-3 text-sm transition-colors placeholder:text-slate-400"
              placeholder="Nhập tên đăng nhập"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 block">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#f8fafc] border border-transparent focus:border-[#004EAB] focus:bg-white focus:ring-1 focus:ring-[#004EAB] outline-none rounded-xl px-4 py-3 text-sm transition-colors placeholder:text-slate-400"
              placeholder="Nhập mật khẩu"
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#004EAB] text-white py-4 rounded-full font-semibold text-[15px] shadow-sm active:opacity-90 transition-opacity disabled:opacity-60 mt-2"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
