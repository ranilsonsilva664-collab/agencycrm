import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

function Toast({ toast, onRemove }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const styles: Record<ToastType, string> = {
    success: 'border-emerald-500/40 bg-emerald-500/10',
    error: 'border-red-500/40 bg-red-500/10',
    info: 'border-violet-500/40 bg-violet-500/10',
  };
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />,
    error: <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />,
    info: <Info className="h-5 w-5 text-violet-400 flex-shrink-0" />,
  };

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl shadow-black/40 min-w-[280px] max-w-sm', styles[toast.type])}>
      {icons[toast.type]}
      <span className="text-sm text-white font-medium flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="text-gray-500 hover:text-white transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}
