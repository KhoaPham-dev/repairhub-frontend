import React from 'react';
import { render, screen } from '@testing-library/react';
import BottomNav from '@/components/BottomNav';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
    return <a href={href} className={className}>{children}</a>;
  };
});

// Mock usePathname
const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('BottomNav', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders all nav items', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    expect(screen.getByText('Tổng quan')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Khách hàng')).toBeInTheDocument();
    expect(screen.getByText('Bảo hành')).toBeInTheDocument();
    expect(screen.getByText('Cài đặt')).toBeInTheDocument();
  });

  it('returns null on /login route', () => {
    mockUsePathname.mockReturnValue('/login');
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it('highlights the active root route', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    // The "/" link should have the active color class
    const homeLink = screen.getByText('Tổng quan').closest('a');
    expect(homeLink?.className).toContain('text-[#1565C0]');
  });

  it('highlights orders tab when on /orders', () => {
    mockUsePathname.mockReturnValue('/orders');
    render(<BottomNav />);
    const ordersLink = screen.getByText('Đơn hàng').closest('a');
    expect(ordersLink?.className).toContain('text-[#1565C0]');
  });

  it('highlights orders tab when on a sub-route of /orders', () => {
    mockUsePathname.mockReturnValue('/orders/123');
    render(<BottomNav />);
    const ordersLink = screen.getByText('Đơn hàng').closest('a');
    expect(ordersLink?.className).toContain('text-[#1565C0]');
  });

  it('marks non-active tabs as gray', () => {
    mockUsePathname.mockReturnValue('/orders');
    render(<BottomNav />);
    const customersLink = screen.getByText('Khách hàng').closest('a');
    expect(customersLink?.className).toContain('text-gray-500');
  });

  it('renders nav links with correct hrefs', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    expect(screen.getByText('Tổng quan').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Đơn hàng').closest('a')).toHaveAttribute('href', '/orders');
    expect(screen.getByText('Khách hàng').closest('a')).toHaveAttribute('href', '/customers');
    expect(screen.getByText('Bảo hành').closest('a')).toHaveAttribute('href', '/warranty');
    expect(screen.getByText('Cài đặt').closest('a')).toHaveAttribute('href', '/settings');
  });
});
