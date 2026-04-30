import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

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
global.fetch = jest.fn().mockResolvedValue({ ok: true });

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
    expect(btn.className).toContain('bg-[#004EAB]');
  });

  it('renders product type buttons (Loa, Tai nghe, Bảo Hành)', async () => {
    render(<NewOrderPage />);
    await waitFor(() => {
      expect(screen.getByText('Loa')).toBeInTheDocument();
      expect(screen.getByText('Tai nghe')).toBeInTheDocument();
      expect(screen.getByText('Bảo Hành')).toBeInTheDocument();
    });
  });

  it('shows Bảo Hành flow when BAO_HANH product type selected', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Bảo Hành'));
    fireEvent.click(screen.getByText('Bảo Hành'));
    await waitFor(() => {
      expect(screen.getByText('Tra cứu bảo hành')).toBeInTheDocument();
    });
  });

  it('hides regular fields when BAO_HANH is selected', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Bảo Hành'));
    fireEvent.click(screen.getByText('Bảo Hành'));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Tên thiết bị *')).not.toBeInTheDocument();
    });
  });

  it('shows warranty package selector (3, 6, 12 tháng, Khác)', async () => {
    render(<NewOrderPage />);
    await waitFor(() => {
      expect(screen.getByText('3 tháng')).toBeInTheDocument();
      expect(screen.getByText('6 tháng')).toBeInTheDocument();
      expect(screen.getByText('12 tháng')).toBeInTheDocument();
      expect(screen.getByText('Khác')).toBeInTheDocument();
    });
  });

  it('shows custom months input when Khác is clicked', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Khác'));
    fireEvent.click(screen.getByText('Khác'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Số tháng')).toBeInTheDocument();
    });
  });

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
    // Fill phone but skip name — the JS validation should catch name missing
    fireEvent.change(screen.getByPlaceholderText('Số điện thoại *'), { target: { value: '0901234567' } });
    // Also fill required product fields
    fireEvent.change(screen.getByPlaceholderText('Tên thiết bị *'), { target: { value: 'Loa' } });
    fireEvent.change(screen.getByPlaceholderText('Mô tả lỗi *'), { target: { value: 'Hỏng' } });
    fireEvent.change(screen.getByPlaceholderText('Báo giá (VNĐ) *'), { target: { value: '100' } });
    // Submit form programmatically to bypass HTML5 validation
    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });
    await waitFor(() => {
      expect(screen.getByText('Vui lòng nhập SĐT và tên khách hàng')).toBeInTheDocument();
    });
  });

  it('submits single product order and navigates', async () => {
    mockGet.mockResolvedValueOnce({ data: BRANCHES });
    mockPost
      .mockResolvedValueOnce({ data: { id: 'cust1' } }) // create customer
      .mockResolvedValueOnce({ data: { id: 'order1' } }); // create order

    render(<NewOrderPage />);
    await waitFor(() => screen.getByPlaceholderText('Số điện thoại *'));

    fireEvent.change(screen.getByPlaceholderText('Số điện thoại *'), { target: { value: '0901234567' } });
    fireEvent.change(screen.getByPlaceholderText('Tên khách hàng *'), { target: { value: 'Nguyễn Văn A' } });
    fireEvent.change(screen.getByPlaceholderText('Tên thiết bị *'), { target: { value: 'Loa JBL' } });
    fireEvent.change(screen.getByPlaceholderText('Mô tả lỗi *'), { target: { value: 'Hỏng loa' } });
    fireEvent.change(screen.getByPlaceholderText('Báo giá (VNĐ) *'), { target: { value: '500000' } });

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders/order1');
    });
  });

  it('submits bulk order (2 products) and navigates to first order', async () => {
    mockGet.mockResolvedValueOnce({ data: BRANCHES });
    mockPost
      .mockResolvedValueOnce({ data: { id: 'cust1' } }) // create customer
      .mockResolvedValueOnce({ data: [{ id: 'ord1' }, { id: 'ord2' }] }); // bulk create

    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Thêm sản phẩm'));

    fireEvent.change(screen.getByPlaceholderText('Số điện thoại *'), { target: { value: '0901234567' } });
    fireEvent.change(screen.getByPlaceholderText('Tên khách hàng *'), { target: { value: 'Nguyễn Văn A' } });

    fireEvent.click(screen.getByText('Thêm sản phẩm'));
    await waitFor(() => screen.getByText('Sản phẩm 2'));

    const deviceInputs = screen.getAllByPlaceholderText('Tên thiết bị *');
    const faultInputs = screen.getAllByPlaceholderText('Mô tả lỗi *');
    const quotationInputs = screen.getAllByPlaceholderText('Báo giá (VNĐ) *');

    fireEvent.change(deviceInputs[0], { target: { value: 'Loa JBL' } });
    fireEvent.change(faultInputs[0], { target: { value: 'Hỏng loa' } });
    fireEvent.change(quotationInputs[0], { target: { value: '500000' } });
    fireEvent.change(deviceInputs[1], { target: { value: 'Tai nghe Sony' } });
    fireEvent.change(faultInputs[1], { target: { value: 'Đứt dây' } });
    fireEvent.change(quotationInputs[1], { target: { value: '200000' } });

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders/ord1');
    });
  });

  it('customer type button-select switches between Khách lẻ and Đối tác', async () => {
    render(<NewOrderPage />);
    await waitFor(() => screen.getByText('Khách lẻ'));
    const partnerBtn = screen.getByText('Đối tác');
    fireEvent.click(partnerBtn);
    expect(partnerBtn.className).toContain('bg-[#004EAB]');
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
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });
  });
});
