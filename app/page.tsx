'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SegmentedControl from '@/components/SegmentedControl';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface StatusCounts { [key: string]: number }

const PERIODS = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Tuần này', value: 'week' },
  { label: 'Tháng này', value: 'month' },
];

export default function DashboardPage() {
  const [counts, setCounts] = useState<StatusCounts>({});
  const [period, setPeriod] = useState('today');
  const user = getUser();

  useEffect(() => {
    api.get<{ success: boolean; data: StatusCounts }>('/orders/status-counts')
      .then((r) => setCounts(r.data))
      .catch(() => null);
  }, []);

  const completed = counts['DA_GIAO'] ?? 0;
  const cancelled = counts['HUY_TRA_MAY'] ?? 0;
  const newOrders = counts['TIEP_NHAN'] ?? 0;
  const active = Object.entries(counts)
    .filter(([s]) => !['DA_GIAO', 'HUY_TRA_MAY'].includes(s))
    .reduce((s, [, c]) => s + c, 0);

  return (
    <AuthGuard>
      <div className="pb-24">
        <PageHeader title="Tổng quan" subtitle={user?.full_name ? `Xin chào, ${user.full_name}` : undefined} />

        <div className="px-4 mb-6">
          <SegmentedControl tabs={PERIODS} active={period} onChange={setPeriod} />
        </div>

        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <p className="text-sm text-slate-500 mb-2 font-medium">Đang xử lý</p>
              <p className="text-xl font-bold text-[#004EAB]">{active}</p>
              <div className="flex items-center text-xs text-[#1D7F54] mt-2 font-medium">
                <TrendingUp size={12} className="mr-1" /> Đơn hàng
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 mb-2 font-medium">Đơn hoàn tất</p>
              <p className="text-xl font-bold text-[#1D7F54]">{completed}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 mb-2 font-medium">Đơn mới</p>
              <p className="text-xl font-bold text-slate-900">{newOrders}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 mb-2 font-medium">Đơn huỷ</p>
              <p className="text-xl font-bold text-red-500">{cancelled}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-[15px] font-bold text-slate-900 mb-6">Biểu đồ đơn hàng</h2>
            <div className="flex items-end justify-between h-24 gap-2">
              {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-[#e6f0fa] rounded-t-md hover:bg-[#004EAB] transition-colors"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-400">
              <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
