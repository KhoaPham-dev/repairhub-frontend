import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MEDIA_ACCEPT } from '@/lib/media';

// jsdom does not implement URL.createObjectURL; mock it so ImageThumb renders without crashing
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

// jsdom does not implement scrollIntoView; mock it so the TRA_HANG shortcut's
// evidenceSectionRef.current?.scrollIntoView(...) call doesn't throw.
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock next/navigation
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'order-123' }),
  useRouter: () => ({ back: mockBack }),
}));

// Mock lib/auth
jest.mock('@/lib/auth', () => ({ getToken: () => 'test-token' }));

// Mock api
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPatch = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

// Mock fetch (default: ok)
global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) } as Response);

// Mock AuthGuard
jest.mock('@/components/AuthGuard', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock PageHeader
jest.mock('@/components/PageHeader', () => ({
  __esModule: true,
  default: ({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) => (
    <div data-testid="page-header">
      <button onClick={onBack} data-testid="back-button">Back</button>
      <h1>{title}</h1>
      {subtitle && <span>{subtitle}</span>}
    </div>
  ),
}));

import OrderDetailPage from '@/app/orders/[id]/page';

const MOCK_ORDER = {
  id: 'order-123',
  order_code: 'RH-001',
  status: 'TIEP_NHAN',
  priority: null,
  customer_name: 'Nguyễn Văn A',
  customer_phone: '0901234567',
  customer_address: '123 Đường ABC',
  customer_type: 'RETAIL',
  branch_name: 'Chi nhánh 1',
  product_type: 'LOA',
  device_name: 'Loa JBL',
  serial_imei: 'SN001',
  accessories: '',
  fault_description: 'Hỏng loa',
  quotation: 500000,
  warranty_period_months: 3,
  warranty_end_date: null,
  created_by_name: 'Admin',
  created_at: '2024-01-01T00:00:00Z',
  history: [
    {
      id: 'h1',
      old_status: '',
      new_status: 'TIEP_NHAN',
      changed_by_name: 'Admin',
      changed_at: '2024-01-01T00:00:00Z',
      notes: '',
    },
  ],
  images: [],
  source_order_history: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: MOCK_ORDER });
  mockPatch.mockResolvedValue({});
  mockPut.mockResolvedValue({});
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({}) });
});

