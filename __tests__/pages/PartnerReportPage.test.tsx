import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
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
jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

// Mock AuthGuard
jest.mock('@/components/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock PageHeader
jest.mock('@/components/PageHeader', () => ({
  __esModule: true,
  default: ({
    title,
    onBack,
  }: {
    title: string;
    onBack?: () => void;
  }) => (
    <div data-testid="page-header">
      <button onClick={onBack} data-testid="back-button">
        Back
      </button>
      <h1>{title}</h1>
    </div>
  ),
}));

// Mock global fetch for download tests
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock URL helpers
const mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

import PartnerReportPage from '@/app/settings/reports/partner/page';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PARTNERS = [
  { id: 'p1', name: 'Công ty ABC', phone: '0901234567' },
  { id: 'p2', name: 'Đối tác XYZ', phone: '0912345678' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setupAdmin(partners = PARTNERS) {
  mockIsAdmin.mockReturnValue(true);
  mockGetToken.mockReturnValue('test-token');
  mockGet.mockResolvedValue({ success: true, data: partners });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PartnerReportPage — admin guard', () => {
  it('redirects to /settings when user is not admin', async () => {
    mockIsAdmin.mockReturnValue(false);
    mockGet.mockResolvedValue({ success: true, data: [] });
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/settings'));
  });

  it('does not fetch partners for non-admin users', async () => {
    mockIsAdmin.mockReturnValue(false);
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).not.toHaveBeenCalled());
  });
});

describe('PartnerReportPage — page structure', () => {
  it('renders page title "Báo cáo đối tác"', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: 'Báo cáo đối tác' })).toBeInTheDocument();
  });

  it('navigates back to /settings when back button is clicked', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('back-button'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});

describe('PartnerReportPage — partner dropdown', () => {
  it('fetches partners from GET /customers?type=PARTNER on mount', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith('/customers?type=PARTNER')
    );
  });

  it('renders fetched partners as dropdown options', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByText(/Công ty ABC/)).toBeInTheDocument();
    expect(screen.getByText(/Đối tác XYZ/)).toBeInTheDocument();
  });

  it('renders placeholder option "Chọn đối tác"', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByText('Chọn đối tác')).toBeInTheDocument();
  });
});

describe('PartnerReportPage — date preset buttons', () => {
  it('renders all three preset buttons', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Tuần này' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tháng này' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tuỳ chọn' })).toBeInTheDocument();
  });

  it('defaults to "Tháng này" preset (active)', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    const monthBtn = screen.getByRole('button', { name: 'Tháng này' });
    expect(monthBtn.className).toContain('bg-accent');
  });

  it('switches to "Tuần này" when clicked', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Tuần này' }));
    expect(screen.getByRole('button', { name: 'Tuần này' }).className).toContain('bg-accent');
    expect(screen.getByRole('button', { name: 'Tháng này' }).className).not.toContain('bg-accent');
  });

  it('switches to "Tuỳ chọn" when clicked', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
    expect(screen.getByRole('button', { name: 'Tuỳ chọn' }).className).toContain('bg-accent');
  });
});

describe('PartnerReportPage — custom date inputs', () => {
  it('does NOT show custom date inputs when preset is "Tháng này"', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.queryByLabelText('Từ ngày')).toBeNull();
    expect(screen.queryByLabelText('Đến ngày')).toBeNull();
  });

  it('does NOT show custom date inputs when preset is "Tuần này"', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Tuần này' }));
    expect(screen.queryByLabelText('Từ ngày')).toBeNull();
    expect(screen.queryByLabelText('Đến ngày')).toBeNull();
  });

  it('shows custom date inputs when "Tuỳ chọn" is selected', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
    expect(screen.getByLabelText('Từ ngày')).toBeInTheDocument();
    expect(screen.getByLabelText('Đến ngày')).toBeInTheDocument();
  });

  it('hides custom date inputs when switching back from "Tuỳ chọn"', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tháng này' }));
    expect(screen.queryByLabelText('Từ ngày')).toBeNull();
    expect(screen.queryByLabelText('Đến ngày')).toBeNull();
  });
});

describe('PartnerReportPage — download button disabled state', () => {
  it('is disabled when no partner is selected', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    const btn = screen.getByRole('button', { name: 'Tải xuống báo cáo' });
    expect(btn).toBeDisabled();
  });

  it('is enabled when a partner is selected and preset is "Tháng này"', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });
    const btn = screen.getByRole('button', { name: 'Tải xuống báo cáo' });
    expect(btn).not.toBeDisabled();
  });

  it('is disabled in custom mode when dates are empty', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
    const btn = screen.getByRole('button', { name: 'Tải xuống báo cáo' });
    expect(btn).toBeDisabled();
  });

  it('is enabled in custom mode when both dates are filled and start <= end', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-05-31' } });
    const btn = screen.getByRole('button', { name: 'Tải xuống báo cáo' });
    expect(btn).not.toBeDisabled();
  });

  it('is disabled in custom mode when start > end', async () => {
    setupAdmin();
    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-05-01' } });
    const btn = screen.getByRole('button', { name: 'Tải xuống báo cáo' });
    expect(btn).toBeDisabled();
  });
});

describe('PartnerReportPage — download', () => {
  it('calls fetch with correct params and Authorization header', async () => {
    setupAdmin();
    const mockBlob = new Blob(['data'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    // Select partner and use "Tháng này" (default)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tải xuống báo cáo' }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/reports/partner');
    expect(url).toContain('partner_id=p1');
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer test-token');

    clickSpy.mockRestore();
  });

  it('calls fetch with correct custom date params', async () => {
    setupAdmin();
    const mockBlob = new Blob(['data']);
    mockFetch.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(mockBlob),
    });
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tuỳ chọn' }));
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-04-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tải xuống báo cáo' }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('start=2026-04-01');
    expect(url).toContain('end=2026-04-30');
    expect(url).toContain('partner_id=p2');

    clickSpy.mockRestore();
  });

  it('shows error alert when API returns non-ok response', async () => {
    setupAdmin();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tải xuống báo cáo' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Server error')
    );
  });

  it('shows loading state while downloading', async () => {
    setupAdmin();
    // Never resolves
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<PartnerReportPage />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tải xuống báo cáo' }));

    await waitFor(() => expect(screen.getByText('Đang tạo...')).toBeInTheDocument());
  });
});
