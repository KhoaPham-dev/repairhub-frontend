'use client';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Xác nhận', onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal card */}
      <div className="relative bg-surface border border-border-subtle rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full scale-100 opacity-100 transition-all duration-150">
        <h2 className="text-base font-semibold text-text-base mb-2">{title}</h2>
        <p className="text-sm text-text-muted mb-6">{message}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full bg-red-600 text-white rounded-full py-3 font-semibold text-sm"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full border border-border-subtle text-text-base bg-surface rounded-full py-3 font-medium text-sm hover:bg-surface-alt"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}
