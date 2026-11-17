export function getJenisBadgeClass(jenis?: string): string {
  const key = String(jenis || '').trim().toLowerCase();
  if (key === 'pemasukan') {
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  }
  if (key === 'kebutuhan') {
    return 'border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-400';
  }
  if (key === 'keinginan') {
    return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400';
  }
  if (key === 'tabungan') {
    return 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-400';
  }
  if (key === 'transfer') {
    return 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400';
  }
  if (key === 'perlu ditinjau') {
    return 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400';
  }
  return 'border-zinc-200 dark:border-white/[0.12] bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300';
}

export function getHealthScoreTextClass(score: number): string {
  if (score >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 55) return 'text-sky-600 dark:text-sky-400';
  if (score >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function getHealthScoreBarClass(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 55) return 'bg-sky-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}
