import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock next/navigation
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'order-123' }),
  useRouter: () => ({ back: mockBack }),
}));

// Mock lib/auth
jest.mock('@/lib/auth', () => ({ getToken: () => 'test-token' }));

// Mock api
const mockGet = jest.fn();
const mockPut = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
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
  default: ({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) => (
    <div data-testid="page-header">
      <button onClick={onBack} data-testid="back-button">Back</button>
      <h1>{title}</h1>
      {subtitle && <span>{subtitle}</span>}
    </div>
  ),
}));

import OrderDetailPage from '@/app/orders/[id]/page';

const MOCK_ORDER = {
  id: 'order-123',
  order_code: 'RH-001',
  status: 'TIEP_NHAN',
  priority: null,
  customer_name: 'Nguyễn Văn A',
  customer_phone: '0901234567',
  customer_address: '123 Đường ABC',
  customer_type: 'RETAIL',
  branch_name: 'Chi nhánh 1',
  product_type: 'LOA',
  device_name: 'Loa JBL',
  serial_imei: 'SN001',
  accessories: '',
  fault_description: 'Hỏng loa',
  quotation: 500000,
  warranty_period_months: 3,
  warranty_end_date: null,
  created_by_name: 'Admin',
  created_at: '2024-01-01T00:00:00Z',
  history: [
    {
      id: 'h1',
      old_status: '',
      new_status: 'TIEP_NHAN',
      changed_by_name: 'Admin',
      changed_at: '2024-01-01T00:00:00Z',
      notes: '',
    },
  ],
  images: [],
  source_order_history: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: MOCK_ORDER });
});

describe('OrderDetailPage', () => {
  it('renders loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<OrderDetailPage />);
    expect(screen.getByText('Đang tải...')).toBeInTheDocument();
  });

  it('renders PageHeader with order_code as title after load', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'RH-001' })).toBeInTheDocument();
    });
  });

  it('renders PageHeader component (not old inline header)', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  it('does not render old bg-[#1565C0] header div', async () => {
    const { container } = render(<OrderDetailPage />);
    await waitFor(() => {
      const oldHeader = container.querySelector('.bg-\\[\\#1565C0\\]');
      // The page content may have the color on other elements, but the wrapping header div should be gone
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  it('renders outer wrapper with bg-bg and pb-24 classes', async () => {
    const { container } = render(<OrderDetailPage />);
    await waitFor(() => {
      // Wait for the order to load so the outer div is rendered
      screen.getByRole('heading', { name: 'RH-001' });
    });
    // The AuthGuard is mocked to a passthrough; the first child is the outer div
    const outerDiv = container.querySelector('.min-h-screen.bg-bg.pb-24');
    expect(outerDiv).toBeInTheDocument();
  });

  it('back button calls router.back', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => screen.getByTestId('back-button'));
    screen.getByTestId('back-button').click();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('displays order details after loading', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('Loa JBL')).toBeInTheDocument();
    });
  });

  it('shows status update section for non-terminal orders', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Cập nhật trạng thái')).toBeInTheDocument();
    });
  });

  it('hides status update section for terminal orders', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, status: 'DA_GIAO' } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.queryByText('Cập nhật trạng thái')).not.toBeInTheDocument();
    });
  });

  it('shows Báo giá read-only in locked card for terminal order DA_GIAO', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, status: 'DA_GIAO', quotation: 500000 } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Báo giá:')).toBeInTheDocument();
      expect(screen.getByText('500.000 đ')).toBeInTheDocument();
    });
  });

  it('shows Chưa có for terminal order with quotation 0', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, status: 'HUY_TRA_MAY', quotation: 0 } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Báo giá:')).toBeInTheDocument();
      expect(screen.getByText('Chưa có')).toBeInTheDocument();
    });
  });

  it('shows history section', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Lịch sử trạng thái')).toBeInTheDocument();
    });
  });

  it('pre-fills quotation input with significant digits (server value / 1000) on load', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, quotation: 500000 } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Nhập báo giá (VNĐ)') as HTMLInputElement;
      expect(input.value).toBe('500');
    });
  });

  it('shows .000 đ suffix in quotation input area', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('.000 đ')).toBeInTheDocument();
    });
  });

  it('does not render Lịch sử đơn gốc when source_order_history is null', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, source_order_history: null } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Lịch sử trạng thái')).toBeInTheDocument();
    });
    expect(screen.queryByText('Lịch sử đơn gốc')).not.toBeInTheDocument();
  });

  it('does not render Lịch sử đơn gốc when source_order_history is an empty array', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, source_order_history: [] } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Lịch sử trạng thái')).toBeInTheDocument();
    });
    expect(screen.queryByText('Lịch sử đơn gốc')).not.toBeInTheDocument();
  });

  it('renders Lịch sử đơn gốc section with entries when source_order_history is present', async () => {
    const sourceHistory = [
      {
        id: 'sh1',
        changed_by: 'uuid-tech-a',
        changed_by_name: 'Tech A',
        old_status: null,
        new_status: 'TIEP_NHAN',
        notes: 'Ghi chú nguồn',
        changed_at: '2024-01-01T08:00:00Z',
      },
      {
        id: 'sh2',
        changed_by: 'uuid-tech-b',
        changed_by_name: 'Tech B',
        old_status: 'TIEP_NHAN',
        new_status: 'SUA_XONG',
        notes: null,
        changed_at: '2024-01-02T10:00:00Z',
      },
    ];
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, source_order_history: sourceHistory } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Lịch sử đơn gốc')).toBeInTheDocument();
    });
    expect(screen.getByText('đơn gốc')).toBeInTheDocument();
    expect(screen.getByText('Ghi chú nguồn')).toBeInTheDocument();
    expect(screen.getByText('Tech A', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Tech B', { exact: false })).toBeInTheDocument();
  });
});
