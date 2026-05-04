import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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
  default: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {subtitle && <p data-testid="page-header-subtitle">{subtitle}</p>}
    </div>
  ),
}));

import OrdersPage from '@/app/orders/page';

const MOCK_ORDERS = [
  {
    id: 'order-1',
    order_code: 'RH-001',
    customer_name: 'Nguyễn Văn A',
    customer_phone: '0901234567',
    device_name: 'Loa JBL',
    status: 'TIEP_NHAN',
    priority: null,
    created_at: '2024-01-01T00:00:00Z',
    branch_name: 'Chi nhánh 1',
  },
  {
    id: 'order-2',
    order_code: 'RH-002',
    customer_name: 'Trần Thị B',
    customer_phone: '0912345678',
    device_name: 'Ampli Sony',
    status: 'DA_GIAO',
    priority: 'HIGH',
    created_at: '2024-01-02T00:00:00Z',
    branch_name: 'Chi nhánh 2',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: MOCK_ORDERS });
});

describe('OrdersPage', () => {
  it('renders PageHeader with title Đơn hàng', () => {
    render(<OrdersPage />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Đơn hàng' })).toBeInTheDocument();
  });

  it('renders PageHeader subtitle showing order count', async () => {
    render(<OrdersPage />);
    await waitFor(() => {
      const subtitle = screen.getByTestId('page-header-subtitle');
      expect(subtitle).toHaveTextContent('đơn');
    });
  });

  it('sticky wrapper has correct classes', () => {
    const { container } = render(<OrdersPage />);
    const stickyDiv = container.querySelector('.sticky.top-0.z-10');
    expect(stickyDiv).toBeInTheDocument();
    expect(stickyDiv).toHaveClass('bg-[#F8F9FB]');
  });

  it('renders search input inside sticky header', () => {
    render(<OrdersPage />);
    const input = screen.getByPlaceholderText('Tìm theo tên thiết bị, SĐT, serial...');
    expect(input).toBeInTheDocument();
  });

  it('renders status filter tabs inside sticky header', () => {
    render(<OrdersPage />);
    expect(screen.getByText('Tất cả')).toBeInTheDocument();
    expect(screen.getByText('Tiếp nhận')).toBeInTheDocument();
  });

  it('renders orders after API response', async () => {
    render(<OrdersPage />);
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A · 0901234567')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B · 0912345678')).toBeInTheDocument();
    });
  });

  it('shows empty state when no orders', async () => {
    mockGet.mockResolvedValue({ data: [] });
    render(<OrdersPage />);
    await waitFor(() => {
      expect(screen.getByText('Chưa có đơn hàng nào')).toBeInTheDocument();
    });
  });

  it('navigates to order detail on click', async () => {
    render(<OrdersPage />);
    await waitFor(() => screen.getByText('Nguyễn Văn A · 0901234567'));
    const orderCard = screen.getByText('RH-001').closest('[class*="rounded-2xl"]');
    if (orderCard) fireEvent.click(orderCard);
    expect(mockPush).toHaveBeenCalledWith('/orders/order-1');
  });

  it('does not render old inline h1 outside PageHeader', () => {
    render(<OrdersPage />);
    const headings = screen.getAllByRole('heading', { name: 'Đơn hàng' });
    expect(headings).toHaveLength(1);
  });

  it('search input and status tabs are inside sticky wrapper', () => {
    const { container } = render(<OrdersPage />);
    const stickyDiv = container.querySelector('.sticky.top-0.z-10');
    expect(stickyDiv).not.toBeNull();
    const input = stickyDiv!.querySelector('input[type="text"]');
    expect(input).toBeInTheDocument();
    const statusLabel = stickyDiv!.querySelector('span.text-slate-400');
    expect(statusLabel).toBeInTheDocument();
  });
});
