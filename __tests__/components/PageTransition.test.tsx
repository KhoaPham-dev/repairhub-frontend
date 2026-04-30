import React from 'react';
import { render, screen } from '@testing-library/react';
import PageTransition from '@/components/PageTransition';

// Mock next/navigation
const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock motion/react — AnimatePresence and motion.div just render children
jest.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
}));

describe('PageTransition', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  it('renders children', () => {
    render(
      <PageTransition>
        <p>Hello World</p>
      </PageTransition>
    );
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('wraps content in a div that fills its parent', () => {
    const { container } = render(
      <PageTransition>
        <span>content</span>
      </PageTransition>
    );
    const wrapper = container.firstChild as HTMLElement;
    // Now h-full (parent layout owns the viewport sizing) — see RH-58.
    expect(wrapper.className).toContain('h-full');
  });

  it('renders on different pathnames without error', () => {
    mockUsePathname.mockReturnValue('/orders');
    render(
      <PageTransition>
        <span>orders page</span>
      </PageTransition>
    );
    expect(screen.getByText('orders page')).toBeInTheDocument();
  });
});
