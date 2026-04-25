import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from '@/components/Input';

describe('Input', () => {
  it('renders the label', () => {
    render(<Input label="Tên khách hàng" />);
    expect(screen.getByText('Tên khách hàng')).toBeInTheDocument();
  });

  it('renders the input element', () => {
    render(<Input label="SĐT" placeholder="0901234567" />);
    expect(screen.getByPlaceholderText('0901234567')).toBeInTheDocument();
  });

  it('shows required asterisk when required', () => {
    render(<Input label="Tên" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('does not show asterisk when not required', () => {
    render(<Input label="Ghi chú" />);
    expect(screen.queryByText('*')).toBeNull();
  });

  it('calls onChange when user types', () => {
    const onChange = jest.fn();
    render(<Input label="SĐT" value="0901" onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '09012345' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders password type correctly', () => {
    render(<Input label="Mật khẩu" type="password" />);
    const input = document.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });
});
