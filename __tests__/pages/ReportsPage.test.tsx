import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

// Mock lib/auth
const mockIsAdmin = jest.fn();
const mockGetToken = jest.fn();
jest.mock('@/lib/auth', () => ({
  isAdmin: () => mockIsAdmin(),
  getToken: () => mockGetToken(),
}));

// Mock lib/api
const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

// Mock AuthGuard
jest.mock('@/components/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock PageHeader — expose title and right slot
jest.mock('@/components/PageHeader', () => ({
  __esModule: true,
  default: ({
    title,
    onBack,
    right,
  }: {
    title: string;
    onBack?: () => void;
    right?: React.ReactNode;
  }) => (
    <div data-testid="page-header">
      <button onClick={onBack} data-testid="back-button">
        Back
      </button>
      <h1>{title}</h1>
      {right && <div data-testid="header-right">{right}</div>}
    </div>
  ),
}));

// Mock Spinner
jest.mock('@/components/Spinner', () => ({
  __esModule: true,
  default: () => <div data-testid="spinner">Loading…</div>,
}));

// Mock global fetch for download tests
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock URL helpers used by the download handler
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

import ReportsPage from '@/app/settings/reports/page';
import type { RevenueReport } from '@/app/settings/reports/page';

// Duplicate of the module-internal relativeTime for unit testing.
function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return 'Vừa xong';
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 24) return `${Math.max(1, hours)} giờ trước`;
  return `${Math.floor(diffMs / 86_400_000)} ngày trước`;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const DONE_REPORT: RevenueReport = {
  id: 'r1',
  period_start: '2026-05-01T00:00:00.000Z',
  period_end: '2026-05-15T00:00:00.000Z',
  generated_at: new Date(Date.now() - 2 * 3_600_000).toISOString(), // 2 hours ago
  status: 'done',
};

const PENDING_REPORT: RevenueReport = {
  id: 'r2',
  period_start: '2026-04-01T00:00:00.000Z',
  period_end: '2026-04-30T00:00:00.000Z',
  generated_at: new Date(Date.now() - 30_000).toISOString(), // 30 seconds ago
  status: 'pending',
};

const FAILED_REPORT: RevenueReport = {
  id: 'r3',
  period_start: '2026-03-01T00:00:00.000Z',
  period_end: '2026-03-31T00:00:00.000Z',
  generated_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), // 3 days ago
  status: 'failed',
  error: 'Something went wrong',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupAdmin(reports: RevenueReport[] = []) {
  mockIsAdmin.mockReturnValue(true);
  mockGet.mockResolvedValue({ success: true, data: reports });
}

// ─── relativeTime unit tests ──────────────────────────────────────────────────

describe('relativeTime', () => {
  it('returns "Vừa xong" for timestamps under 60 seconds ago', () => {
    const iso = new Date(Date.now() - 30_000).toISOString();
    expect(relativeTime(iso)).toBe('Vừa xong');
  });

  it('returns "X giờ trước" for timestamps between 1 hour and 24 hours ago', () => {
    const iso = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(relativeTime(iso)).toBe('3 giờ trước');
  });

  it('returns "X ngày trước" for timestamps over 24 hours ago', () => {
    const iso = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(relativeTime(iso)).toBe('3 ngày trước');
  });

  it('returns at least "1 giờ trước" for timestamps just over 60 seconds', () => {
    const iso = new Date(Date.now() - 61_000).toISOString();
    expect(relativeTime(iso)).toBe('1 giờ trước');
  });
});

// ─── ReportsPage tests ────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockReturnValue('test-token');
});

