'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { isAdmin, getUser } from '@/lib/auth';

interface User { id: string; username: string; full_name: string; role: string; is_active: boolean; created_at: string }
interface ApiResponse<T> { success: boolean; data: T }

export default function StaffPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'TECHNICIAN' });
  const [error, setError] = useState('');
  const currentUser = getUser();

  function loadUsers() {
    if (!isAdmin()) return;
    api.get<ApiResponse<User[]>>('/users').then((r) => setUsers(r.data)).catch(() => null);
  }

  useEffect(() => { loadUsers(); }, []);

  async function createUser() {
    setError('');
    try {
      await api.post('/users', form);
      setForm({ username: '', password: '', full_name: '', role: 'TECHNICIAN' });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  }

  async function toggleUser(u: User) {
    await api.put(`/users/${u.id}`, { is_active: !u.is_active });
    loadUsers();
  }

  if (!isAdmin()) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F8F9FB] pb-24">
          <PageHeader title="Nhân viên" />
          <div className="p-4">
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm border border-slate-100">
              <div className="text-4xl mb-2">🔒</div>
              <div className="text-slate-600 text-sm">Chỉ quản trị viên mới có thể truy cập trang này</div>
            </div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8F9FB] pb-24">
        <PageHeader
          title="Nhân viên"
          right={
            <button
              onClick={() => setShowForm((p) => !p)}
              className="w-8 h-8 flex items-center justify-center bg-[#715DF2] text-white rounded-xl"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          }
        />

        <div className="px-4 pt-3 space-y-3">
          {showForm && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
              <h3 className="font-semibold text-slate-900 text-sm">Thêm nhân viên mới</h3>
              <input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Họ tên *" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#715DF2]" />
              <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                placeholder="Tên đăng nhập *" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#715DF2]" />
              <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Mật khẩu *" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#715DF2]" />
              <div className="flex gap-2">
                {[['TECHNICIAN', 'Kỹ thuật viên'], ['ADMIN', 'Quản trị viên']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, role: v }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.role === v ? 'bg-[#715DF2] text-white border-[#715DF2]' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setShowForm(false); setError(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium">Huỷ</button>
                <button onClick={createUser}
                  className="flex-1 py-2.5 rounded-xl bg-[#715DF2] text-white text-sm font-semibold">Tạo tài khoản</button>
              </div>
            </div>
          )}

          {users.map((u) => (
            <Card key={u.id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-900">{u.full_name}</p>
                  <p className="text-sm text-slate-500">@{u.username}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {u.role === 'ADMIN' ? 'Quản trị viên' : 'Kỹ thuật viên'}
                  </span>
                </div>
                {u.id !== currentUser?.id && (
                  <button onClick={() => toggleUser(u)}
                    className={`text-xs px-3 py-1.5 rounded-xl border ${u.is_active ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}>
                    {u.is_active ? 'Khoá' : 'Mở khoá'}
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
