import React from 'react';
import { render, screen } from '@testing-library/react';
import BottomNav from '@/components/BottomNav';

jest.mock('next/link', () => {
  return function MockLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
    return <a href={href} className={className}>{children}</a>;
  };
});

jest.mock('lucide-react', () => ({
  Home: () => <svg data-testid="icon-home" />,
  ClipboardList: () => <svg data-testid="icon-orders" />,
  Users: () => <svg data-testid="icon-customers" />,
  User: () => <svg data-testid="icon-staff" />,
  Plus: () => <svg data-testid="icon-plus" />,
}));

const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('BottomNav', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders 4 nav items and the FAB', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    expect(screen.getByText('Tổng quan')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Khách hàng')).toBeInTheDocument();
    expect(screen.getByText('Nhân viên')).toBeInTheDocument();
    expect(screen.getByTestId('icon-plus')).toBeInTheDocument();
  });

  it('returns null on /login route', () => {
    mockUsePathname.mockReturnValue('/login');
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on /orders/new', () => {
    mockUsePathname.mockReturnValue('/orders/new');
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on detail routes', () => {
    mockUsePathname.mockReturnValue('/orders/abc-123');
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it('highlights active item with accent color', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    const homeLabel = screen.getByText('Tổng quan');
    expect(homeLabel.className).toContain('text-[#715DF2]');
  });

  it('marks inactive items as slate-400', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    const ordersLabel = screen.getByText('Đơn hàng');
    expect(ordersLabel.className).toContain('text-slate-400');
  });

  it('FAB links to /orders/new', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    const fab = screen.getByTestId('icon-plus').closest('a');
    expect(fab).toHaveAttribute('href', '/orders/new');
  });
});
