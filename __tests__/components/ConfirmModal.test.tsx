import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '@/components/ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    open: true,
    title: 'Test title',
    message: 'Test message',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(<ConfirmModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title and message when open is true', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Test title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Xác nhận'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Huỷ'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel when backdrop is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    // The backdrop is the absolute positioned div (first child of the fixed container)
    const backdrop = document.querySelector('.absolute.inset-0');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });
});
