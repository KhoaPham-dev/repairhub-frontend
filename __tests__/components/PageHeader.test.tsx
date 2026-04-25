import React from 'react';
import { render, screen } from '@testing-library/react';
import PageHeader from '@/components/PageHeader';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders title in an h1 element', () => {
    render(<PageHeader title="My Page" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('My Page');
  });

  it('applies sticky header styling', () => {
    const { container } = render(<PageHeader title="Settings" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('sticky');
    expect(wrapper.className).toContain('top-0');
  });

  it('renders different titles correctly', () => {
    const { rerender } = render(<PageHeader title="Orders" />);
    expect(screen.getByText('Orders')).toBeInTheDocument();

    rerender(<PageHeader title="Customers" />);
    expect(screen.getByText('Customers')).toBeInTheDocument();
  });
});
