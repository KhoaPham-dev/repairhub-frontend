import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DuplicatePhoneModal from '@/components/DuplicatePhoneModal';

describe('DuplicatePhoneModal', () => {
  const defaultProps = {
    open: true,
    phone: '0909123456',
    onUpdate: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<DuplicatePhoneModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the title when open is true', () => {
    render(<DuplicatePhoneModal {...defaultProps} />);
    expect(screen.getByText('Số điện thoại đã tồn tại')).toBeInTheDocument();
  });

  it('shows phone number in the message when phone prop is provided', () => {
    render(<DuplicatePhoneModal {...defaultProps} />);
    expect(screen.getByText(/0909123456/)).toBeInTheDocument();
  });

  it('shows generic message when phone prop is not provided', () => {
    render(<DuplicatePhoneModal open={true} onUpdate={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByText(/Khách hàng với số điện thoại này đã tồn tại/)).toBeInTheDocument();
  });

  it('renders primary "Cập nhật thông tin" button', () => {
    render(<DuplicatePhoneModal {...defaultProps} />);
    expect(screen.getByText('Cập nhật thông tin')).toBeInTheDocument();
  });

  it('renders secondary "Đóng" button', () => {
    render(<DuplicatePhoneModal {...defaultProps} />);
    expect(screen.getByText('Đóng')).toBeInTheDocument();
  });

  it('calls onUpdate when "Cập nhật thông tin" is clicked', () => {
    render(<DuplicatePhoneModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cập nhật thông tin'));
    expect(defaultProps.onUpdate).toHaveBeenCalledTimes(1);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when "Đóng" is clicked', () => {
    render(<DuplicatePhoneModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Đóng'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onUpdate).not.toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<DuplicatePhoneModal {...defaultProps} />);
    const backdrop = document.querySelector('.absolute.inset-0');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    expect(defaultProps.onUpdate).not.toHaveBeenCalled();
  });
});
