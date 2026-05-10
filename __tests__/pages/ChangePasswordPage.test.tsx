import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => null }),
}));

// Mock lib/auth
const mockGetUser = jest.fn();
jest.mock('@/lib/auth', () => ({
  getUser: () => mockGetUser(),
}));

// Mock lib/api
const mockPatch = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { patch: (...args: unknown[]) => mockPatch(...args) },
}));

// Mock AuthGuard
jest.mock('@/components/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock PageHeader
jest.mock('@/components/PageHeader', () => ({
  __esModule: true,
  default: ({ title, onBack }: { title: string; onBack?: () => void }) => (
    <div>
      <h1>{title}</h1>
      {onBack && <button onClick={onBack}>Back</button>}
    </div>
  ),
}));

import ChangePasswordPage from '@/app/settings/change-password/page';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockReturnValue({ id: 'user-1', username: 'tech1', full_name: 'Tech One', role: 'TECHNICIAN', branch_id: null });
});

describe('ChangePasswordPage', () => {
  it('renders page title Đổi mật khẩu', () => {
    render(<ChangePasswordPage />);
    expect(screen.getByRole('heading', { name: 'Đổi mật khẩu' })).toBeInTheDocument();
  });

  it('renders password input', () => {
    render(<ChangePasswordPage />);
    expect(screen.getByPlaceholderText('Nhập mật khẩu mới')).toBeInTheDocument();
  });

  it('renders Lưu thay đổi submit button', () => {
    render(<ChangePasswordPage />);
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeInTheDocument();
  });

  it('shows inline error when password is less than 8 chars', async () => {
    render(<ChangePasswordPage />);
    const input = screen.getByPlaceholderText('Nhập mật khẩu mới');
    fireEvent.change(input, { target: { value: 'short' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu phải có ít nhất 8 ký tự')).toBeInTheDocument();
    });
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it('calls PATCH /users/:id/password with newPassword on valid submit', async () => {
    mockPatch.mockResolvedValue({});
    render(<ChangePasswordPage />);
    const input = screen.getByPlaceholderText('Nhập mật khẩu mới');
    fireEvent.change(input, { target: { value: 'securepass123' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(mockPatch).toHaveBeenCalledWith('/users/user-1/password', { newPassword: 'securepass123' }));
  });

  it('shows success message after successful save', async () => {
    mockPatch.mockResolvedValue({});
    render(<ChangePasswordPage />);
    const input = screen.getByPlaceholderText('Nhập mật khẩu mới');
    fireEvent.change(input, { target: { value: 'securepass123' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Đổi mật khẩu thành công')).toBeInTheDocument();
    });
  });

  it('shows error message when API fails', async () => {
    mockPatch.mockRejectedValue(new Error('Lỗi máy chủ'));
    render(<ChangePasswordPage />);
    const input = screen.getByPlaceholderText('Nhập mật khẩu mới');
    fireEvent.change(input, { target: { value: 'securepass123' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Lỗi máy chủ')).toBeInTheDocument();
    });
  });

  it('toggles password visibility on eye button click', () => {
    render(<ChangePasswordPage />);
    const input = screen.getByPlaceholderText('Nhập mật khẩu mới') as HTMLInputElement;
    expect(input.type).toBe('password');

    const toggleBtn = screen.getByRole('button', { name: 'Hiện mật khẩu' });
    fireEvent.click(toggleBtn);
    expect(input.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
    expect(input.type).toBe('password');
  });

  it('navigates back to /settings on back button click', () => {
    render(<ChangePasswordPage />);
    fireEvent.click(screen.getByText('Back'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });
});
