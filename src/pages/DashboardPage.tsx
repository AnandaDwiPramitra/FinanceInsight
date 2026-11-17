import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Banknote,
  Bot,
  CreditCard,
  Filter,
  ListOrdered,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
} from 'lucide-react';
import { AiResultCard } from '../components/AiModal';
import { DashboardCharts } from '../components/DashboardCharts';
import { ExportDataButton } from '../components/ExportDataButton';
import { ImportModal } from '../components/ImportModal';
import { KpiCard } from '../components/KpiCard';
import { TransactionFormModal } from '../components/TransactionForm';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { AiAnalysisResult } from '../types/finance';
import { formatDateShort, formatMoney, getMonthLabel } from '../utils/formatMoney';
import {
  getHealthScoreBarClass,
  getHealthScoreTextClass,
  getJenisBadgeClass,
} from '../utils/semanticColors';

interface DashboardPageProps {
  onOpenAiModal: () => void;
  latestAiAnalysis: AiAnalysisResult | null;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenAiModal,
  latestAiAnalysis,
}) => {
  const {
    transactions,
    selectedPeriod,
    setSelectedPeriod,
    availablePeriods,
    kpi,
    cashBalance,
    seaBankBalance,
    digitalBalance,
    liquidBalance,
    activeSavingsTarget,
    activeSavingsCollected,
    activeSavingsPercentage,
    filteredTransactions,
    filteredTransactionsWithBalance,
    insights,
    optimization,
    prediction,
    healthScore,
    validationReport,
    lastImportSummary,
    resetAllData,
  } = useFinance();
  const { showToast, confirmAction } = useToast();
  const navigate = useNavigate();

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const recentTransactions = [...filteredTransactionsWithBalance].reverse().slice(0, 6);

  const handleResetAllData = async () => {
    const ok = await confirmAction({
      title: 'Reset semua data?',
      message:
        'Semua transaksi hasil import CSV/XLSX dan data transaksi yang tersimpan di aplikasi akan dihapus. Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Reset Data',
      cancelLabel: 'Batal',
      destructive: true,
    });
    if (ok) {
      resetAllData();
      showToast({ type: 'success', title: 'Semua data berhasil dihapus.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar: Brand Title, Period Filter & Primary Actions */}
      <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-[#FAFAFA]">
            Ringkasan Keuangan & Business Intelligence
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Periode aktif: {getMonthLabel(selectedPeriod)} · <span className="font-mono-num tabular-nums">{kpi.transactionCount}</span> transaksi tercatat
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-3 min-h-[42px]">
            <Filter className="h-4 w-4 text-zinc-500 shrink-0" />
            <select
              aria-label="Filter Periode"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-sm font-medium text-zinc-900 dark:text-[#FAFAFA] focus:outline-none py-1.5"
            >
              {availablePeriods.map((p) => (
                <option key={p.value} value={p.value} className="bg-white dark:bg-[#121215] text-zinc-900 dark:text-[#FAFAFA]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setTxModalOpen(true)}
            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Transaksi</span>
          </button>

          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-3.5 py-2 text-sm font-medium text-zinc-800 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>Import Data</span>
          </button>

          <ExportDataButton
            transactions={filteredTransactions}
            filePrefix={`finance-insight-${selectedPeriod}`}
          />

          <button
            type="button"
            onClick={handleResetAllData}
            disabled={transactions.length === 0}
            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-sm font-medium text-rose-600 dark:text-rose-400/90 hover:bg-rose-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            <span>Reset Data</span>
          </button>
        </div>
      </section>

      {/* Latest Import Summary Strip (Single Compact Line) */}
      {lastImportSummary && transactions.length > 0 && (
        <section className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] px-4 py-2.5 flex items-center justify-between gap-3 text-xs overflow-x-auto">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap min-w-0">
            <span className="font-semibold text-zinc-900 dark:text-[#FAFAFA] truncate max-w-[200px] sm:max-w-xs">
              Import: {lastImportSummary.fileName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num tabular-nums">
              {lastImportSummary.importedCount}/{lastImportSummary.totalRowsRead} baris
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num tabular-nums">
              {formatDateShort(lastImportSummary.earliestDate)} – {formatDateShort(lastImportSummary.latestDate)}
            </span>
            {lastImportSummary.perMonthCounts.length > 0 && (
              <>
                <span aria-hidden="true" className="hidden md:inline">·</span>
                <span className="hidden md:inline font-mono-num tabular-nums">
                  {lastImportSummary.perMonthCounts
                    .map((m) => `${m.periodLabel.split(' ')[0].slice(0, 3)} ${m.count}`)
                    .join(' / ')}
                </span>
              </>
            )}
          </div>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono-num tabular-nums text-[11px] font-medium whitespace-nowrap shrink-0 ${
              validationReport.allPassed
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400/90'
                : 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300/90'
            }`}
          >
            Validasi {validationReport.passedCount}/{validationReport.totalCount}
          </span>
        </section>
      )}

      {/* Empty State Banner if zero transactions */}
      {filteredTransactions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#121215] p-8 text-center">
          <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-[#FAFAFA]">
            Belum ada transaksi.
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Import file XLSX atau CSV atau tambahkan transaksi pertama untuk mulai melihat analisis keuangan.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-5 py-2 text-sm font-semibold transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Import Data</span>
            </button>
            <button
              type="button"
              onClick={() => setTxModalOpen(true)}
              className="min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-4 py-2 text-sm font-medium text-zinc-800 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Transaksi</span>
            </button>
          </div>
        </div>
      )}

      {/* 8 KPI Grid: 2 cols on mobile, 4 cols on xl */}
      <section aria-label="Indikator Kinerja Keuangan" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Uang Masuk"
          value={formatMoney(kpi.totalIncome)}
          subtitle="Pendapatan nyata periode"
          icon={ArrowUp}
          tone="income"
        />
        <KpiCard
          title="Uang Keluar"
          value={formatMoney(kpi.totalExpense)}
          subtitle="Pengeluaran konsumsi periode"
          icon={ArrowDown}
          tone="expense"
        />
        <KpiCard
          title="Sisa Saldo"
          value={formatMoney(liquidBalance)}
          subtitle="Kas likuid aktif (Cash + ShopeePay)"
          icon={Wallet}
          tone="accent"
        />
        <KpiCard
          title="Jumlah Transaksi"
          value={`${kpi.transactionCount}`}
          subtitle={getMonthLabel(selectedPeriod)}
          icon={ListOrdered}
          tone="neutral"
        />
        <KpiCard
          title="Uang Tunai"
          value={formatMoney(cashBalance)}
          subtitle="Akun tunai aktif"
          icon={Wallet}
          tone="accent"
        />
        <KpiCard
          title="Saldo Digital"
          value={formatMoney(digitalBalance)}
          subtitle="Dompet digital aktif (ShopeePay)"
          icon={CreditCard}
          tone="accent"
        />
        <KpiCard
          title="Total Tabungan"
          value={formatMoney(seaBankBalance)}
          subtitle="Akumulasi tabungan kumulatif (SeaBank)"
          icon={Banknote}
          tone="warning"
        />
        <KpiCard
          title="Target Tabungan"
          value={formatMoney(activeSavingsTarget)}
          subtitle={`${activeSavingsPercentage}% tercapai`}
          icon={Target}
          tone="warning"
        />
      </section>

      {/* Financial Health Score + Savings Goal Bar */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
                Financial Health Score
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Dihitung dari saldo, pengendalian belanja, kebutuhan vs keinginan, dan target tabungan
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className={`font-mono-num tabular-nums text-2xl font-bold ${getHealthScoreTextClass(healthScore.score)}`}>
                {healthScore.score}/100
              </span>
              <span className={`block text-xs font-semibold ${getHealthScoreTextClass(healthScore.score)}`}>
                {healthScore.label}
              </span>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${getHealthScoreBarClass(healthScore.score)}`}
              style={{ width: `${healthScore.score}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
            {healthScore.factors.slice(0, 4).map((f) => (
              <div
                key={f.label}
                className="flex items-center justify-between gap-2 text-zinc-500 dark:text-zinc-400"
              >
                <span className="truncate">{f.label}</span>
                <span className="font-mono-num tabular-nums font-semibold text-zinc-900 dark:text-[#FAFAFA] shrink-0">
                  {f.score}/{f.maxScore}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
                Target Tabungan ({getMonthLabel(selectedPeriod)})
              </h3>
              <p className="mt-0.5 font-mono-num tabular-nums text-sm font-semibold text-amber-600 dark:text-amber-400">
                {formatMoney(activeSavingsCollected)}{' '}
                <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                  / {formatMoney(activeSavingsTarget)}
                </span>
              </p>
            </div>
            <Link
              to="/savings"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap shrink-0"
            >
              Kelola Target
            </Link>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-zinc-500 dark:text-zinc-400">Progress Pencapaian</span>
              <span
                className={`font-mono-num tabular-nums ${
                  activeSavingsPercentage >= 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {activeSavingsPercentage}% tercapai
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-zinc-100 dark:bg-white/[0.08] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  activeSavingsPercentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${activeSavingsPercentage}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Alokasi tabungan otomatis dihitung dari transaksi kategori{' '}
            <strong className="text-amber-600 dark:text-amber-400">tabungan</strong> pada periode terkait.
          </p>
        </div>
      </section>

      {/* All 6 Recharts Visualizations */}
      <DashboardCharts />

      {/* Adaptive Insights + Optimization + Prediction Summary */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Adaptive Insights */}
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
                Adaptive Financial Insights
              </h3>
              <Link
                to="/analysis"
                className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-[#FAFAFA] hover:underline whitespace-nowrap"
              >
                Detail BI
              </Link>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-white/[0.08]">
              {insights.slice(0, 3).map((ins) => (
                <div key={ins.id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                    {ins.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {ins.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Optimization Summary */}
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-zinc-500" />
                <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
                  Optimasi Keuangan
                </h3>
              </div>
              <Link
                to="/optimization"
                className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-[#FAFAFA] hover:underline whitespace-nowrap"
              >
                Buka
              </Link>
            </div>

            {optimization.isOverLimit ? (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300/90 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Pengeluaran telah melewati batas rekomendasi sebesar{' '}
                  <span className="font-mono-num tabular-nums font-semibold">
                    {formatMoney(optimization.overLimitAmount)}
                  </span>.
                </span>
              </div>
            ) : (
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Batas Pengeluaran Tersisa
                </p>
                <p className="font-mono-num tabular-nums text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {formatMoney(optimization.remainingSpendingLimit)}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Batas harian disarankan:{' '}
                  <strong className="font-mono-num tabular-nums text-sky-600 dark:text-sky-400">
                    {formatMoney(optimization.dailySpendingLimit)}
                  </strong>{' '}
                  ({optimization.remainingDays} hari tersisa)
                </p>
              </div>
            )}

            {optimization.recommendations[0] && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pt-2 border-t border-zinc-100 dark:border-white/[0.08]">
                {optimization.recommendations[0].detail}
              </p>
            )}
          </div>
        </div>

        {/* Prediction Summary */}
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
                  Prediksi (MA 3 Bulan)
                </h3>
              </div>
              <Link
                to="/prediction"
                className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-[#FAFAFA] hover:underline whitespace-nowrap"
              >
                Detail
              </Link>
            </div>

            {prediction.available ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Prediksi Pemasukan</span>
                  <span className="font-mono-num tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(prediction.predictedIncome)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">Prediksi Pengeluaran</span>
                  <span className="font-mono-num tabular-nums font-semibold text-rose-600 dark:text-rose-400">
                    {formatMoney(prediction.predictedExpense)}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-zinc-100 dark:border-white/[0.08]">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    Proyeksi Saldo
                  </span>
                  <span
                    className={`font-mono-num tabular-nums font-bold ${
                      prediction.predictedBalance >= 0
                        ? 'text-sky-600 dark:text-sky-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatMoney(prediction.predictedBalance)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                  {prediction.note}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-3.5 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-800 dark:text-[#FAFAFA]">
                  Prediksi belum tersedia.
                </p>
                <p>
                  Dibutuhkan minimal 3 periode data historis (saat ini: {prediction.monthsCount}{' '}
                  bulan).
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenAiModal}
            className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors"
          >
            <Bot className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>Tanya AI: Prediksi & Optimasi</span>
          </button>
        </div>
      </section>

      {/* AI Result Card if user ran AI */}
      {latestAiAnalysis && <AiResultCard analysis={latestAiAnalysis} />}

      {/* Recent Transactions */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
              Transaksi Terbaru
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Klik baris transaksi untuk melihat rincian dan saldo kronologis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/transactions"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-[#FAFAFA] hover:underline whitespace-nowrap"
            >
              <span>Lihat Semua Transaksi</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
            Belum ada transaksi pada periode terpilih.
          </p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/[0.08]">
            {recentTransactions.map((tx) => {
              const isIncome = tx.masuk > 0;
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => navigate(`/transactions/${tx.id}`)}
                  className="w-full py-3 flex items-center justify-between gap-4 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.03] px-2 -mx-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA] truncate">
                        {tx.keterangan}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${getJenisBadgeClass(
                          tx.jenisPengeluaran
                        )}`}
                      >
                        {tx.jenisPengeluaran}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {formatDateShort(tx.tanggal)} · {tx.kategori} · {tx.metode} · {tx.akun}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`font-mono-num tabular-nums text-sm font-semibold ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatMoney(isIncome ? tx.masuk : tx.keluar)}
                    </p>
                    <p className="font-mono-num tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
                      Saldo {formatMoney(tx.runningBalance)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <TransactionFormModal isOpen={txModalOpen} onClose={() => setTxModalOpen(false)} />
      <ImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  );
};
