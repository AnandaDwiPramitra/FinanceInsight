import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { ToastMessage } from '../types/finance';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirmAction = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const handleConfirmChoice = (accepted: boolean) => {
    if (confirmState) {
      confirmState.resolve(accepted);
      setConfirmState(null);
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, confirmAction }}>
      {children}

      {/* Toast stack */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const borderClass =
            t.type === 'success'
              ? 'border-emerald-500/25'
              : t.type === 'error'
                ? 'border-rose-500/25'
                : t.type === 'warning'
                  ? 'border-amber-500/25'
                  : 'border-zinc-200 dark:border-white/[0.08]';

          const Icon =
            t.type === 'success'
              ? CheckCircle2
              : t.type === 'error'
                ? XCircle
                : t.type === 'warning'
                  ? AlertTriangle
                  : Info;

          const iconColor =
            t.type === 'success'
              ? 'text-emerald-600 dark:text-emerald-400/90'
              : t.type === 'error'
                ? 'text-rose-600 dark:text-rose-400/90'
                : t.type === 'warning'
                  ? 'text-amber-600 dark:text-amber-400/90'
                  : 'text-zinc-500 dark:text-zinc-400';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${borderClass} bg-white/95 dark:bg-[#121215]/95 backdrop-blur-md p-3.5 shadow-lg transition-all`}
            >
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA]">{t.title}</p>
                {t.description && (
                  <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Tutup notifikasi"
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation dialog */}
      {confirmState && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-[#FAFAFA]">
              {confirmState.options.title}
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {confirmState.options.message}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => handleConfirmChoice(false)}
                className="min-h-[40px] rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-4 py-2 text-sm font-medium text-zinc-700 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors"
              >
                {confirmState.options.cancelLabel || 'Batal'}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmChoice(true)}
                className={`min-h-[40px] rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                  confirmState.options.destructive
                    ? 'border border-rose-500/30 bg-rose-600/90 text-white hover:bg-rose-600'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200'
                }`}
              >
                {confirmState.options.confirmLabel || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
