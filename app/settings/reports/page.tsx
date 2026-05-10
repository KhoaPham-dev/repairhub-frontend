'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Download, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import Spinner from '@/components/Spinner';
import { api } from '@/lib/api';
import { isAdmin, getToken } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
        Hoàn thành
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
        Đang tạo
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
      Lỗi
    </span>
  );
}

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
      const r = await api.post<{ success: boolean; data: RevenueReport }>('/reports/generate');
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
      <div className="min-h-screen bg-[#F8F9FB] pb-24">
        <PageHeader
          title="Báo cáo doanh thu"
          onBack={() => router.push('/settings')}
          right={
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#715DF2] text-white rounded-xl text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Tạo báo cáo"
            >
              {generating ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : null}
              <span>Tạo báo cáo</span>
            </button>
          }
        />

        <div className="px-4 pt-3 space-y-3">
          {errorMsg && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3"
            >
              {errorMsg}
            </div>
          )}

          {loading && <Spinner />}

          {!loading && reports.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-12">
              Chưa có báo cáo nào
            </p>
          )}

          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3.5 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {formatDate(report.period_start)} – {formatDate(report.period_end)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium active:bg-slate-50"
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
