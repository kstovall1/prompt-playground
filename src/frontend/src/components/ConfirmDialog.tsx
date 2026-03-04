import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  loading = false,
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const isWarning = variant === 'warning';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onCancel} />

      {/* Centered panel */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-xl shadow-2xl p-6">
        {/* Icon */}
        <div className={`flex items-center justify-center w-10 h-10 rounded-full mb-4 mx-auto ${isWarning ? 'bg-amber-50' : 'bg-red-50'}`}>
          {isWarning
            ? <AlertTriangle className="w-5 h-5 text-amber-500" />
            : <Trash2 className="w-5 h-5 text-databricks-red" />
          }
        </div>

        <h2 className="text-base font-semibold text-gray-900 text-center">{title}</h2>
        <p className="mt-1.5 text-sm text-gray-500 text-center">{message}</p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-databricks-red text-white text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-red-700 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
