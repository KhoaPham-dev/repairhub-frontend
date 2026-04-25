'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface StatusCounts { [key: string]: number }

const STATUS_LABELS: Record<string, string> = {
  TIEP_NHAN: 'Tiếp nhận',
  DANG_KIEM_TRA: 'Đang kiểm tra',
  BAO_GIA: 'Báo giá',
  CHO_LINH_KIEN: 'Chờ linh kiện',
  DANG_SUA_CHUA: 'Đang sửa chữa',
  KIEM_TRA_LAI: 'Kiểm tra lại',
  SUA_XONG: 'Sửa xong',
  DA_GIAO: 'Đã giao',
  HUY_TRA_MAY: 'Huỷ/Trả máy',
};

export default function DashboardPage() {
  const router = useRouter();
  const [counts, setCounts] = useState<StatusCounts>({});
  const user = getUser();

  useEffect(() => {
    api.get<{ success: boolean; data: StatusCounts }>('/orders/status-counts')
      .then((r) => setCounts(r.data))
      .catch(() => null);
  }, []);

  const active = Object.entries(counts).filter(([s]) => !['DA_GIAO', 'HUY_TRA_MAY'].includes(s));
  const total = active.reduce((s, [, c]) => s + c, 0);

  return (
    <AuthGuard>
      <div>
        <PageHeader title="Tổng quan" />
        <div className="p-4 space-y-4">
          <p className="text-gray-600 text-sm">Xin chào, <span className="font-semibold">{user?.full_name}</span></p>

          <div className="grid grid-cols-2 gap-3">
            <Card>
              <div className="text-3xl font-bold text-[#1565C0]">{total}</div>
              <div className="text-sm text-gray-500 mt-1">Đơn đang xử lý</div>
            </Card>
            <Card
              className="cursor-pointer active:opacity-80"
              onClick={() => router.push('/orders')}
            >
              <div className="text-3xl font-bold text-orange-500">{counts['CHO_LINH_KIEN'] ?? 0}</div>
              <div className="text-sm text-gray-500 mt-1">Chờ linh kiện</div>
            </Card>
            <Card>
              <div className="text-3xl font-bold text-green-600">{counts['DA_GIAO'] ?? 0}</div>
              <div className="text-sm text-gray-500 mt-1">Đã giao</div>
            </Card>
            <Card>
              <div className="text-3xl font-bold text-red-500">{counts['HUY_TRA_MAY'] ?? 0}</div>
              <div className="text-sm text-gray-500 mt-1">Huỷ/Trả máy</div>
            </Card>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-2">Theo trạng thái</h2>
            <div className="space-y-2">
              {active.map(([status, count]) => (
                <div key={status} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-sm">
                  <span className="text-sm text-gray-700">{STATUS_LABELS[status] ?? status}</span>
                  <span className="font-bold text-[#1565C0]">{count}</span>
                </div>
              ))}
              {active.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Chưa có đơn hàng nào</p>}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
