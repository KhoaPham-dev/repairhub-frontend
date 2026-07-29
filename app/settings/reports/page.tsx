'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Download, RefreshCw, Calendar } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import Spinner from '@/components/Spinner';
import { api } from '@/lib/api';
import { isAdmin, getToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6061';

export interface RevenueReport {
  id: string;
  period_start: string; // ISO date
  period_end: string;
  generated_at: string;
  status: 'pending' | 'done' | 'failed';
  error?: string;
}

interface ApiListResponse {
  success: boolean;
  data: RevenueReport[];
}

/** Format ISO date string as DD/MM/YYYY */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Relative time in Vietnamese: "Vừa xong" < 60s; "X giờ trước" < 24h; "X ngày trước" otherwise */
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return 'Vừa xong';
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return `${Math.max(1, hours)} giờ trước`;
  return `${Math.floor(diffMs / 86_400_000)} ngày trước`;
}

function StatusBadge({ status }: { status: RevenueReport['status'] }) {
  if (status === 'done') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 font-medium">
        Hoàn thành
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
        Đang tạo
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 font-medium">
      Lỗi
    </span>
  );
}

type PeriodType = 'this_month' | 'custom';

async function downloadReport(report: RevenueReport): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/reports/${report.id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const start = formatDate(report.period_start).replace(/\//g, '-');
  const end = formatDate(report.period_end).replace(/\//g, '-');
  a.download = `report-${start}-${end}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<RevenueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>('this_month');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [showCustomRange, setShowCustomRange] = useState(false);

  const loadReports = useCallback(() => {
    setLoading(true);
    api
      .get<ApiListResponse>('/reports')
      .then((r) => setReports(r.data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAdmin()) {
      router.replace('/settings');
      return;
    }
    loadReports();
  }, [loadReports, router]);

  async function handleGenerate() {
    setGenerating(true);
    setErrorMsg(null);
    try {
      let payload: { period?: 'this_month' | 'last_month'; period_start?: string; period_end?: string } = {};

      if (periodType === 'this_month') {
        payload = { period: 'this_month' };
      } else if (periodType === 'custom' && customRange.start && customRange.end) {
        payload = { period_start: customRange.start, period_end: customRange.end };
      }

      const r = await api.post<{ success: boolean; data: RevenueReport }>('/reports/generate', payload);
      // Prepend new report to top of list
      setReports((prev) => [r.data, ...prev]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo báo cáo');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(report: RevenueReport) {
    try {
      await downloadReport(report);
    } catch {
      setErrorMsg('Không thể tải xuống báo cáo. Vui lòng thử lại.');
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg pb-24">
        <PageHeader
          title="Báo cáo doanh thu"
          onBack={() => router.push('/settings')}
          right={
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-[#0B0B0B] rounded-xl text-sm font-medium disabled:bg-surface disabled:text-text-muted disabled:cursor-not-allowed"
              aria-label="Tạo báo cáo"
            >
              {generating ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : null}
              <span>Tạo báo cáo</span>
            </button>
          }
        />

        {/* Period Selector */}
        <div className="px-4 pt-4">
          <div className="bg-surface rounded-2xl border border-border-subtle p-4">
            <p className="text-sm font-medium text-text-base mb-3">Kỳ báo cáo</p>

            {/* Period Type Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setPeriodType('this_month'); setShowCustomRange(false); }}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  periodType === 'this_month' && !showCustomRange
                    ? 'bg-accent text-[#0B0B0B]'
                    : 'bg-surface-alt text-text-muted border border-border-subtle'
                }`}
              >
                Tháng Này
              </button>
              <button
                onClick={() => { setPeriodType('custom'); setShowCustomRange(true); }}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  periodType === 'custom' || showCustomRange
                    ? 'bg-accent text-[#0B0B0B]'
                    : 'bg-surface-alt text-text-muted border border-border-subtle'
                }`}
              >
                Chọn ngày
              </button>
            </div>

            {/* Custom Date Range Picker */}
            {(periodType === 'custom' || showCustomRange) && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Từ ngày</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={customRange.start}
                        onChange={(e) => setCustomRange((prev) => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 bg-surface-alt border border-border-subtle rounded-xl text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1.5">Đến ngày</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={customRange.end}
                        onChange={(e) => setCustomRange((prev) => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 bg-surface-alt border border-border-subtle rounded-xl text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pt-3 space-y-3">
          {errorMsg && (
            <div
              role="alert"
              className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3"
            >
              {errorMsg}
            </div>
          )}

          {loading && <Spinner />}

          {!loading && reports.length === 0 && (
            <p className="text-center text-text-muted text-sm py-12">
              Chưa có báo cáo nào
            </p>
          )}

          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-surface rounded-2xl border border-border-subtle px-4 py-3.5 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-base">
                  {formatDate(report.period_start)} – {formatDate(report.period_end)}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {relativeTime(report.generated_at)}
                </p>
                <div className="mt-1.5">
                  <StatusBadge status={report.status} />
                </div>
              </div>

              {report.status === 'done' && (
                <button
                  onClick={() => handleDownload(report)}
                  aria-label="Tải xuống"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border-subtle text-text-muted text-xs font-medium active:bg-surface-alt"
                >
                  <Download size={13} />
                  <span>Tải xuống</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
