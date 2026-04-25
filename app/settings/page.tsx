'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { isAdmin, clearAuth } from '@/lib/auth';

interface BackupLog { id: string; filename: string; size_bytes: number; status: string; created_at: string }
interface Branch { id: string; name: string; address: string; phone: string; manager_name: string; is_active: boolean }
interface ApiResponse<T> { success: boolean; data: T }

export default function SettingsPage() {
  const router = useRouter();
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [backing, setBacking] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '', manager_name: '' });
  const [error, setError] = useState('');
  const admin = isAdmin();
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  function loadData() {
    api.get<ApiResponse<Branch[]>>('/branches?include_inactive=true').then((r) => setBranches(r.data)).catch(() => null);
    if (admin) {
      api.get<ApiResponse<{ logs: BackupLog[] }>>('/backup').then((r) => setBackupLogs(r.data.logs)).catch(() => null);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [admin]);

  async function backupNow() {
    setBacking(true); setError('');
    try {
      const r = await api.post<ApiResponse<{ filename: string }>>('/backup/now');
      alert(`Sao lưu thành công: ${r.data.filename}`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sao lưu thất bại');
    } finally {
      setBacking(false);
    }
  }

  async function createBranch() {
    setError('');
    try {
      await api.post('/branches', branchForm);
      setBranchForm({ name: '', address: '', phone: '', manager_name: '' });
      setShowBranchForm(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  }

  async function toggleBranch(b: Branch) {
    if (b.is_active) {
      await api.delete(`/branches/${b.id}`);
    } else {
      await api.post(`/branches/${b.id}/enable`);
    }
    loadData();
  }

  function logout() {
    api.post('/auth/logout').finally(() => { clearAuth(); router.replace('/login'); });
  }

  return (
    <AuthGuard>
      <div>
        <PageHeader title="Cài đặt" />
        <div className="p-4 space-y-4">

          {/* Branches */}
          <Card>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800">Chi nhánh</h3>
              {admin && (
                <button onClick={() => setShowBranchForm((p) => !p)}
                  className="text-xs text-[#1565C0] font-medium">{showBranchForm ? 'Huỷ' : '+ Thêm'}</button>
              )}
            </div>
            {showBranchForm && (
              <div className="space-y-2 mb-4">
                <input value={branchForm.name} onChange={(e) => setBranchForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Tên chi nhánh *" className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
                <input value={branchForm.address} onChange={(e) => setBranchForm((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Địa chỉ" className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
                <input value={branchForm.phone} onChange={(e) => setBranchForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="Số điện thoại" className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
                <input value={branchForm.manager_name} onChange={(e) => setBranchForm((p) => ({ ...p, manager_name: e.target.value }))}
                  placeholder="Tên quản lý" className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button onClick={createBranch} className="w-full bg-[#1565C0] text-white py-2 rounded-xl text-sm font-medium">
                  Tạo chi nhánh
                </button>
              </div>
            )}
            <div className="space-y-2">
              {branches.map((b) => (
                <div key={b.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.name}</p>
                    {b.address && <p className="text-xs text-gray-400">{b.address}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.is_active ? 'Hoạt động' : 'Tắt'}
                    </span>
                    {admin && (
                      <button onClick={() => toggleBranch(b)}
                        className={`text-xs px-2 py-1 rounded-lg border ${b.is_active ? 'border-red-200 text-red-500' : 'border-green-200 text-green-600'}`}>
                        {b.is_active ? 'Tắt' : 'Bật'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {branches.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Chưa có chi nhánh nào</p>}
            </div>
          </Card>

          {/* Backup (admin only) */}
          {admin && (
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3">Sao lưu dữ liệu</h3>
              <button onClick={backupNow} disabled={backing}
                className="w-full bg-[#1565C0] text-white py-3 rounded-xl font-medium text-sm mb-3 disabled:opacity-60">
                {backing ? 'Đang sao lưu...' : '💾 Sao lưu ngay'}
              </button>
              <div className="space-y-2">
                {backupLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600 text-xs truncate">{log.filename}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs ${log.status === 'SUCCESS' ? 'text-green-600' : 'text-red-500'}`}>
                        {log.status === 'SUCCESS' ? '✓' : '✗'}
                      </span>
                      <a href={`${API_BASE}/backup/download/${log.filename}`}
                        className="text-xs text-[#1565C0]" download>Tải</a>
                    </div>
                  </div>
                ))}
                {backupLogs.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Chưa có bản sao lưu nào</p>}
              </div>
            </Card>
          )}

          {/* Logout */}
          <button onClick={logout}
            className="w-full py-3 border border-red-200 text-red-500 rounded-xl font-medium text-sm">
            Đăng xuất
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
