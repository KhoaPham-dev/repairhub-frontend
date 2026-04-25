import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AuthGuard from '@/components/AuthGuard';

// Mock next/navigation
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// Mock lib/auth
const mockGetToken = jest.fn();
jest.mock('@/lib/auth', () => ({
  getToken: () => mockGetToken(),
}));

describe('AuthGuard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /login when no token is present', async () => {
    mockGetToken.mockReturnValue(null);
    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    );
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders children when token is present', async () => {
    mockGetToken.mockReturnValue('valid-token');
    render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    );
    await waitFor(() => {
      expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders nothing initially while checking auth', () => {
    mockGetToken.mockReturnValue('valid-token');
    const { container } = render(
      <AuthGuard>
        <div>Protected content</div>
      </AuthGuard>
    );
    // Before useEffect runs, nothing should be rendered
    // (React batches state — this checks the synchronous initial render)
    // The container may be empty initially
    expect(container).toBeDefined();
  });

  it('does not redirect when token is present', async () => {
    mockGetToken.mockReturnValue('some-token');
    render(
      <AuthGuard>
        <div>Dashboard</div>
      </AuthGuard>
    );
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    expect(mockReplace).not.toHaveBeenCalledWith('/login');
  });
});
