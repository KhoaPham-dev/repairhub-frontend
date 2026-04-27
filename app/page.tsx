'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import PageHeader from '@/components/PageHeader';
import SegmentedControl from '@/components/SegmentedControl';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface StatusCounts { [key: string]: number }
interface RevenueBar { day: string; revenue: number }

const PERIOD_TABS = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Tuần này', value: 'week' },
  { label: 'Tháng này', value: 'month' },
];

function formatMoney(value: number): string {
  return value.toLocaleString('vi-VN');
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<StatusCounts>({});
  const [period, setPeriod] = useState('today');
  const [revenueData, setRevenueData] = useState<RevenueBar[]>([]);
  const user = getUser();

  useEffect(() => {
    api.get<{ success: boolean; data: StatusCounts }>(`/orders/status-counts?period=${period}`)
      .then((r) => setCounts(r.data))
      .catch(() => null);

    api.get<{ success: boolean; data: RevenueBar[] }>(`/dashboard/revenue?period=${period}`)
      .then((r) => setRevenueData(r.data))
      .catch(() => null);
  }, [period]);

  const TERMINAL = ['DA_GIAO', 'HUY_TRA_MAY'];
  const activeTotal = Object.entries(counts)
    .filter(([s]) => !TERMINAL.includes(s))
    .reduce((sum, [, c]) => sum + c, 0);
  const delivered = counts['DA_GIAO'] ?? 0;
  const cancelled = counts['HUY_TRA_MAY'] ?? 0;
  const newToday = counts['TIEP_NHAN'] ?? 0;

  const maxRevenue = revenueData.length > 0 ? Math.max(...revenueData.map((b) => b.revenue)) : 0;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8F9FB] pb-24">
        <div className="sticky top-0 z-10 bg-[#F8F9FB]">
          <PageHeader title="Tổng quan" subtitle={`Xin chào, ${user?.full_name ?? ''}`} />
          <div className="px-4 pb-3">
            <SegmentedControl tabs={PERIOD_TABS} active={period} onChange={setPeriod} />
          </div>
        </div>

        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <p className="text-sm text-slate-500 mb-2 font-medium">Đang xử lý</p>
              <p className="text-2xl font-bold text-[#004EAB]">{activeTotal}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 mb-2 font-medium">Đơn hoàn tất</p>
              <p className="text-2xl font-bold text-[#1D7F54]">{delivered}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 mb-2 font-medium">Tiếp nhận</p>
              <p className="text-2xl font-bold text-slate-900">{newToday}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 mb-2 font-medium">Đơn huỷ</p>
              <p className="text-2xl font-bold text-red-500">{cancelled}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[15px] font-bold text-slate-900">Biểu đồ doanh thu</h2>
              <div className="flex items-center text-xs text-[#1D7F54] font-medium gap-1">
                <TrendingUp size={12} /> +12%
              </div>
            </div>
            <div className="flex items-end justify-between h-32 gap-2">
              {revenueData.map((bar, i) => {
                const barHeightPercent = maxRevenue > 0 ? Math.round((bar.revenue / maxRevenue) * 100) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
                    <span className="text-[9px] text-slate-500 leading-none truncate w-full text-center">{formatMoney(bar.revenue)}</span>
                    <div
                      className="w-full bg-[#e6f0fa] hover:bg-[#004EAB] rounded-t-md transition-colors"
                      style={{ height: barHeightPercent > 0 ? `${barHeightPercent}%` : '4px' }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-3 text-xs text-slate-400">
              {revenueData.map((bar) => <span key={bar.day}>{bar.day}</span>)}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
