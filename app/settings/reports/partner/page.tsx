'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';
import { isAdmin, getToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Partner {
  id: string;
  name: string;
  phone: string;
}

interface ApiListResponse {
  success: boolean;
  data: Partner[];
}

type DatePreset = 'week' | 'month' | 'custom';

function getTodayVN(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function getMondayVN(): string {
  const now = new Date();
  // Get current day in Ho Chi Minh timezone
  const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const today = new Date(todayStr + 'T00:00:00');
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);
  return monday.toLocaleDateString('sv-SE');
}

function getFirstOfMonthVN(): string {
  const monthStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 7);
  return `${monthStr}-01`;
}

function computeDates(preset: DatePreset, customStart: string, customEnd: string): { start: string; end: string } {
  if (preset === 'week') {
    return { start: getMondayVN(), end: getTodayVN() };
  }
  if (preset === 'month') {
    return { start: getFirstOfMonthVN(), end: getTodayVN() };
  }
  return { start: customStart, end: customEnd };
}

export default function PartnerReportPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function loadPartners() {
    api
      .get<ApiListResponse>('/customers?type=PARTNER')
      .then((r) => setPartners(r.data))
      .catch(() => null);
  }

  useEffect(() => {
    if (!isAdmin()) {
      router.replace('/settings');
      return;
    }
    setAuthed(true);
    loadPartners();
  }, [router]);

  if (!authed) return null;

  const isDownloadDisabled = (): boolean => {
    if (!selectedPartnerId) return true;
    if (datePreset === 'custom') {
      if (!customStart || !customEnd) return true;
      if (customStart > customEnd) return true;
    }
    return loading;
  };

  async function handleDownload() {
    setLoading(true);
    setErrorMsg(null);
    const { start, end } = computeDates(datePreset, customStart, customEnd);
    const params = new URLSearchParams({ partner_id: selectedPartnerId, start, end });
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/reports/partner?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || `Lỗi ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `partner-report-${start}-${end}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo báo cáo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8F9FB] pb-24">
        <PageHeader
          title="Báo cáo đối tác"
          onBack={() => router.push('/settings')}
        />

        <div className="px-4 pt-4 space-y-5">
          {/* Partner section */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4">
            <label htmlFor="partner-select" className="block text-xs font-semibold text-slate-500 mb-2">
              Đối tác
            </label>
            <select
              id="partner-select"
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#715DF2]"
            >
              <option value="">Chọn đối tác</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.phone}
                </option>
              ))}
            </select>
          </section>

          {/* Period section */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4">
            <p className="text-xs font-semibold text-slate-500 mb-3">Kỳ báo cáo</p>

            <div className="flex gap-2 mb-4">
              {(
                [
                  { value: 'week', label: 'Tuần này' },
                  { value: 'month', label: 'Tháng này' },
                  { value: 'custom', label: 'Tuỳ chọn' },
                ] as { value: DatePreset; label: string }[]
              ).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setDatePreset(value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    datePreset === value
                      ? 'bg-[#715DF2] text-white border-[#715DF2]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 active:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="custom-start" className="block text-xs text-slate-500 mb-1">
                    Từ ngày
                  </label>
                  <input
                    id="custom-start"
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#715DF2]"
                  />
                </div>
                <div>
                  <label htmlFor="custom-end" className="block text-xs text-slate-500 mb-1">
                    Đến ngày
                  </label>
                  <input
                    id="custom-end"
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#715DF2]"
                  />
                </div>
              </div>
            )}
          </section>

          {/* Error message */}
          {errorMsg && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3"
            >
              {errorMsg}
            </div>
          )}

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={isDownloadDisabled()}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#715DF2] text-white rounded-2xl text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:opacity-90 transition-opacity"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang tạo...</span>
              </>
            ) : (
              <span>Tải xuống báo cáo</span>
            )}
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
