import React, { useState } from 'react';
import { Filter, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney } from '../utils/formatMoney';
import { computeOptimization } from '../utils/optimization';

export const OptimizationPage: React.FC = () => {
  const {
    selectedPeriod,
    setSelectedPeriod,
    availablePeriods,
    filteredTransactions,
    activeSavingsTarget,
  } = useFinance();

  const [customTarget, setCustomTarget] = useState<string>('');
  const effectiveTarget =
    customTarget.trim() !== ''
      ? Math.max(0, Math.round(Number(customTarget) || 0))
      : activeSavingsTarget || 300000;

  const opt = computeOptimization({
    transactions: filteredTransactions,
    selectedPeriod,
    savingsTarget: effectiveTarget,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-[#FAFAFA]">
            Optimasi Keuangan
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Simulasi dan batas pengeluaran preskriptif untuk memastikan target tabungan tercapai
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-3 min-h-[42px] self-start sm:self-auto">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            aria-label="Filter periode optimasi"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-transparent text-sm font-medium text-zinc-900 dark:text-[#FAFAFA] focus:outline-none py-1.5"
          >
            {availablePeriods.map((p) => (
              <option key={p.value} value={p.value} className="bg-white dark:bg-[#121215]">
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Warning Banner if Over Limit */}
      {opt.isOverLimit && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-5 flex items-start gap-3 text-rose-700 dark:text-rose-300/90"
        >
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold">Pengeluaran telah melewati batas rekomendasi.</p>
            <p className="mt-1 text-xs sm:text-sm">
              Total pengeluaran aktual (<span className="font-mono-num tabular-nums">{formatMoney(opt.actualExpense)}</span>) melebihi batas pengeluaran maksimal (<span className="font-mono-num tabular-nums">{formatMoney(opt.availableForSpending)}</span>) sebesar <span className="font-mono-num tabular-nums">{formatMoney(opt.overLimitAmount)}</span>.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Pemasukan Periode</p>
          <p className="font-mono-num tabular-nums text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatMoney(opt.income)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Target Tabungan</p>
          <p className="font-mono-num tabular-nums text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatMoney(opt.savingsTarget)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Batas Pengeluaran Maksimal</p>
          <p className="font-mono-num tabular-nums text-xl font-bold text-sky-600 dark:text-sky-400 mt-1">
            {formatMoney(opt.availableForSpending)}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Batas Pengeluaran Tersisa</p>
          <p
            className={`font-mono-num tabular-nums text-xl font-bold mt-1 ${
              opt.remainingSpendingLimit > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatMoney(Math.max(0, opt.remainingSpendingLimit))}
          </p>
        </div>
      </div>

      {/* Interactive Simulation + Daily Limit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
            <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
              Simulasi Target Tabungan
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ubah nominal target tabungan untuk melihat batas belanja harian yang dibutuhkan pada periode {opt.periodLabel}.
          </p>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
              Simulasi Target Tabungan (Rp)
            </label>
            <input
              type="number"
              min="0"
              value={customTarget !== '' ? customTarget : String(effectiveTarget)}
              onChange={(e) => setCustomTarget(e.target.value)}
              className="font-mono-num tabular-nums w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
            />
          </div>
          <div className="pt-2 border-t border-zinc-100 dark:border-white/[0.08] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Pengeluaran Aktual</span>
              <span className="font-mono-num tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                {formatMoney(opt.actualExpense)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">Rata-rata Harian Aktual</span>
              <span className="font-mono-num tabular-nums font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                {formatMoney(opt.averageDailyExpense)}/hari
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500 dark:text-zinc-400">
                Batas Harian ({opt.remainingDays} hari tersisa)
              </span>
              <span className="font-mono-num tabular-nums font-bold text-sky-600 dark:text-sky-400">
                {formatMoney(opt.dailySpendingLimit)}/hari
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-4">
          <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
            Rekomendasi Optimasi Adaptif
          </h3>
          <div className="divide-y divide-zinc-100 dark:divide-white/[0.08]">
            {opt.recommendations.map((rec, idx) => {
              const priorityBadge =
                rec.priority === 'Tinggi'
                  ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400/90'
                  : rec.priority === 'Sedang'
                    ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300/90'
                    : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400/90';

              return (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${priorityBadge}`}
                    >
                      Prioritas {rec.priority}
                    </span>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-[#FAFAFA]">{rec.title}</h4>
                    <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {rec.detail}
                    </p>
                  </div>
                  {rec.potentialSaving > 0 && (
                    <div className="shrink-0 sm:text-right">
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                        Potensi Hemat
                      </span>
                      <span className="font-mono-num tabular-nums text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(rec.potentialSaving)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
