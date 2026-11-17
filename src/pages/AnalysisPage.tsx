import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Filter,
  Info,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { AiResultCard } from '../components/AiModal';
import { useFinance } from '../context/FinanceContext';
import { AiAnalysisResult } from '../types/finance';
import { formatMoney, getMonthLabel } from '../utils/formatMoney';
import { getHealthScoreTextClass } from '../utils/semanticColors';

interface AnalysisPageProps {
  onOpenAiModal: () => void;
  latestAiAnalysis: AiAnalysisResult | null;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  onOpenAiModal,
  latestAiAnalysis,
}) => {
  const {
    selectedPeriod,
    setSelectedPeriod,
    availablePeriods,
    kpi,
    liquidBalance,
    seaBankBalance,
    categoryExpenseData,
    paymentMethodData,
    insights,
    periodComparison,
    optimization,
    prediction,
    healthScore,
  } = useFinance();

  const topCat = categoryExpenseData[0];
  const topMethod = paymentMethodData[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-[#FAFAFA]">
            Business Intelligence Overview
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Kerangka analitik Descriptive, Diagnostic, Predictive, dan Prescriptive dari data aktual Anda
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-3 min-h-[42px]">
            <Filter className="h-4 w-4 text-zinc-500" />
            <select
              aria-label="Filter periode analisis"
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

          <button
            type="button"
            onClick={onOpenAiModal}
            className="min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors whitespace-nowrap"
          >
            <Bot className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>Tanya AI</span>
          </button>
        </div>
      </div>

      {/* 4 Pillars of Business Intelligence */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-zinc-500" />
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-[#FAFAFA]">
              01. Descriptive Analytics
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Ringkasan kondisi aktual pada periode {getMonthLabel(selectedPeriod)}.
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            Tercatat <strong className="font-mono-num tabular-nums text-zinc-900 dark:text-[#FAFAFA]">{kpi.transactionCount}</strong> transaksi dengan pemasukan{' '}
            <strong className="font-mono-num tabular-nums text-emerald-600 dark:text-emerald-400">{formatMoney(kpi.totalIncome)}</strong>, pengeluaran{' '}
            <strong className="font-mono-num tabular-nums text-rose-600 dark:text-rose-400">{formatMoney(kpi.totalExpense)}</strong>, sisa kas likuid{' '}
            <strong className="font-mono-num tabular-nums text-sky-600 dark:text-sky-400">{formatMoney(liquidBalance)}</strong>, dan tabungan SeaBank{' '}
            <strong className="font-mono-num tabular-nums text-amber-600 dark:text-amber-400">{formatMoney(seaBankBalance)}</strong>.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-sky-500 dark:text-sky-400" />
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-[#FAFAFA]">
              02. Diagnostic Analytics
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Identifikasi pendorong utama pengeluaran, struktur kebutuhan/keinginan, dan metode bayar.
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {topCat
              ? `Pos pengeluaran terbesar adalah ${topCat.kategori} (${formatMoney(topCat.total)}). `
              : 'Belum ada pengeluaran tercatat. '}
            Proporsi{' '}
            <strong className="text-teal-600 dark:text-teal-400">Kebutuhan {kpi.needsPercentage}%</strong> vs{' '}
            <strong className="text-amber-600 dark:text-amber-400">Keinginan {kpi.wantsPercentage}%</strong>
            {kpi.reviewExpense > 0 ? ` · Perlu Ditinjau ${kpi.reviewPercentage}%` : ''}
            {topMethod ? `, didominasi metode ${topMethod.name}.` : '.'}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-zinc-500" />
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-[#FAFAFA]">
              03. Predictive Analytics
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Estimasi periode berikutnya dengan Moving Average 3 Bulan.
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {prediction.available
              ? `Proyeksi bulan berikutnya: Pemasukan ${formatMoney(prediction.predictedIncome)}, Pengeluaran ${formatMoney(prediction.predictedExpense)}, dan Saldo ${formatMoney(prediction.predictedBalance)}.`
              : `Prediksi belum tersedia (${prediction.monthsCount}/3 periode data historis). Dibutuhkan minimal 3 periode data historis.`}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-[#FAFAFA]">
              04. Prescriptive Analytics
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Rekomendasi batas belanja untuk mencapai target tabungan.
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {optimization.isOverLimit
              ? `Pengeluaran melewati batas rekomendasi sebesar ${formatMoney(optimization.overLimitAmount)}. Fokus hentikan belanja non-esensial.`
              : `Sisa batas belanja aman ${formatMoney(optimization.remainingSpendingLimit)} atau maksimal ${formatMoney(optimization.dailySpendingLimit)} per hari untuk ${optimization.remainingDays} hari tersisa.`}
          </p>
        </div>
      </section>

      {/* Period Over Period Comparison */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-3">
        <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
          Perbandingan Antar Periode
        </h3>
        {periodComparison.hasPrevious ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Perubahan Pengeluaran ({periodComparison.previousLabel} ke {periodComparison.currentLabel})
              </p>
              <p
                className={`font-mono-num tabular-nums text-lg font-bold mt-1 ${
                  periodComparison.expenseChangePct === null || periodComparison.expenseChangePct === 0
                    ? 'text-zinc-900 dark:text-[#FAFAFA]'
                    : periodComparison.expenseChangePct > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {periodComparison.expenseChangePct !== null
                  ? periodComparison.expenseChangePct > 0
                    ? `Naik ${periodComparison.expenseChangePct}%`
                    : periodComparison.expenseChangePct < 0
                      ? `Turun ${Math.abs(periodComparison.expenseChangePct)}%`
                      : 'Tetap 0%'
                  : 'Tidak dapat dibandingkan (periode sebelumnya 0)'}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Perubahan Pemasukan ({periodComparison.previousLabel} ke {periodComparison.currentLabel})
              </p>
              <p
                className={`font-mono-num tabular-nums text-lg font-bold mt-1 ${
                  periodComparison.incomeChangePct === null || periodComparison.incomeChangePct === 0
                    ? 'text-zinc-900 dark:text-[#FAFAFA]'
                    : periodComparison.incomeChangePct > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {periodComparison.incomeChangePct !== null
                  ? periodComparison.incomeChangePct > 0
                    ? `Naik ${periodComparison.incomeChangePct}%`
                    : periodComparison.incomeChangePct < 0
                      ? `Turun ${Math.abs(periodComparison.incomeChangePct)}%`
                      : 'Tetap 0%'
                  : 'Tidak dapat dibandingkan (periode sebelumnya 0)'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Periode pembanding sebelumnya belum memiliki data transaksi sehingga persentase perubahan tidak ditampilkan.
          </p>
        )}
      </section>

      {/* Adaptive Rule-Based Insights */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-4">
        <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
          Insight Dinamis (Rule-Based Engine)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {insights.map((ins) => {
            const Icon =
              ins.type === 'success'
                ? CheckCircle2
                : ins.type === 'warning' || ins.type === 'danger'
                  ? AlertTriangle
                  : Info;
            const iconClass =
              ins.type === 'success'
                ? 'text-emerald-600 dark:text-emerald-400/90'
                : ins.type === 'danger'
                  ? 'text-rose-600 dark:text-rose-400/90'
                  : ins.type === 'warning'
                    ? 'text-amber-600 dark:text-amber-400/90'
                    : 'text-zinc-500 dark:text-zinc-400';

            return (
              <div
                key={ins.id}
                className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-4 flex items-start gap-3"
              >
                <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconClass}`} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {ins.category}
                  </p>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-[#FAFAFA] mt-0.5">
                    {ins.title}
                  </h4>
                  <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {ins.message}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Financial Health Score Breakdown */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
            Rincian Financial Health Score (
            <span className={`font-mono-num tabular-nums ${getHealthScoreTextClass(healthScore.score)}`}>
              {healthScore.score}/100 · {healthScore.label}
            </span>
            )
          </h3>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-white/[0.08]">
          {healthScore.factors.map((f) => (
            <div key={f.label} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA]">{f.label}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{f.detail}</p>
              </div>
              <span className="font-mono-num tabular-nums text-sm font-bold text-zinc-900 dark:text-[#FAFAFA] shrink-0">
                {f.score} / {f.maxScore}
              </span>
            </div>
          ))}
        </div>
      </section>

      {latestAiAnalysis && <AiResultCard analysis={latestAiAnalysis} />}
    </div>
  );
};
