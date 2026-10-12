import { useEffect } from 'react';
import { AlertTriangle, Trash2, HelpCircle, X, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <Trash2 className="w-5 h-5 text-red-600" />,
          iconBg: 'bg-red-50 ring-8 ring-red-50/60',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-xs',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          iconBg: 'bg-amber-50 ring-8 ring-amber-50/60',
          confirmButton: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500 shadow-xs',
        };
      default:
        return {
          icon: <HelpCircle className="w-5 h-5 text-blue-600" />,
          iconBg: 'bg-blue-50 ring-8 ring-blue-50/60',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-xs',
        };
    }
  };

  const { icon, iconBg, confirmButton } = getVariantStyles();

  const renderMessage = (content) => {
    if (!content) return null;
    if (typeof content !== 'string') return content;

    const parts = content.split(/(\*\*.*?\*\*|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={idx} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(part)) {
        return (
          <strong key={idx} className="font-bold font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-sm">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => {
          if (!isLoading) onCancel?.();
        }}
      />

      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-md shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
              {icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  {title}
                </h3>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onCancel}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-500 mt-2 leading-relaxed">
                {renderMessage(message)}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer active:scale-[0.99] flex items-center gap-1.5 disabled:opacity-50 ${confirmButton}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
