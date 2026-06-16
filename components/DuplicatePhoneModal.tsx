'use client';

interface DuplicatePhoneModalProps {
  open: boolean;
  phone?: string;
  onUpdate: () => void;
  onClose: () => void;
}

export default function DuplicatePhoneModal({ open, phone, onUpdate, onClose }: DuplicatePhoneModalProps) {
  if (!open) return null;

  const message = phone
    ? `Khách hàng với số điện thoại ${phone} đã tồn tại. Bạn có muốn cập nhật thông tin khách hàng này không?`
    : 'Khách hàng với số điện thoại này đã tồn tại. Bạn có muốn cập nhật thông tin khách hàng này không?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative bg-surface border border-border-subtle rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 scale-100 opacity-100 transition-all duration-150">
        <h2 className="text-base font-semibold text-text-base mb-2">Số điện thoại đã tồn tại</h2>
        <p className="text-sm text-text-muted mb-6">{message}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onUpdate}
            className="w-full bg-accent text-[#0B0B0B] rounded-full py-3 font-semibold text-sm"
          >
            Cập nhật thông tin
          </button>
          <button
            onClick={onClose}
            className="w-full border border-border-subtle text-text-base bg-surface rounded-full py-3 font-medium text-sm hover:bg-surface-alt"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
