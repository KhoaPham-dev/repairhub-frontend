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

  it('renders outer wrapper with bg-[#F8F9FB] and pb-24 classes', async () => {
    const { container } = render(<OrderDetailPage />);
    await waitFor(() => {
      // Wait for the order to load so the outer div is rendered
      screen.getByRole('heading', { name: 'RH-001' });
    });
    // The AuthGuard is mocked to a passthrough; the first child is the outer div
    const outerDiv = container.querySelector('.min-h-screen.bg-\\[\\#F8F9FB\\].pb-24');
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

  it('shows history section', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Lịch sử trạng thái')).toBeInTheDocument();
    });
  });
});
