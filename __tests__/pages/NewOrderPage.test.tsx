import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MEDIA_ACCEPT } from '@/lib/media';

// jsdom does not implement URL.createObjectURL; mock it so ImageThumb renders without crashing
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

// Mock next/navigation
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

// Mock lib/auth
jest.mock('@/lib/auth', () => ({ getToken: () => 'test-token' }));

// Mock api
const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

import NewOrderPage from '@/app/orders/new/page';

const BRANCHES = [
  { id: 'b1', name: 'Chi nhánh 1' },
  { id: 'b2', name: 'Chi nhánh 2' },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: BRANCHES });
});

describe('NewOrderPage', () => {
  it('renders the page header with back button', async () => {
    render(<NewOrderPage />);
    await waitFor(() => {
      expect(screen.getByText('Tạo đơn mới')).toBeInTheDocument();
    });
  });

  it('loads and displays branches as button-select', async () => {
    render(<NewOrderPage />);
    await waitFor(() => {
      expect(screen.getByText('Chi nhánh 1')).toBeInTheDocument();
      expect(screen.getByText('Chi nhánh 2')).toBeInTheDocument();
    });
  });

  it('selects branch on button click', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Chi nhánh 2'));
    const btn = screen.getByText('Chi nhánh 2');
    fireEvent.click(btn);
    expect(btn.className).toContain('bg-accent');
  });

  it('renders product type buttons (Loa, Tai nghe, Bảo Hành)', async () => {
    render(<NewOrderPage />);
    await waitFor(() => {
      expect(screen.getByText('Loa')).toBeInTheDocument();
      expect(screen.getByText('Tai nghe')).toBeInTheDocument();
      expect(screen.getByText('Bảo Hành')).toBeInTheDocument();
    });
  });

  it('shows Bảo Hành flow (warranty search) when BAO_HANH product type selected', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Bảo Hành'));
    fireEvent.click(screen.getByText('Bảo Hành'));
    // With phone empty, the BAO_HANH section prompts the operator to type one.
    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập số điện thoại khách hàng ở trên')).toBeInTheDocument();
    });
  });

  it('hides regular product fields when BAO_HANH is selected', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Bảo Hành'));
    fireEvent.click(screen.getByText('Bảo Hành'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Tên thiết bị *')).not.toBeInTheDocument();
    });
  });

  it('warranty-claim picker caps a single pick at 10 files and shows the cap message', async () => {
    mockGet.mockResolvedValueOnce({ data: BRANCHES }); // branches on mount
    mockGet.mockResolvedValueOnce({
      data: [{ id: 'w1', order_code: 'RH-100', device_name: 'Loa X', warranty_end_date: null }],
    }); // /warranty/search

    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Bảo Hành'));
    fireEvent.click(screen.getByText('Bảo Hành'));

    fireEvent.change(screen.getByPlaceholderText('Số điện thoại *'), { target: { value: '0901234567' } });
    await waitFor(() => screen.getByText('RH-100'));
    fireEvent.click(screen.getByText('RH-100'));

    await waitFor(() => screen.getByText('Chọn ảnh / video'));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = Array.from({ length: 11 }, (_, i) => new File(['x'], `p${i}.jpg`, { type: 'image/jpeg' }));
    fireEvent.change(fileInput, { target: { files } });

    expect(screen.getByText('Quá nhiều tệp trong một lần tải lên (tối đa 10)')).toBeInTheDocument();
    expect(screen.getByText(/Đã chọn 10 ảnh/)).toBeInTheDocument();
  });

  // Note: the warranty package selector (3 / 6 / 12 tháng / Khác) was removed
  // from new-order — quotation + warranty period are now set on the order
  // detail page during the SUA_XONG transition. Tests for those moved out.

  it('adds a second product row on Thêm sản phẩm click', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Thêm sản phẩm'));
    fireEvent.click(screen.getByText('Thêm sản phẩm'));
    await waitFor(() => {
      expect(screen.getByText('Sản phẩm 1')).toBeInTheDocument();
      expect(screen.getByText('Sản phẩm 2')).toBeInTheDocument();
    });
  });

  it('removes a product row when Xoá is clicked', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Thêm sản phẩm'));
    fireEvent.click(screen.getByText('Thêm sản phẩm'));
    await waitFor(() => screen.getAllByText('Xoá'));
    const removeButtons = screen.getAllByText('Xoá');
    fireEvent.click(removeButtons[0]);
    await waitFor(() => {
      expect(screen.queryByText('Sản phẩm 2')).not.toBeInTheDocument();
    });
  });

  it('shows Thêm sản phẩm only when not in Bảo Hành mode', async () => {
    render(<NewOrderPage />);
    await waitFor(() => {
      expect(screen.getByText('Thêm sản phẩm')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Bảo Hành'));
    await waitFor(() => {
      expect(screen.queryByText('Thêm sản phẩm')).not.toBeInTheDocument();
    });
  });

  it('shows error when new customer phone/name missing on submit', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Tạo đơn hàng'));
    // Branch must be selected first — otherwise the "Vui lòng chọn chi nhánh"
    // error fires before reaching the customer-name validation.
    fireEvent.click(screen.getByText('Chi nhánh 1'));
    // Fill phone but skip name — the JS validation should catch name missing
    fireEvent.change(screen.getByPlaceholderText('Số điện thoại *'), { target: { value: '0901234567' } });
    // Fill required product fields (no quotation field on new-order anymore — RH-57 era)
    fireEvent.change(screen.getByPlaceholderText('Tên thiết bị *'), { target: { value: 'Loa' } });
    fireEvent.change(screen.getByPlaceholderText('Mô tả lỗi *'), { target: { value: 'Hỏng' } });
    // Submit form programmatically to bypass HTML5 validation
    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập SĐT và tên khách hàng')).toBeInTheDocument();
    });
  });

  it('submits single product order and navigates to /orders list', async () => {
    mockGet.mockResolvedValueOnce({ data: BRANCHES });
    mockPost.mockResolvedValueOnce({ data: { id: 'cust1' } }); // create customer

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [{ id: 'order1' }], error: null }),
    } as Response);

    render(<NewOrderPage />);
    await waitFor(() => screen.getByPlaceholderText('Số điện thoại *'));

    fireEvent.click(screen.getByText('Chi nhánh 1'));
    fireEvent.change(screen.getByPlaceholderText('Số điện thoại *'), { target: { value: '0901234567' } });
    fireEvent.change(screen.getByPlaceholderText('Tên khách hàng *'), { target: { value: 'Nguyễn Văn A' } });
    fireEvent.change(screen.getByPlaceholderText('Tên thiết bị *'), { target: { value: 'Loa JBL' } });
    fireEvent.change(screen.getByPlaceholderText('Mô tả lỗi *'), { target: { value: 'Hỏng loa' } });

    // Attach an image so canSubmit allows submission
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const img = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [img] } });

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    // RH-57: post-create redirects to the order list, not the detail page.
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders');
    });

    fetchSpy.mockRestore();
  });

  it('submits bulk order (2 products) and navigates to /orders list', async () => {
    mockGet.mockResolvedValueOnce({ data: BRANCHES });
    mockPost.mockResolvedValueOnce({ data: { id: 'cust1' } }); // create customer

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [{ id: 'ord1' }, { id: 'ord2' }], error: null }),
    } as Response);

    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Thêm sản phẩm'));

    fireEvent.click(screen.getByText('Chi nhánh 1'));
    fireEvent.change(screen.getByPlaceholderText('Số điện thoại *'), { target: { value: '0901234567' } });
    fireEvent.change(screen.getByPlaceholderText('Tên khách hàng *'), { target: { value: 'Nguyễn Văn A' } });

    fireEvent.click(screen.getByText('Thêm sản phẩm'));
    await waitFor(() => screen.getByText('Sản phẩm 2'));

    const deviceInputs = screen.getAllByPlaceholderText('Tên thiết bị *');
    const faultInputs = screen.getAllByPlaceholderText('Mô tả lỗi *');

    fireEvent.change(deviceInputs[0], { target: { value: 'Loa JBL' } });
    fireEvent.change(faultInputs[0], { target: { value: 'Hỏng loa' } });
    fireEvent.change(deviceInputs[1], { target: { value: 'Tai nghe Sony' } });
    fireEvent.change(faultInputs[1], { target: { value: 'Đứt dây' } });

    // Attach images to each product so canSubmit is satisfied
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const img1 = new File(['a'], 'img1.jpg', { type: 'image/jpeg' });
    const img2 = new File(['b'], 'img2.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInputs[0], { target: { files: [img1] } });
    fireEvent.change(fileInputs[1], { target: { files: [img2] } });

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders');
    });

    fetchSpy.mockRestore();
  });

  it('customer type button-select switches between Khách lẻ and Đối tác', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Khách lẻ'));
    const partnerBtn = screen.getByText('Đối tác');
    fireEvent.click(partnerBtn);
    expect(partnerBtn.className).toContain('bg-accent');
  });

  it('selecting Đối tác shows the partner list (RH-66)', async () => {
    const partnersData = [
      { id: 'p1', phone: '0900000001', name: 'Acme Corp', address: 'HCM', type: 'PARTNER', notes: '' },
      { id: 'p2', phone: '0900000002', name: 'Foo Ltd', address: '', type: 'PARTNER', notes: '' },
    ];
    mockGet
      .mockResolvedValueOnce({ data: BRANCHES })          // branches load
      .mockResolvedValueOnce({ data: partnersData });     // partners load when type=PARTNER

    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Đối tác'));
    fireEvent.click(screen.getByText('Đối tác'));

    // Phone/name/address inputs are NOT rendered in partner mode.
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Số điện thoại *')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Tên khách hàng *')).not.toBeInTheDocument();
    });

    // The partner list IS rendered.
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Foo Ltd')).toBeInTheDocument();
    });

    // Tapping a partner selects it; the selected-customer card appears.
    fireEvent.click(screen.getByText('Acme Corp'));
    await waitFor(() => {
      expect(screen.getByText('Xoá chọn')).toBeInTheDocument();
    });
  });

  it('RH-131: partner search input appears and filters by name', async () => {
    const partnersData = [
      { id: 'p1', phone: '0900000001', name: 'Acme Corp', address: 'HCM', type: 'PARTNER', notes: '' },
      { id: 'p2', phone: '0900000002', name: 'Foo Ltd', address: '', type: 'PARTNER', notes: '' },
    ];
    mockGet
      .mockResolvedValueOnce({ data: BRANCHES })
      .mockResolvedValueOnce({ data: partnersData });

    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Đối tác'));
    fireEvent.click(screen.getByText('Đối tác'));

    // Wait for partner list to load
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Foo Ltd')).toBeInTheDocument();
    });

    // Search input should be present
    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc số điện thoại...');
    expect(searchInput).toBeInTheDocument();

    // Filter by name
    fireEvent.change(searchInput, { target: { value: 'Acme' } });
    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.queryByText('Foo Ltd')).not.toBeInTheDocument();
    });
  });

  it('RH-131: partner search filters by phone number', async () => {
    const partnersData = [
      { id: 'p1', phone: '0900000001', name: 'Acme Corp', address: 'HCM', type: 'PARTNER', notes: '' },
      { id: 'p2', phone: '0900000002', name: 'Foo Ltd', address: '', type: 'PARTNER', notes: '' },
    ];
    mockGet
      .mockResolvedValueOnce({ data: BRANCHES })
      .mockResolvedValueOnce({ data: partnersData });

    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Đối tác'));
    fireEvent.click(screen.getByText('Đối tác'));

    await waitFor(() => screen.getByText('Acme Corp'));

    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc số điện thoại...');
    fireEvent.change(searchInput, { target: { value: '0900000002' } });

    await waitFor(() => {
      expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
      expect(screen.getByText('Foo Ltd')).toBeInTheDocument();
    });
  });

  it('RH-131: shows empty state when search matches nothing', async () => {
    const partnersData = [
      { id: 'p1', phone: '0900000001', name: 'Acme Corp', address: 'HCM', type: 'PARTNER', notes: '' },
    ];
    mockGet
      .mockResolvedValueOnce({ data: BRANCHES })
      .mockResolvedValueOnce({ data: partnersData });

    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Đối tác'));
    fireEvent.click(screen.getByText('Đối tác'));

    await waitFor(() => screen.getByText('Acme Corp'));

    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc số điện thoại...');
    fireEvent.change(searchInput, { target: { value: 'xyz-no-match' } });

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy đối tác')).toBeInTheDocument();
      expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
    });
  });

  it('RH-131: selecting a partner clears the search input', async () => {
    const partnersData = [
      { id: 'p1', phone: '0900000001', name: 'Acme Corp', address: 'HCM', type: 'PARTNER', notes: '' },
      { id: 'p2', phone: '0900000002', name: 'Foo Ltd', address: '', type: 'PARTNER', notes: '' },
    ];
    mockGet
      .mockResolvedValueOnce({ data: BRANCHES })
      .mockResolvedValueOnce({ data: partnersData });

    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Đối tác'));
    fireEvent.click(screen.getByText('Đối tác'));

    await waitFor(() => screen.getByText('Acme Corp'));

    const searchInput = screen.getByPlaceholderText('Tìm theo tên hoặc số điện thoại...');
    fireEvent.change(searchInput, { target: { value: 'Acme' } });

    // Select a partner
    fireEvent.click(screen.getByText('Acme Corp'));

    // After selection, the search input is gone (condition: !selectedCustomer)
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Tìm theo tên hoặc số điện thoại...')).not.toBeInTheDocument();
      expect(screen.getByText('Xoá chọn')).toBeInTheDocument();
    });
  });

  it('shows customer search suggestions and allows selection', async () => {
    const customerData = [{ id: 'c1', phone: '0901111111', name: 'Khách Test', address: '', type: 'RETAIL', notes: '' }];
    mockGet
      .mockResolvedValueOnce({ data: BRANCHES })
      .mockResolvedValue({ data: customerData });

    render(<NewOrderPage />);
    await waitFor(() => screen.getByPlaceholderText('Số điện thoại *'));

    fireEvent.change(screen.getByPlaceholderText('Số điện thoại *'), { target: { value: '0901111111' } });

    // Wait for debounce (300ms) + API call to resolve
    await waitFor(() => {
      expect(screen.getByText(/Khách Test/)).toBeInTheDocument();
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText(/Khách Test/));
    await waitFor(() => {
      // After selection, suggestions disappear and customer card shows
      expect(screen.getAllByText('Khách Test').length).toBeGreaterThan(0);
    });
  });

  it('image input does NOT have capture attribute (so OS picker offers gallery — RH-61)', async () => {
    render(<NewOrderPage />);
    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).not.toHaveAttribute('capture');
      expect(fileInput).toHaveAttribute('multiple');
    });
  });

  it('RH-139: file input accepts HEIC/HEIF explicitly (not image/*)', async () => {
    render(<NewOrderPage />);
    await waitFor(() => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toHaveAttribute('accept', MEDIA_ACCEPT);
    });
  });

  it('product image picker accepts a video file', async () => {
    render(<NewOrderPage />);
    await waitFor(() => document.querySelector('input[type="file"]'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clip = new File(['x'], 'clip.mp4', { type: 'video/mp4' });
    fireEvent.change(fileInput, { target: { files: [clip] } });

    expect(screen.getByText(/Đã chọn 1 ảnh/)).toBeInTheDocument();
    expect(screen.queryByText('Định dạng tệp không hợp lệ')).not.toBeInTheDocument();
  });

  it('product image picker rejects an unsupported file type with a visible error', async () => {
    render(<NewOrderPage />);
    await waitFor(() => document.querySelector('input[type="file"]'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const badFile = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });

    expect(screen.getByText('Định dạng tệp không hợp lệ')).toBeInTheDocument();
    expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
  });

  it('product image picker rejects an oversize video with the size-limit error', async () => {
    render(<NewOrderPage />);
    await waitFor(() => document.querySelector('input[type="file"]'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const hugeClip = new File(['x'], 'big.mp4', { type: 'video/mp4' });
    Object.defineProperty(hugeClip, 'size', { value: 101 * 1024 * 1024, configurable: true });
    fireEvent.change(fileInput, { target: { files: [hugeClip] } });

    expect(screen.getByText('Tệp quá lớn (ảnh tối đa 10MB, video tối đa 100MB)')).toBeInTheDocument();
    expect(screen.queryByText(/Đã chọn/)).not.toBeInTheDocument();
  });

  it('product image picker caps a single pick at 50 files and shows the cap message', async () => {
    render(<NewOrderPage />);
    await waitFor(() => document.querySelector('input[type="file"]'));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = Array.from({ length: 51 }, (_, i) => new File(['x'], `p${i}.jpg`, { type: 'image/jpeg' }));
    fireEvent.change(fileInput, { target: { files } });

    expect(screen.getByText('Quá nhiều tệp trong một lần tải lên (tối đa 50)')).toBeInTheDocument();
    expect(screen.getByText(/Đã chọn 50 ảnh/)).toBeInTheDocument();
  });

  it('the 50-file cap is shared across all product rows combined, not per row', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Thêm sản phẩm'));
    fireEvent.click(screen.getByText('Thêm sản phẩm'));
    await waitFor(() => screen.getByText('Sản phẩm 2'));

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const batch1 = Array.from({ length: 30 }, (_, i) => new File(['x'], `a${i}.jpg`, { type: 'image/jpeg' }));
    fireEvent.change(fileInputs[0], { target: { files: batch1 } });
    await waitFor(() => expect(screen.getByText(/Đã chọn 30 ảnh/)).toBeInTheDocument());

    // Product 1 already holds 30 of the shared 50-file budget, so only 20
    // more (of the 25 picked here) should be accepted for product 2.
    const batch2 = Array.from({ length: 25 }, (_, i) => new File(['x'], `b${i}.jpg`, { type: 'image/jpeg' }));
    fireEvent.change(fileInputs[1], { target: { files: batch2 } });

    expect(screen.getByText('Quá nhiều tệp trong một lần tải lên (tối đa 50)')).toBeInTheDocument();
    expect(screen.getByText(/Đã chọn 30 ảnh/)).toBeInTheDocument();
    expect(screen.getByText(/Đã chọn 20 ảnh/)).toBeInTheDocument();
  });

  it('RH-142: 2-product order sends exactly ONE fetch to /api/orders/bulk-with-images with correct payload and image fields', async () => {
    mockGet.mockResolvedValueOnce({ data: BRANCHES });
    mockPost.mockResolvedValueOnce({ data: { id: 'cust1' } }); // create customer

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [{ id: 'ordA' }, { id: 'ordB' }], error: null }),
    } as Response);

    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Thêm sản phẩm'));

    fireEvent.click(screen.getByText('Chi nhánh 1'));
    fireEvent.change(screen.getByPlaceholderText('Số điện thoại *'), { target: { value: '0901234567' } });
    fireEvent.change(screen.getByPlaceholderText('Tên khách hàng *'), { target: { value: 'Nguyễn Văn A' } });

    fireEvent.click(screen.getByText('Thêm sản phẩm'));
    await waitFor(() => screen.getByText('Sản phẩm 2'));

    const deviceInputs = screen.getAllByPlaceholderText('Tên thiết bị *');
    const faultInputs = screen.getAllByPlaceholderText('Mô tả lỗi *');

    fireEvent.change(deviceInputs[0], { target: { value: 'Loa JBL' } });
    fireEvent.change(faultInputs[0], { target: { value: 'Hỏng loa' } });
    fireEvent.change(deviceInputs[1], { target: { value: 'Tai nghe Sony' } });
    fireEvent.change(faultInputs[1], { target: { value: 'Đứt dây' } });

    // Attach 2 images to product A, 1 image to product B
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const imgA1 = new File(['a'], 'imgA1.jpg', { type: 'image/jpeg' });
    const imgA2 = new File(['b'], 'imgA2.jpg', { type: 'image/jpeg' });
    const imgB1 = new File(['c'], 'imgB1.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInputs[0], { target: { files: [imgA1, imgA2] } });
    fireEvent.change(fileInputs[1], { target: { files: [imgB1] } });

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders');
    });

    // Must be exactly ONE fetch call
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/orders/bulk-with-images');
    expect(init.method).toBe('POST');
    // Content-Type must NOT be set manually — browser sets the multipart boundary
    expect((init.headers as Record<string, string>)?.['Content-Type']).toBeUndefined();

    const sentFd = init.body as FormData;

    // payload JSON is correct
    const payload = JSON.parse(sentFd.get('payload') as string);
    expect(payload.customer_id).toBe('cust1');
    expect(payload.branch_id).toBe('b1');
    expect(payload.products).toHaveLength(2);
    expect(payload.products[0].device_name).toBe('Loa JBL');
    expect(payload.products[1].device_name).toBe('Tai nghe Sony');

    // images_0 has 2 files (product A), images_1 has 1 file (product B)
    expect(sentFd.getAll('images_0')).toHaveLength(2);
    expect(sentFd.getAll('images_1')).toHaveLength(1);

    fetchSpy.mockRestore();
  });

  it('RH-142: when /api/orders/bulk-with-images returns ok:false, error is shown and navigation is blocked', async () => {
    mockGet.mockResolvedValueOnce({ data: BRANCHES });
    mockPost.mockResolvedValueOnce({ data: { id: 'cust1' } }); // create customer

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Tạo đơn thất bại do lỗi DB' }),
    } as Response);

    render(<NewOrderPage />);
    await waitFor(() => screen.getByPlaceholderText('Số điện thoại *'));

    fireEvent.click(screen.getByText('Chi nhánh 1'));
    fireEvent.change(screen.getByPlaceholderText('Số điện thoại *'), { target: { value: '0901234567' } });
    fireEvent.change(screen.getByPlaceholderText('Tên khách hàng *'), { target: { value: 'Nguyễn Văn A' } });
    fireEvent.change(screen.getByPlaceholderText('Tên thiết bị *'), { target: { value: 'Loa JBL' } });
    fireEvent.change(screen.getByPlaceholderText('Mô tả lỗi *'), { target: { value: 'Hỏng loa' } });

    // Attach an image
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const img = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [img] } });

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Tạo đơn thất bại do lỗi DB')).toBeInTheDocument();
    });

    // Navigation must NOT have been triggered
    expect(mockPush).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });
});