describe('ReportsPage — admin guard', () => {
  it('redirects to /settings when user is not admin', async () => {
    mockIsAdmin.mockReturnValue(false);
    render(<ReportsPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/settings'));
  });

  it('does not fetch reports for non-admin users', async () => {
    mockIsAdmin.mockReturnValue(false);
    render(<ReportsPage />);
    await waitFor(() => expect(mockGet).not.toHaveBeenCalled());
  });
});

describe('ReportsPage — page structure', () => {
  it('renders page title "Báo cáo doanh thu"', async () => {
    setupAdmin();
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    expect(screen.getByRole('heading', { name: 'Báo cáo doanh thu' })).toBeInTheDocument();
  });

  it('navigates back to /settings when back button is clicked', async () => {
    setupAdmin();
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    fireEvent.click(screen.getByTestId('back-button'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('renders "Tạo báo cáo" button in header', async () => {
    setupAdmin();
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    expect(screen.getByRole('button', { name: /tạo báo cáo/i })).toBeInTheDocument();
  });
});

describe('ReportsPage — loading state', () => {
  it('shows spinner while loading reports', () => {
    mockIsAdmin.mockReturnValue(true);
    // Never resolves during this test
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<ReportsPage />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });
});

describe('ReportsPage — empty state', () => {
  it('shows empty state message when list is empty', async () => {
    setupAdmin([]);
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    expect(screen.getByText('Chưa có báo cáo nào')).toBeInTheDocument();
  });
});

describe('ReportsPage — report list', () => {
  it('renders period label for done report', async () => {
    setupAdmin([DONE_REPORT]);
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    expect(screen.getByText('01/05/2026 – 15/05/2026')).toBeInTheDocument();
  });

  it('renders "Hoàn thành" badge for done report', async () => {
    setupAdmin([DONE_REPORT]);
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument();
  });

  it('renders "Đang tạo" badge for pending report', async () => {
    setupAdmin([PENDING_REPORT]);
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    expect(screen.getByText('Đang tạo')).toBeInTheDocument();
  });

  it('renders "Lỗi" badge for failed report', async () => {
    setupAdmin([FAILED_REPORT]);
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    expect(screen.getByText('Lỗi')).toBeInTheDocument();
  });

  it('shows download button only for done report', async () => {
    setupAdmin([DONE_REPORT, PENDING_REPORT, FAILED_REPORT]);
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    const downloadButtons = screen.getAllByRole('button', { name: /tải xuống/i });
    expect(downloadButtons).toHaveLength(1);
  });

  it('does not show download button for pending report', async () => {
    setupAdmin([PENDING_REPORT]);
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    expect(screen.queryByRole('button', { name: /tải xuống/i })).toBeNull();
  });

  it('does not show download button for failed report', async () => {
    setupAdmin([FAILED_REPORT]);
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    expect(screen.queryByRole('button', { name: /tải xuống/i })).toBeNull();
  });

  it('renders generated_at as relative time', async () => {
    setupAdmin([DONE_REPORT]);
    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());
    expect(screen.getByText('2 giờ trước')).toBeInTheDocument();
  });
});

describe('ReportsPage — generate report', () => {
  it('calls POST /reports/generate when "Tạo báo cáo" is clicked', async () => {
    setupAdmin([]);
    const newReport: RevenueReport = {
      id: 'new-1',
      period_start: '2026-05-01T00:00:00.000Z',
      period_end: '2026-05-10T00:00:00.000Z',
      generated_at: new Date().toISOString(),
      status: 'pending',
    };
    mockPost.mockResolvedValue({ success: true, data: newReport });

    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /tạo báo cáo/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/reports/generate'));
  });

  it('prepends the new report to the top of the list on success', async () => {
    setupAdmin([DONE_REPORT]);
    const newReport: RevenueReport = {
      id: 'new-2',
      period_start: '2026-05-16T00:00:00.000Z',
      period_end: '2026-05-31T00:00:00.000Z',
      generated_at: new Date().toISOString(),
      status: 'pending',
    };
    mockPost.mockResolvedValue({ success: true, data: newReport });

    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /tạo báo cáo/i }));

    await waitFor(() =>
      expect(screen.getByText('16/05/2026 – 31/05/2026')).toBeInTheDocument()
    );
    // Original report still present
    expect(screen.getByText('01/05/2026 – 15/05/2026')).toBeInTheDocument();
  });

  it('disables the generate button while generating', async () => {
    setupAdmin([]);
    // Never resolves
    mockPost.mockReturnValue(new Promise(() => {}));

    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());

    const btn = screen.getByRole('button', { name: /tạo báo cáo/i });
    fireEvent.click(btn);

    await waitFor(() => expect(btn).toBeDisabled());
  });

  it('shows error alert when generate fails', async () => {
    setupAdmin([]);
    mockPost.mockRejectedValue(new Error('Server error'));

    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /tạo báo cáo/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Server error')
    );
  });

  it('re-enables the generate button after an error', async () => {
    setupAdmin([]);
    mockPost.mockRejectedValue(new Error('fail'));

    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());

    const btn = screen.getByRole('button', { name: /tạo báo cáo/i });
    fireEvent.click(btn);

    await waitFor(() => expect(btn).not.toBeDisabled());
  });
});

describe('ReportsPage — download', () => {
  it('calls fetch with correct URL and Authorization header on download', async () => {
    setupAdmin([DONE_REPORT]);
    mockGetToken.mockReturnValue('my-token');

    const mockBlob = new Blob(['data'], { type: 'application/octet-stream' });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    // Spy on DOM anchor click to prevent jsdom navigation errors
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /tải xuống/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain(`/api/reports/${DONE_REPORT.id}/download`);
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer my-token');

    clickSpy.mockRestore();
  });

  it('shows error alert when download fetch fails', async () => {
    setupAdmin([DONE_REPORT]);
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    render(<ReportsPage />);
    await waitFor(() => expect(screen.queryByTestId('spinner')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /tải xuống/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Không thể tải xuống')
    );
  });
});
