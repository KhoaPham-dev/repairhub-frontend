'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { isAdmin, getUser } from '@/lib/auth';

interface User { id: string; username: string; full_name: string; role: string; is_active: boolean; created_at: string }
interface ApiResponse<T> { success: boolean; data: T }

export default function StaffPage() {
  const router = useRouter();
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
        <div className="pb-24">
          <PageHeader title="Nhân viên" subtitle="Phân quyền & tài khoản" />
          <div className="px-4 py-12 text-center text-slate-400 text-sm">
            Chỉ quản trị viên mới có thể truy cập trang này
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="pb-24">
        <PageHeader
          title="Nhân viên"
          subtitle="Phân quyền & tài khoản"
          right={
            <button
              onClick={() => setShowForm((p) => !p)}
              className="text-xs font-semibold text-[#004EAB] px-3 py-1.5 bg-[#e6f0fa] rounded-lg"
            >
              {showForm ? 'Huỷ' : '+ Thêm'}
            </button>
          }
        />

        <div className="px-4 space-y-3">
          {showForm && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-slate-900">Thêm nhân viên mới</h3>
              {[
                { placeholder: 'Tên đăng nhập *', field: 'username', type: 'text' },
                { placeholder: 'Họ tên *', field: 'full_name', type: 'text' },
                { placeholder: 'Mật khẩu *', field: 'password', type: 'password' },
              ].map(({ placeholder, field, type }) => (
                <input
                  key={field}
                  type={type}
                  value={form[field as keyof typeof form]}
                  onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-[#f8fafc] border border-transparent focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB] outline-none rounded-xl px-4 py-3 text-sm"
                />
              ))}
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#004EAB] rounded-xl px-4 py-3 text-sm outline-none"
              >
                <option value="TECHNICIAN">Kỹ thuật viên</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button onClick={createUser} className="w-full py-3.5 rounded-full bg-[#004EAB] text-white font-semibold text-sm">
                Tạo tài khoản
              </button>
            </div>
          )}

          {users.map((u) => (
            <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
              {u.is_active && (
                <div className="absolute top-0 right-0 py-1 px-3 bg-[#e6f0fa] text-[#004EAB] text-[10px] font-bold rounded-bl-lg">ONLINE</div>
              )}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${u.role === 'ADMIN' ? 'bg-[#004EAB] text-white' : 'bg-slate-200 text-slate-600'}`}>
                {u.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-[15px] font-bold text-slate-900 truncate">{u.full_name}</h3>
                  {u.role === 'ADMIN' && <Shield size={14} className="text-[#004EAB] shrink-0" />}
                </div>
                <p className="text-sm text-slate-500">
                  {u.role === 'ADMIN' ? 'Quản trị viên' : 'Kỹ thuật viên'}
                </p>
              </div>
              {u.id !== currentUser?.id && (
                <button
                  onClick={() => toggleUser(u)}
                  className={`text-xs px-3 py-1.5 rounded-xl border shrink-0 ${u.is_active ? 'border-red-200 text-red-600' : 'border-green-200 text-green-600'}`}
                >
                  {u.is_active ? 'Khoá' : 'Mở khoá'}
                </button>
              )}
            </div>
          ))}

          <div className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">Cài đặt hệ thống</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
              <button
                onClick={() => router.push('/settings')}
                className="flex items-center justify-between w-full p-4 active:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">Sao lưu & Cài đặt</span>
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
