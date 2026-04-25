import React from 'react';
import { render, screen } from '@testing-library/react';
import BottomNav from '@/components/BottomNav';

// Mock next/link — must handle nested children (NavItem renders Link wrapping a div+span)
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

  it('renders the four nav tab labels', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    expect(screen.getByText('Tổng quan')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Khách hàng')).toBeInTheDocument();
    expect(screen.getByText('Nhân viên')).toBeInTheDocument();
  });

  it('renders center FAB link to /orders/new', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    const fabLink = screen.getByRole('link', { name: '' });
    // FAB is an <a href="/orders/new"> with no visible text, only an icon
    const newOrderLinks = screen.getAllByRole('link').filter((l) => l.getAttribute('href') === '/orders/new');
    expect(newOrderLinks.length).toBeGreaterThan(0);
  });

  it('returns null on /login route', () => {
    mockUsePathname.mockReturnValue('/login');
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on /orders/new route', () => {
    mockUsePathname.mockReturnValue('/orders/new');
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null on /orders/123 (sub-route)', () => {
    mockUsePathname.mockReturnValue('/orders/123');
    const { container } = render(<BottomNav />);
    expect(container.firstChild).toBeNull();
  });

  it('renders on /orders (exact list page)', () => {
    mockUsePathname.mockReturnValue('/orders');
    const { container } = render(<BottomNav />);
    expect(container.firstChild).not.toBeNull();
  });

  it('applies active purple color to home tab on /', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    const span = screen.getByText('Tổng quan');
    expect(span.className).toContain('text-[#715DF2]');
  });

  it('applies active purple color to orders tab on /orders', () => {
    mockUsePathname.mockReturnValue('/orders');
    render(<BottomNav />);
    const span = screen.getByText('Đơn hàng');
    expect(span.className).toContain('text-[#715DF2]');
  });

  it('applies inactive slate color to non-active tab', () => {
    mockUsePathname.mockReturnValue('/orders');
    render(<BottomNav />);
    const span = screen.getByText('Tổng quan');
    expect(span.className).toContain('text-slate-400');
  });

  it('renders nav links with correct hrefs', () => {
    mockUsePathname.mockReturnValue('/');
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/');
    expect(hrefs).toContain('/orders');
    expect(hrefs).toContain('/customers');
    expect(hrefs).toContain('/staff');
  });
});
