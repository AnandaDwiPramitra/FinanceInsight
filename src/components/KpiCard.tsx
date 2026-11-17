import React from 'react';

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'neutral' | 'income' | 'expense' | 'accent' | 'warning';
}

const VALUE_TONE_CLASSES: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'text-zinc-900 dark:text-[#FAFAFA]',
  income: 'text-emerald-600 dark:text-emerald-400',
  expense: 'text-rose-600 dark:text-rose-400',
  accent: 'text-sky-600 dark:text-sky-400',
  warning: 'text-amber-600 dark:text-amber-400',
};

const ICON_TONE_CLASSES: Record<NonNullable<KpiCardProps['tone']>, string> = {
  neutral: 'text-zinc-400 dark:text-zinc-400',
  income: 'text-emerald-500/80 dark:text-emerald-400/80',
  expense: 'text-rose-500/80 dark:text-rose-400/80',
  accent: 'text-sky-500/80 dark:text-sky-400/80',
  warning: 'text-amber-500/80 dark:text-amber-400/80',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'neutral',
}) => {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-4 sm:p-5 flex flex-col justify-between gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 truncate">
          {title}
        </span>
        <Icon className={`h-4 w-4 shrink-0 ${ICON_TONE_CLASSES[tone]}`} />
      </div>
      <div className="min-w-0">
        <p
          className={`font-mono-num tabular-nums text-lg sm:text-xl font-bold tracking-tight truncate ${VALUE_TONE_CLASSES[tone]}`}
        >
          {value}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
