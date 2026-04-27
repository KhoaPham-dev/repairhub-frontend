import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/navigation (not used directly by dashboard but may be imported transitively)
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock lib/auth
const mockUser = { full_name: 'Khoa Pham' };
const mockGetUser = jest.fn(() => mockUser);
jest.mock('@/lib/auth', () => ({
  getToken: () => 'test-token',
  getUser: () => mockGetUser(),
}));

// Mock api
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
  default: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {subtitle && <p data-testid="page-header-subtitle">{subtitle}</p>}
    </div>
  ),
}));

// Mock SegmentedControl
jest.mock('@/components/SegmentedControl', () => ({
  __esModule: true,
  default: ({ tabs, active, onChange }: { tabs: { label: string; value: string }[]; active: string; onChange: (v: string) => void }) => (
    <div data-testid="segmented-control">
      {tabs.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)} data-testid={`tab-${t.value}`}>
          {t.label}
        </button>
      ))}
    </div>
  ),
}));

import DashboardPage from '@/app/page';

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: { TIEP_NHAN: 5, DA_GIAO: 3, HUY_TRA_MAY: 1 } });
});

describe('DashboardPage', () => {
  it('renders PageHeader with title Tổng quan', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument();
  });

  it('renders PageHeader subtitle with user full_name greeting', () => {
    render(<DashboardPage />);
    const subtitle = screen.getByTestId('page-header-subtitle');
    expect(subtitle).toHaveTextContent('Khoa Pham');
  });

  it('renders SegmentedControl inside sticky wrapper', () => {
    render(<DashboardPage />);
    expect(screen.getByTestId('segmented-control')).toBeInTheDocument();
  });

  it('sticky wrapper has correct classes', () => {
    const { container } = render(<DashboardPage />);
    const stickyDiv = container.querySelector('.sticky.top-0.z-10');
    expect(stickyDiv).toBeInTheDocument();
    expect(stickyDiv).toHaveClass('bg-[#F8F9FB]');
  });

  it('does not render old inline h1 header outside PageHeader', () => {
    render(<DashboardPage />);
    // PageHeader mock renders an h1 — that is the only h1 (no duplicate raw header)
    const headings = screen.getAllByRole('heading', { name: 'Tổng quan' });
    expect(headings).toHaveLength(1);
  });

  it('displays status counts after API call', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      // Đang xử lý count: activeTotal = TIEP_NHAN(5) = 5
      // The value "5" appears as the text content of the stat card
      const fives = screen.getAllByText('5');
      expect(fives.length).toBeGreaterThan(0);
    });
  });

  it('shows delivered count', async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      const threes = screen.getAllByText('3');
      expect(threes.length).toBeGreaterThan(0);
    });
  });

  it('handles missing user full_name gracefully', () => {
    mockGetUser.mockReturnValueOnce(null);
    // Re-render with null user — should not crash
    render(<DashboardPage />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });
});
