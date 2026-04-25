import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PageHeader from '@/components/PageHeader';

jest.mock('lucide-react', () => ({
  ChevronLeft: () => <svg data-testid="icon-back" />,
}));

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

  it('renders subtitle when provided', () => {
    render(<PageHeader title="Orders" subtitle="10 items" />);
    expect(screen.getByText('10 items')).toBeInTheDocument();
  });

  it('does not show back button when onBack not provided', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.queryByTestId('icon-back')).toBeNull();
  });

  it('shows back button when onBack is provided', () => {
    render(<PageHeader title="Detail" onBack={() => {}} />);
    expect(screen.getByTestId('icon-back')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = jest.fn();
    render(<PageHeader title="Detail" onBack={onBack} />);
    fireEvent.click(screen.getByTestId('icon-back').closest('button')!);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