describe('OrderDetailPage', () => {
  it('renders loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<OrderDetailPage />);
    expect(screen.getByText('Đang tải...')).toBeInTheDocument();
  });

  it('renders PageHeader with order_code as title after load', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'RH-001' })).toBeInTheDocument();
    });
  });

  it('renders PageHeader component (not old inline header)', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  it('does not render old bg-[#1565C0] header div', async () => {
    const { container } = render(<OrderDetailPage />);
    await waitFor(() => {
      const oldHeader = container.querySelector('.bg-\\[\\#1565C0\\]');
      // The page content may have the color on other elements, but the wrapping header div should be gone
      expect(screen.getByTestId('page-header')).toBeInTheDocument();
    });
  });

  it('renders outer wrapper with bg-bg and pb-24 classes', async () => {
    const { container } = render(<OrderDetailPage />);
    await waitFor(() => {
      // Wait for the order to load so the outer div is rendered
      screen.getByRole('heading', { name: 'RH-001' });
    });
    // The AuthGuard is mocked to a passthrough; the first child is the outer div
    const outerDiv = container.querySelector('.min-h-screen.bg-bg.pb-24');
    expect(outerDiv).toBeInTheDocument();
  });

  it('back button calls router.back', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => screen.getByTestId('back-button'));
    screen.getByTestId('back-button').click();
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('displays order details after loading', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText('Loa JBL')).toBeInTheDocument();
    });
  });

  it('shows status update section for non-terminal orders', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Cập nhật trạng thái')).toBeInTheDocument();
    });
  });

  it('hides status update section for terminal orders', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, status: 'DA_GIAO' } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.queryByText('Cập nhật trạng thái')).not.toBeInTheDocument();
    });
  });

  it('shows Báo giá read-only in locked card for terminal order DA_GIAO', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, status: 'DA_GIAO', quotation: 500000 } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Báo giá:')).toBeInTheDocument();
      expect(screen.getByText('500.000 đ')).toBeInTheDocument();
    });
  });

  it('shows Chưa có for terminal order with quotation 0', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, status: 'HUY_TRA_MAY', quotation: 0 } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Báo giá:')).toBeInTheDocument();
      expect(screen.getByText('Chưa có')).toBeInTheDocument();
    });
  });

  it('shows history section', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Lịch sử trạng thái')).toBeInTheDocument();
    });
  });

  it('pre-fills quotation input with significant digits (server value / 1000) on load', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, quotation: 500000 } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      const input = screen.getByPlaceholderText('Nhập báo giá (VNĐ)') as HTMLInputElement;
      expect(input.value).toBe('500');
    });
  });

  it('shows .000 đ suffix in quotation input area', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('.000 đ')).toBeInTheDocument();
    });
  });

  it('does not render Lịch sử đơn gốc when source_order_history is null', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, source_order_history: null } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Lịch sử trạng thái')).toBeInTheDocument();
    });
    expect(screen.queryByText('Lịch sử đơn gốc')).not.toBeInTheDocument();
  });

  it('does not render Lịch sử đơn gốc when source_order_history is an empty array', async () => {
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, source_order_history: [] } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Lịch sử trạng thái')).toBeInTheDocument();
    });
    expect(screen.queryByText('Lịch sử đơn gốc')).not.toBeInTheDocument();
  });

  it('renders Lịch sử đơn gốc section with entries when source_order_history is present', async () => {
    const sourceHistory = [
      {
        id: 'sh1',
        changed_by: 'uuid-tech-a',
        changed_by_name: 'Tech A',
        old_status: null,
        new_status: 'TIEP_NHAN',
        notes: 'Ghi chú nguồn',
        changed_at: '2024-01-01T08:00:00Z',
      },
      {
        id: 'sh2',
        changed_by: 'uuid-tech-b',
        changed_by_name: 'Tech B',
        old_status: 'TIEP_NHAN',
        new_status: 'SUA_XONG',
        notes: null,
        changed_at: '2024-01-02T10:00:00Z',
      },
    ];
    mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, source_order_history: sourceHistory } });
    render(<OrderDetailPage />);
    await waitFor(() => {
      expect(screen.getByText('Lịch sử đơn gốc')).toBeInTheDocument();
    });
    expect(screen.getByText('đơn gốc')).toBeInTheDocument();
    expect(screen.getByText('Ghi chú nguồn')).toBeInTheDocument();
    expect(screen.getByText('Tech A', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Tech B', { exact: false })).toBeInTheDocument();
  });

  it('RH-139: file input accepts HEIC/HEIF explicitly (not image/*)', async () => {
    render(<OrderDetailPage />);
    await waitFor(() => screen.getByText('Lưu thay đổi'));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toHaveAttribute('accept', MEDIA_ACCEPT);
  });

  it('RH-139: failed image upload (ok: false) on update shows error and does not show success toast', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Tải ảnh thất bại' }),
    });

    render(<OrderDetailPage />);
    await waitFor(() => screen.getByText('Lưu thay đổi'));

    // Attach an image to trigger the upload branch
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const img = new File(['x'], 'completion.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [img] } });

    // Now submit
    const saveBtn = screen.getByText('Lưu thay đổi');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    await waitFor(() => {
      expect(screen.getByText('Tải ảnh thất bại')).toBeInTheDocument();
    });

    // Success toast must NOT appear
    expect(screen.queryByText('Cập nhật thành công')).not.toBeInTheDocument();
  });

  describe('saved media gallery', () => {
    it('renders a muted, preload=metadata <video> with a play icon for a saved .mp4, and an <img> for a saved photo', async () => {
      mockGet.mockResolvedValue({
        data: {
          ...MOCK_ORDER,
          images: [
            { id: 'v1', image_path: 'orders/o1/clip.mp4', image_type: 'COMPLETION', uploaded_at: '2024-01-01T00:00:00Z' },
            { id: 'p1', image_path: 'orders/o1/photo.jpg', image_type: 'COMPLETION', uploaded_at: '2024-01-01T00:00:00Z' },
          ],
        },
      });
      const { container } = render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Ảnh đã lưu (2)'));

      const video = container.querySelector('video') as HTMLVideoElement;
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('preload', 'metadata');
      expect(video.muted).toBe(true);
      expect(video.getAttribute('src')).toContain('clip.mp4');

      const img = container.querySelector('img') as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toContain('photo.jpg');

      expect(screen.getByLabelText('Mở video đầy đủ')).toBeInTheDocument();
      expect(screen.getByLabelText('Mở ảnh đầy đủ')).toBeInTheDocument();
    });
  });

  describe('evidence-required statuses (DA_GIAO / HUY_TRA_MAY)', () => {
    // Convenience helpers used across several tests below.
    function selectStatus(value: string) {
      fireEvent.change(screen.getByRole('combobox'), { target: { value } });
    }
    function fillNotes(text: string) {
      fireEvent.change(screen.getByPlaceholderText('Thêm ghi chú...'), { target: { value: text } });
    }
    function attachImage() {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const img = new File(['x'], 'completion.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [img] } });
    }
    function pickFiles(...files: File[]) {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files } });
    }
    function oversizeFile(name: string, type: string, bytes: number): File {
      const file = new File([new Uint8Array(1)], name, { type });
      Object.defineProperty(file, 'size', { value: bytes, configurable: true });
      return file;
    }

    it('shows the required-evidence note when selecting DA_GIAO or HUY_TRA_MAY, not for TRA_HANG or other statuses', async () => {
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Cập nhật trạng thái'));

      selectStatus('DANG_KIEM_TRA');
      expect(screen.queryByText(/Bắt buộc tải lên ít nhất 1 ảnh hoặc video và nhập ghi chú/)).not.toBeInTheDocument();

      selectStatus('TRA_HANG');
      expect(screen.queryByText(/Bắt buộc tải lên ít nhất 1 ảnh hoặc video và nhập ghi chú/)).not.toBeInTheDocument();

      selectStatus('DA_GIAO');
      expect(screen.getByText(/Bắt buộc tải lên ít nhất 1 ảnh hoặc video và nhập ghi chú/)).toBeInTheDocument();

      selectStatus('HUY_TRA_MAY');
      expect(screen.getByText(/Bắt buộc tải lên ít nhất 1 ảnh hoặc video và nhập ghi chú/)).toBeInTheDocument();
    });

    it('toggles aria-required on the notes textarea and file input when DA_GIAO is selected', async () => {
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Cập nhật trạng thái'));

      const notesInput = screen.getByPlaceholderText('Thêm ghi chú...');
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      expect(notesInput).toHaveAttribute('aria-required', 'false');
      expect(fileInput).toHaveAttribute('aria-required', 'false');

      selectStatus('DA_GIAO');

      expect(notesInput).toHaveAttribute('aria-required', 'true');
      expect(fileInput).toHaveAttribute('aria-required', 'true');

      selectStatus('DANG_KIEM_TRA');

      expect(notesInput).toHaveAttribute('aria-required', 'false');
      expect(fileInput).toHaveAttribute('aria-required', 'false');
    });

    it('accepts a video file selected via the picker', async () => {
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));

      const clip = new File(['x'], 'clip.mp4', { type: 'video/mp4' });
      pickFiles(clip);

      expect(screen.getByText(/Đã chọn 1 ảnh/)).toBeInTheDocument();
      expect(screen.queryByText('Định dạng tệp không hợp lệ')).not.toBeInTheDocument();
    });

    it('rejects a file with an unsupported type and shows an error, without adding it', async () => {
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));

      const badFile = new File(['x'], 'notes.pdf', { type: 'application/pdf' });
      pickFiles(badFile);

      expect(screen.getByText('Định dạng tệp không hợp lệ')).toBeInTheDocument();
      expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
    });

    it('rejects an oversize video and shows the size-limit error, without adding it', async () => {
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));

      const hugeClip = oversizeFile('big.mp4', 'video/mp4', 101 * 1024 * 1024);
      pickFiles(hugeClip);

      expect(screen.getByText('Tệp quá lớn (ảnh tối đa 10MB, video tối đa 100MB)')).toBeInTheDocument();
      expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
    });

    it('rejects an oversize image and shows the image size-limit error, keeping a valid file picked alongside it', async () => {
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));

      const hugePhoto = oversizeFile('big.jpg', 'image/jpeg', 11 * 1024 * 1024);
      const okPhoto = new File(['x'], 'ok.jpg', { type: 'image/jpeg' });
      pickFiles(hugePhoto, okPhoto);

      expect(screen.getByText('Ảnh quá lớn (tối đa 10MB mỗi ảnh)')).toBeInTheDocument();
      expect(screen.getByText(/Đã chọn 1 ảnh/)).toBeInTheDocument();
    });

    it('disables Save for DA_GIAO with a photo but no notes', async () => {
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('DA_GIAO');
      attachImage();
      expect(screen.getByText('Lưu thay đổi')).toBeDisabled();
    });

    it('disables Save for DA_GIAO with notes but no photo', async () => {
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('DA_GIAO');
      fillNotes('Đã giao máy cho khách');
      expect(screen.getByText('Lưu thay đổi')).toBeDisabled();
    });

    it('enables Save for DA_GIAO once both notes and a photo are present', async () => {
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('DA_GIAO');
      fillNotes('Đã giao máy cho khách');
      attachImage();
      expect(screen.getByText('Lưu thay đổi')).not.toBeDisabled();
    });

    it('TRA_HANG requires neither notes nor a photo', async () => {
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('TRA_HANG');

      const saveBtn = screen.getByText('Lưu thay đổi');
      expect(saveBtn).not.toBeDisabled();
      expect(screen.queryByText(/Bắt buộc tải lên/)).not.toBeInTheDocument();

      await act(async () => {
        fireEvent.click(saveBtn);
      });

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith('/orders/order-123/status', expect.objectContaining({ status: 'TRA_HANG' }));
      });
      expect(screen.queryByText(/Vui lòng nhập ghi chú/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Vui lòng tải ảnh/)).not.toBeInTheDocument();
    });

    it('enables Save for DA_GIAO when the order already has a fresh COMPLETION image (notes still required)', async () => {
      mockGet.mockResolvedValue({
        data: {
          ...MOCK_ORDER,
          images: [{ id: 'img1', image_path: 'p.jpg', image_type: 'COMPLETION', uploaded_at: '2024-06-01T00:00:00Z' }],
        },
      });
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('DA_GIAO');

      // Image already fresh, but notes still blank.
      expect(screen.getByText('Lưu thay đổi')).toBeDisabled();
      expect(screen.getByText(/đã có ảnh mới/)).toBeInTheDocument();

      fillNotes('Đã giao máy cho khách');
      expect(screen.getByText('Lưu thay đổi')).not.toBeDisabled();
    });

    it('enables Save for DA_GIAO when the order already has a fresh COMPLETION video', async () => {
      mockGet.mockResolvedValue({
        data: {
          ...MOCK_ORDER,
          images: [{ id: 'vid1', image_path: 'orders/o1/clip.mp4', image_type: 'COMPLETION', uploaded_at: '2024-06-01T00:00:00Z' }],
        },
      });
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('DA_GIAO');

      expect(screen.getByText('Lưu thay đổi')).toBeDisabled();
      expect(screen.getByText(/đã có ảnh mới/)).toBeInTheDocument();

      fillNotes('Đã giao máy cho khách');
      expect(screen.getByText('Lưu thay đổi')).not.toBeDisabled();
    });

    it('does not treat a COMPLETION image uploaded before the latest status change as fresh', async () => {
      mockGet.mockResolvedValue({
        data: {
          ...MOCK_ORDER,
          images: [{ id: 'img1', image_path: 'p.jpg', image_type: 'COMPLETION', uploaded_at: '2023-12-01T00:00:00Z' }],
        },
      });
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('DA_GIAO');
      fillNotes('Đã giao máy cho khách');

      expect(screen.getByText('Lưu thay đổi')).toBeDisabled();
      expect(screen.queryByText(/đã có ảnh mới/)).not.toBeInTheDocument();
    });

    it('treats a non-transition history row (old_status === new_status, e.g. a warranty/notes edit) as not resetting freshness', async () => {
      // Latest genuine transition is the TIEP_NHAN creation row (old_status
      // null). A later warranty-duration edit has old_status === new_status
      // and must be ignored — the COMPLETION image uploaded after the
      // transition (but before the warranty edit) still counts as fresh.
      mockGet.mockResolvedValue({
        data: {
          ...MOCK_ORDER,
          history: [
            { id: 'h1', old_status: null, new_status: 'TIEP_NHAN', changed_by_name: 'Admin', changed_at: '2024-01-01T00:00:00Z', notes: '' },
            { id: 'h2', old_status: 'TIEP_NHAN', new_status: 'TIEP_NHAN', changed_by_name: 'Admin', changed_at: '2024-07-01T00:00:00Z', notes: 'Cập nhật bảo hành' },
          ],
          images: [{ id: 'img1', image_path: 'p.jpg', image_type: 'COMPLETION', uploaded_at: '2024-06-01T00:00:00Z' }],
        },
      });
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('DA_GIAO');
      fillNotes('Đã giao máy cho khách');

      expect(screen.getByText('Lưu thay đổi')).not.toBeDisabled();
      expect(screen.getByText(/đã có ảnh mới/)).toBeInTheDocument();
    });

    it('a newer genuine status transition makes an earlier COMPLETION image stale', async () => {
      mockGet.mockResolvedValue({
        data: {
          ...MOCK_ORDER,
          history: [
            { id: 'h1', old_status: null, new_status: 'TIEP_NHAN', changed_by_name: 'Admin', changed_at: '2024-01-01T00:00:00Z', notes: '' },
            { id: 'h2', old_status: 'TIEP_NHAN', new_status: 'DANG_KIEM_TRA', changed_by_name: 'Admin', changed_at: '2024-08-01T00:00:00Z', notes: '' },
          ],
          images: [{ id: 'img1', image_path: 'p.jpg', image_type: 'COMPLETION', uploaded_at: '2024-06-01T00:00:00Z' }],
        },
      });
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('DA_GIAO');
      fillNotes('Đã giao máy cho khách');

      expect(screen.getByText('Lưu thay đổi')).toBeDisabled();
      expect(screen.queryByText(/đã có ảnh mới/)).not.toBeInTheDocument();
    });

    it('uploads images before calling PUT /status', async () => {
      const callOrder: string[] = [];
      (global.fetch as jest.Mock).mockImplementation(async () => {
        callOrder.push('upload');
        return { ok: true, json: async () => ({}) };
      });
      mockPut.mockImplementation(async () => {
        callOrder.push('status');
        return {};
      });

      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('DA_GIAO');
      fillNotes('Đã giao máy cho khách');
      attachImage();

      const saveBtn = screen.getByText('Lưu thay đổi');
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith('/orders/order-123/status', expect.objectContaining({ status: 'DA_GIAO' }));
      });
      expect(callOrder).toEqual(['upload', 'status']);
    });

    it('clears newImages after a successful upload even when the following status PUT fails, and shows the error', async () => {
      mockPut.mockRejectedValue(new Error('Cập nhật trạng thái thất bại'));

      render(<OrderDetailPage />);
      await waitFor(() => screen.getByText('Lưu thay đổi'));
      selectStatus('DA_GIAO');
      fillNotes('Đã giao máy cho khách');
      attachImage();
      expect(screen.getByText(/Đã chọn 1 ảnh/)).toBeInTheDocument();

      const saveBtn = screen.getByText('Lưu thay đổi');
      await act(async () => {
        fireEvent.click(saveBtn);
      });

      await waitFor(() => {
        expect(screen.getByText('Cập nhật trạng thái thất bại')).toBeInTheDocument();
      });
      // The image picker is back to its empty-state label — newImages was
      // cleared right after the (successful) upload, before the PUT failed.
      expect(screen.getByText('Chọn hình ảnh')).toBeInTheDocument();
      expect(screen.queryByText('Cập nhật thành công')).not.toBeInTheDocument();
    });

    it('TRA_HANG cancel shortcut selects HUY_TRA_MAY and scrolls to evidence fields without opening the confirm modal', async () => {
      mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, status: 'TRA_HANG' } });
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByRole('button', { name: 'Huỷ trả máy' }));

      fireEvent.click(screen.getByRole('button', { name: 'Huỷ trả máy' }));

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('HUY_TRA_MAY');
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
      // Clicking the shortcut must not open the confirm modal directly —
      // without notes/photo the PUT would always be rejected by the BE.
      expect(screen.queryByText('Xác nhận huỷ đơn này? Hành động này không thể hoàn tác.')).not.toBeInTheDocument();
    });

    it('Save opens the confirm modal for HUY_TRA_MAY, and confirming calls PUT with the notes', async () => {
      mockGet.mockResolvedValue({ data: { ...MOCK_ORDER, status: 'TRA_HANG' } });
      render(<OrderDetailPage />);
      await waitFor(() => screen.getByRole('button', { name: 'Huỷ trả máy' }));

      fireEvent.click(screen.getByRole('button', { name: 'Huỷ trả máy' }));
      fillNotes('Khách không đồng ý sửa');
      attachImage();

      const saveBtn = screen.getByText('Lưu thay đổi');
      expect(saveBtn).not.toBeDisabled();
      fireEvent.click(saveBtn);

      const confirmMessage = await screen.findByText('Xác nhận huỷ đơn này? Hành động này không thể hoàn tác.');
      expect(confirmMessage).toBeInTheDocument();
      expect(mockPut).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.click(screen.getByText('Xác nhận'));
      });

      await waitFor(() => {
        expect(mockPut).toHaveBeenCalledWith('/orders/order-123/status', {
          status: 'HUY_TRA_MAY',
          notes: 'Khách không đồng ý sửa',
        });
      });
    });
  });
});
