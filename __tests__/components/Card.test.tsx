import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from '@/components/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello Card</Card>);
    expect(screen.getByText('Hello Card')).toBeInTheDocument();
  });

  it('applies default base classes', () => {
    const { container } = render(<Card>content</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('bg-white');
    expect(div.className).toContain('rounded-xl');
    expect(div.className).toContain('shadow-sm');
    expect(div.className).toContain('p-4');
  });

  it('applies additional className prop', () => {
    const { container } = render(<Card className="extra-class">content</Card>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('extra-class');
  });

  it('passes through additional HTML attributes', () => {
    render(<Card data-testid="my-card">content</Card>);
    expect(screen.getByTestId('my-card')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <Card>
        <span>Child 1</span>
        <span>Child 2</span>
      </Card>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });
});
