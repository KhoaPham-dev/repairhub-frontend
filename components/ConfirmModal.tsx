'use client';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full animate-[fadeScaleIn_150ms_ease-out]">
        <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-600 mb-6">{message}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="w-full bg-red-600 text-white rounded-full py-3 font-semibold text-sm"
          >
            Xác nhận
          </button>
          <button
            onClick={onCancel}
            className="w-full border border-slate-200 text-gray-700 bg-white rounded-full py-3 font-medium text-sm"
          >
            Huỷ
          </button>
        </div>
      </div>
    </div>
  );
}
