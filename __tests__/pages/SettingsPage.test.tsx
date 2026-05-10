import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// Mock lib/auth
const mockIsAdmin = jest.fn();
const mockClearAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  isAdmin: () => mockIsAdmin(),
  clearAuth: () => mockClearAuth(),
}));

// Mock lib/api
const mockPost = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
}));

// Mock AuthGuard
jest.mock('@/components/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock PageHeader
jest.mock('@/components/PageHeader', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

// Mock ConfirmModal — render a simple dialog that calls onConfirm/onCancel
jest.mock('@/components/ConfirmModal', () => ({
  __esModule: true,
  default: ({ open, onConfirm, onCancel, title, confirmLabel }: {
    open: boolean; onConfirm: () => void; onCancel: () => void;
    title: string; confirmLabel?: string;
  }) =>
    open ? (
      <div data-testid="confirm-modal">
        <span>{title}</span>
        <button onClick={onConfirm}>{confirmLabel ?? 'Xác nhận'}</button>
        <button onClick={onCancel}>Huỷ</button>
      </div>
    ) : null,
}));

import SettingsPage from '@/app/settings/page';

beforeEach(() => {
  jest.clearAllMocks();
  mockPost.mockResolvedValue({});
});

describe('SettingsPage', () => {
  it('renders page title Cài đặt', () => {
    mockIsAdmin.mockReturnValue(false);
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'Cài đặt' })).toBeInTheDocument();
  });

  it('renders Đổi mật khẩu item', () => {
    mockIsAdmin.mockReturnValue(false);
    render(<SettingsPage />);
    expect(screen.getByText('Đổi mật khẩu')).toBeInTheDocument();
  });

  it('renders Đăng xuất item', () => {
    mockIsAdmin.mockReturnValue(false);
    render(<SettingsPage />);
    expect(screen.getByText('Đăng xuất')).toBeInTheDocument();
  });

  it('does NOT render Quản lý nhân viên for non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    render(<SettingsPage />);
    expect(screen.queryByText('Quản lý nhân viên')).toBeNull();
  });

  it('renders Quản lý nhân viên for admin', () => {
    mockIsAdmin.mockReturnValue(true);
    render(<SettingsPage />);
    expect(screen.getByText('Quản lý nhân viên')).toBeInTheDocument();
  });

  it('does NOT render Báo cáo doanh thu for non-admin', () => {
    mockIsAdmin.mockReturnValue(false);
    render(<SettingsPage />);
    expect(screen.queryByText('Báo cáo doanh thu')).toBeNull();
  });

  it('renders Báo cáo doanh thu for admin', () => {
    mockIsAdmin.mockReturnValue(true);
    render(<SettingsPage />);
    expect(screen.getByText('Báo cáo doanh thu')).toBeInTheDocument();
  });

  it('navigates to /settings/change-password when Đổi mật khẩu is clicked', () => {
    mockIsAdmin.mockReturnValue(false);
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Đổi mật khẩu'));
    expect(mockPush).toHaveBeenCalledWith('/settings/change-password');
  });

  it('navigates to /settings/staff when Quản lý nhân viên is clicked (admin)', () => {
    mockIsAdmin.mockReturnValue(true);
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Quản lý nhân viên'));
    expect(mockPush).toHaveBeenCalledWith('/settings/staff');
  });

  it('navigates to /settings/reports when Báo cáo doanh thu is clicked (admin)', () => {
    mockIsAdmin.mockReturnValue(true);
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Báo cáo doanh thu'));
    expect(mockPush).toHaveBeenCalledWith('/settings/reports');
  });

  it('opens confirm dialog when Đăng xuất is clicked', () => {
    mockIsAdmin.mockReturnValue(false);
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Đăng xuất'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
  });

  it('calls clearAuth and redirects to /login on logout confirm', async () => {
    mockIsAdmin.mockReturnValue(false);
    render(<SettingsPage />);

    fireEvent.click(screen.getByText('Đăng xuất'));
    fireEvent.click(screen.getByText('Đăng xuất', { selector: 'button' }));

    await waitFor(() => expect(mockClearAuth).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('closes dialog on Huỷ without logging out', () => {
    mockIsAdmin.mockReturnValue(false);
    render(<SettingsPage />);

    fireEvent.click(screen.getByText('Đăng xuất'));
    fireEvent.click(screen.getByText('Huỷ'));

    expect(screen.queryByTestId('confirm-modal')).toBeNull();
    expect(mockClearAuth).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
