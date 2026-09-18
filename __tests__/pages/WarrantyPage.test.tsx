import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockGet = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { get: (...args: unknown[]) => mockGet(...args) },
}));

jest.mock('@/components/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import WarrantyPage from '@/app/warranty/page';

function baseResult(overrides: Record<string, unknown>) {
  return {
    id: 'r1',
    order_code: 'RH-001',
    device_name: 'Loa JBL',
    fault_description: 'Hỏng loa',
    customer_name: 'Nguyễn Văn A',
    customer_phone: '0901234567',
    branch_name: 'Chi nhánh 1',
    warranty_period_months: 6,
    warranty_end_date: null,
    warranty_status: 'ACTIVE',
    expiring_soon: false,
    updated_at: '2024-01-01T00:00:00Z',
    images: null,
    ...overrides,
  };
}

async function search(q: string) {
  fireEvent.change(
    screen.getByPlaceholderText('Tìm theo SĐT, serial, tên thiết bị...'),
    { target: { value: q } }
  );
  await act(async () => {
    fireEvent.click(screen.getByText('Tìm'));
  });
}

describe('WarrantyPage — before/after thumbnails skip videos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the first non-video INTAKE/COMPLETION image, skipping a video listed first', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        baseResult({
          images: [
            { id: 'i1', image_path: 'clip-intake.mp4', image_type: 'INTAKE' },
            { id: 'i2', image_path: 'photo-intake.jpg', image_type: 'INTAKE' },
            { id: 'i3', image_path: 'clip-completion.mov', image_type: 'COMPLETION' },
            { id: 'i4', image_path: 'photo-completion.jpg', image_type: 'COMPLETION' },
          ],
        }),
      ],
    });

    render(<WarrantyPage />);
    await search('0901234567');
    await waitFor(() => screen.getByText('RH-001'));

    const beforeImg = screen.getByAltText('before') as HTMLImageElement;
    const afterImg = screen.getByAltText('after') as HTMLImageElement;
    expect(beforeImg.src).toContain('photo-intake.jpg');
    expect(afterImg.src).toContain('photo-completion.jpg');
    expect(beforeImg.src).not.toContain('clip-intake.mp4');
    expect(afterImg.src).not.toContain('clip-completion.mov');
  });

  it('shows nothing for a type whose only upload is a video (no still image to fall back to)', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: [
        baseResult({
          images: [{ id: 'i1', image_path: 'clip-intake.webm', image_type: 'INTAKE' }],
        }),
      ],
    });

    render(<WarrantyPage />);
    await search('0901234567');
    await waitFor(() => screen.getByText('RH-001'));

    expect(screen.queryByAltText('before')).not.toBeInTheDocument();
    expect(screen.queryByAltText('after')).not.toBeInTheDocument();
  });
});
