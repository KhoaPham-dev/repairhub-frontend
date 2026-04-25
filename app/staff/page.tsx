'use client';

import { useEffect, useState } from 'react';
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
        <div>
          <PageHeader title="Nhân viên" />
          <div className="p-4">
            <Card className="text-center py-8">
              <div className="text-4xl mb-2">🔒</div>
              <div className="text-gray-600">Chỉ quản trị viên mới có thể truy cập trang này</div>
            </Card>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div>
        <PageHeader title="Nhân viên" />
        <div className="p-4 space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowForm((p) => !p)}
              className="bg-[#1565C0] text-white px-4 py-2 rounded-xl text-sm font-medium">
              {showForm ? 'Huỷ' : '+ Thêm nhân viên'}
            </button>
          </div>

          {showForm && (
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">Thêm nhân viên mới</h3>
              <div className="space-y-3">
                <input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  placeholder="Tên đăng nhập *" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]" />
                <input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  placeholder="Họ tên *" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]" />
                <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Mật khẩu *" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]" />
                <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]">
                  <option value="TECHNICIAN">Kỹ thuật viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button onClick={createUser}
                  className="w-full bg-[#1565C0] text-white py-3 rounded-xl font-semibold text-sm">
                  Tạo tài khoản
                </button>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            {users.map((u) => (
              <Card key={u.id}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{u.full_name}</p>
                    <p className="text-sm text-gray-500">@{u.username}</p>
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
      </div>
    </AuthGuard>
  );
}
