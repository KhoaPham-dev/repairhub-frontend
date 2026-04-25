import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SegmentedControl from '@/components/SegmentedControl';

const tabs = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Tuần này', value: 'week' },
  { label: 'Tháng này', value: 'month' },
];

describe('SegmentedControl', () => {
  it('renders all tabs', () => {
    render(<SegmentedControl tabs={tabs} active="today" onChange={() => {}} />);
    expect(screen.getByText('Hôm nay')).toBeInTheDocument();
    expect(screen.getByText('Tuần này')).toBeInTheDocument();
    expect(screen.getByText('Tháng này')).toBeInTheDocument();
  });

  it('applies active styling to the active tab', () => {
    render(<SegmentedControl tabs={tabs} active="week" onChange={() => {}} />);
    const activeBtn = screen.getByText('Tuần này');
    expect(activeBtn.className).toContain('bg-[#004EAB]');
    expect(activeBtn.className).toContain('text-white');
  });

  it('applies inactive styling to non-active tabs', () => {
    render(<SegmentedControl tabs={tabs} active="today" onChange={() => {}} />);
    const inactiveBtn = screen.getByText('Tuần này');
    expect(inactiveBtn.className).toContain('text-slate-600');
  });

  it('calls onChange with the correct value when a tab is clicked', () => {
    const onChange = jest.fn();
    render(<SegmentedControl tabs={tabs} active="today" onChange={onChange} />);
    fireEvent.click(screen.getByText('Tháng này'));
    expect(onChange).toHaveBeenCalledWith('month');
  });

  it('applies extra className to the container', () => {
    const { container } = render(<SegmentedControl tabs={tabs} active="today" onChange={() => {}} className="mt-4" />);
    expect((container.firstChild as HTMLElement).className).toContain('mt-4');
  });
});
