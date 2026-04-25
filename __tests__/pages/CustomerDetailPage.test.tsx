import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Mock next/navigation
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'cust-123' }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

// Mock lib/auth
jest.mock('@/lib/auth', () => ({ getToken: () => 'test-token' }));

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
  default: ({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) => (
    <div data-testid="page-header">
      <button onClick={onBack} data-testid="back-button">Back</button>
      <h1>{title}</h1>
      {subtitle && <span>{subtitle}</span>}
    </div>
  ),
}));

import CustomerDetailPage from '@/app/customers/[id]/page';

const MOCK_CUSTOMER = {
  id: 'cust-123',
  phone: '0901234567',
  name: 'Nguyễn Thị B',
  address: '456 Đường XYZ',
  type: 'RETAIL',
  notes: 'Khách quen',
  orders: [
    {
      id: 'ord1',
      order_code: 'RH-001',
      status: 'TIEP_NHAN',
      device_name: 'Loa JBL',
      created_at: '2024-01-01T00:00:00Z',
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: MOCK_CUSTOMER });
});

describe('CustomerDetailPage', () => {
  it('renders loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<CustomerDetailPage />);
    expect(screen.getByText('Đang tải...')).toBeInTheDocument();
  });

  it('renders PageHeader with customer name as title after load', async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Nguyễn Thị B' })).toBeInTheDocument();
    });
  });

  it('renders PageHeader with subtitle "Khách hàng"', async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Khách hàng')).toBeInTheDocument();
    });
  });

  it('renders PageHeader component (not old inline header)', async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => {
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  it('renders outer wrapper with bg-[#F8F9FB] and pb-24 classes', async () => {
    const { container } = render(<CustomerDetailPage />);
    await waitFor(() => {
      screen.getByRole('heading', { name: 'Nguyễn Thị B' });
    });
    const outerDiv = container.querySelector('.min-h-screen.bg-\\[\\#F8F9FB\\].pb-24');
    expect(outerDiv).toBeInTheDocument();
  });

  it('back button calls router.back', async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => screen.getByTestId('back-button'));
    fireEvent.click(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('displays customer info after loading', async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('0901234567')).toBeInTheDocument();
      expect(screen.getByText('456 Đường XYZ')).toBeInTheDocument();
    });
  });

  it('shows customer type as Khách lẻ for RETAIL', async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Khách lẻ')).toBeInTheDocument();
    });
  });

  it('shows customer type as Đối tác for PARTNER', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_CUSTOMER, type: 'PARTNER' } });
    render(<CustomerDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Đối tác')).toBeInTheDocument();
    });
  });

  it('shows order history section', async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => {
      expect(screen.getByText(/Lịch sử đơn hàng/)).toBeInTheDocument();
    });
  });

  it('renders order rows in history', async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('RH-001')).toBeInTheDocument();
      expect(screen.getByText('Loa JBL')).toBeInTheDocument();
    });
  });

  it('navigates to order detail on order row click', async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => screen.getByText('RH-001'));
    fireEvent.click(screen.getByText('RH-001'));
    expect(mockPush).toHaveBeenCalledWith('/orders/ord1');
  });

  it('shows empty state when no orders', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_CUSTOMER, orders: [] } });
    render(<CustomerDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Chưa có đơn hàng')).toBeInTheDocument();
    });
  });

  it('shows notes when present', async () => {
    render(<CustomerDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Khách quen')).toBeInTheDocument();
    });
  });
});
