import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  isEmpty = false,
  emptyMessage = 'Belum ada data transaksi untuk ditampilkan pada grafik ini.',
  children,
}) => {
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 flex flex-col gap-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-zinc-900 dark:text-[#FAFAFA] truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {isEmpty ? (
        <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-6 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">{emptyMessage}</p>
        </div>
      ) : (
        <div className="w-full min-w-0">{children}</div>
      )}
    </section>
  );
};
