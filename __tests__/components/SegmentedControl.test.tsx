import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SegmentedControl from '@/components/SegmentedControl';

const TABS = [
  { label: 'Hôm nay', value: 'today' },
  { label: 'Tuần này', value: 'week' },
  { label: 'Tháng này', value: 'month' },
];

describe('SegmentedControl', () => {
  it('renders all tab labels', () => {
    render(<SegmentedControl tabs={TABS} active="today" onChange={() => {}} />);
    expect(screen.getByText('Hôm nay')).toBeInTheDocument();
    expect(screen.getByText('Tuần này')).toBeInTheDocument();
    expect(screen.getByText('Tháng này')).toBeInTheDocument();
  });

  it('applies active styles to the active tab', () => {
    render(<SegmentedControl tabs={TABS} active="week" onChange={() => {}} />);
    const weekBtn = screen.getByText('Tuần này');
    expect(weekBtn.className).toContain('bg-[#004EAB]');
    expect(weekBtn.className).toContain('text-white');
  });

  it('applies inactive styles to non-active tabs', () => {
    render(<SegmentedControl tabs={TABS} active="today" onChange={() => {}} />);
    const weekBtn = screen.getByText('Tuần này');
    expect(weekBtn.className).toContain('text-slate-600');
    expect(weekBtn.className).not.toContain('bg-[#004EAB]');
  });

  it('calls onChange with the correct value when a tab is clicked', () => {
    const onChange = jest.fn();
    render(<SegmentedControl tabs={TABS} active="today" onChange={onChange} />);
    fireEvent.click(screen.getByText('Tháng này'));
    expect(onChange).toHaveBeenCalledWith('month');
  });

  it('calls onChange with the active tab value when clicking active tab', () => {
    const onChange = jest.fn();
    render(<SegmentedControl tabs={TABS} active="today" onChange={onChange} />);
    fireEvent.click(screen.getByText('Hôm nay'));
    expect(onChange).toHaveBeenCalledWith('today');
  });

  it('applies extra className when provided', () => {
    const { container } = render(
      <SegmentedControl tabs={TABS} active="today" onChange={() => {}} className="my-custom-class" />
    );
    expect(container.firstChild).toHaveClass('my-custom-class');
  });

  it('renders with empty tabs array without crashing', () => {
    const { container } = render(<SegmentedControl tabs={[]} active="" onChange={() => {}} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
