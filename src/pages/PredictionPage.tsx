import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, CheckCircle2, Info, ShieldAlert, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import {
  computeNiceAxisScale,
  formatDateShort,
  formatMoney,
} from '../utils/formatMoney';

interface PredictionTooltipPayloadItem {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

const PredictionTooltip: React.FC<{
  active?: boolean;
  payload?: PredictionTooltipPayloadItem[];
  label?: string | number;
  isDark: boolean;
}> = ({ active, payload, label, isDark }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: isDark ? '#18181B' : '#FFFFFF',
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E4E4E7',
        borderRadius: '12px',
        padding: '10px 12px',
        boxShadow: isDark
          ? '0 10px 25px -5px rgba(0,0,0,0.6)'
          : '0 10px 25px -5px rgba(0,0,0,0.1)',
      }}
      className="min-w-[170px] text-xs"
    >
      {label !== undefined && (
        <p style={{ color: isDark ? '#A1A1AA' : '#52525B' }} className="font-semibold mb-1.5">
          {String(label)}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => {
          const isIncome = String(entry.dataKey) === 'income';
          const valColor = isIncome
            ? isDark
              ? '#34D399'
              : '#059669'
            : isDark
              ? '#FB7185'
              : '#E11D48';

          return (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span
                style={{ color: isDark ? '#A1A1AA' : '#52525B' }}
                className="inline-flex items-center gap-1.5"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color || valColor }}
                />
                <span>{String(entry.name || '')}</span>
              </span>
              <span style={{ color: valColor }} className="font-mono-num tabular-nums font-semibold">
                {formatMoney(Number(entry.value ?? 0))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PredictionPage: React.FC = () => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const { prediction, optimization, kpi } = useFinance();

  const confidenceBadgeClass =
    prediction.confidenceLevel === 'Tinggi'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25'
      : prediction.confidenceLevel === 'Sedang'
        ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25'
        : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/25';

  const historyAxis = computeNiceAxisScale(
    prediction.history.flatMap((m) => [m.income, m.expense])
  );

  const safeRecommendations = optimization.recommendations;

  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(113,113,122,0.16)';
  const axisStroke = isDark ? '#52525B' : '#A1A1AA';
  const axisTickColor = isDark ? '#A1A1AA' : '#52525B';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-[#FAFAFA]">
            Prediksi Keuangan & Rekomendasi (MA 3 Bulan)
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Data Aktual, Prediksi Moving Average, dan Rekomendasi Hemat dipisahkan secara transparan.
          </p>
        </div>

        <span
          className={`inline-flex items-center self-start rounded-lg border px-3 py-1.5 text-xs font-semibold ${confidenceBadgeClass}`}
        >
          Keyakinan Prediksi: {prediction.confidenceLevel}
        </span>
      </div>

      {/* SECTION 1: DATA AKTUAL */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-sky-500 dark:text-sky-400" />
            <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
              1. Data Aktual Historis ({prediction.monthsCount} Periode · {prediction.fullMonthsCount} Bulan Penuh)
            </h3>
          </div>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Fakta transaksi nyata (non-transfer)
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-3.5">
            <span className="text-zinc-500 dark:text-zinc-400 block">Uang Tunai Aktual</span>
            <span className="font-mono-num tabular-nums text-base font-bold text-sky-600 dark:text-sky-400 mt-1 block">
              {formatMoney(prediction.currentAccounts.cash)}
            </span>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-3.5">
            <span className="text-zinc-500 dark:text-zinc-400 block">Saldo ShopeePay Aktual</span>
            <span className="font-mono-num tabular-nums text-base font-bold text-sky-600 dark:text-sky-400 mt-1 block">
              {formatMoney(prediction.currentAccounts.shopeePay)}
            </span>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-3.5">
            <span className="text-zinc-500 dark:text-zinc-400 block">Saldo SeaBank Aktual</span>
            <span className="font-mono-num tabular-nums text-base font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              {formatMoney(prediction.currentAccounts.seaBank)}
            </span>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-3.5">
            <span className="text-zinc-500 dark:text-zinc-400 block">Total Saldo Gabungan</span>
            <span className="font-mono-num tabular-nums text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatMoney(prediction.currentAccounts.total)}
            </span>
          </div>
        </div>

        {prediction.history.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 py-6 text-center">
            Belum ada data historis transaksi.
          </p>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prediction.history} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 11, fill: axisTickColor }} stroke={axisStroke} />
                  <YAxis
                    domain={historyAxis.domain}
                    ticks={historyAxis.ticks}
                    tickFormatter={(v) => formatMoney(Number(v))}
                    tick={{ fontSize: 11, fill: axisTickColor }}
                    stroke={axisStroke}
                    width={92}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)' }}
                    content={<PredictionTooltip isDark={isDark} />}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px', color: axisTickColor }}
                    formatter={(value) => (
                      <span style={{ color: isDark ? '#D4D4D8' : '#3F3F46' }}>{String(value)}</span>
                    )}
                  />
                  <Bar dataKey="income" name="Pemasukan" fill="#10B981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expense" name="Pengeluaran" fill="#F43F5E" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Periode</th>
                    <th className="py-2.5 px-3 font-semibold">Cakupan Data</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Pemasukan</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Pengeluaran</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Saldo</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Setoran Tabungan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
                  {prediction.history.map((m) => (
                    <tr key={m.periodKey} className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-medium text-zinc-900 dark:text-[#FAFAFA]">
                        {m.periodLabel}
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        {m.isPartial ? (
                          <span className="inline-flex items-center rounded-md border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            Parsial s.d. {formatDateShort(m.latestDate)} ({m.daysRecorded}/{m.daysInMonth} hr)
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                            Bulan Penuh
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num tabular-nums text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(m.income)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num tabular-nums text-right font-semibold text-rose-600 dark:text-rose-400">
                        {formatMoney(m.expense)}
                      </td>
                      <td
                        className={`py-2.5 px-3 font-mono-num tabular-nums text-right font-semibold ${
                          m.balance >= 0
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {formatMoney(m.balance)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num tabular-nums text-right font-semibold text-amber-600 dark:text-amber-400">
                        {formatMoney(m.savings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* SECTION 2: PREDIKSI */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
            2. Prediksi Bulan Berikutnya (Moving Average 3 Bulan)
          </h3>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {prediction.note}
          </span>
        </div>

        {!prediction.available ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-500/10 p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
                Prediksi belum tersedia.
              </h4>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {prediction.confidenceReason}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tambahkan atau import transaksi dari minimal 3 periode bulanan untuk menghitung Moving Average 3 Bulan tanpa angka buatan.
              </p>
            </div>
          </div>
        ) : (
          <>
            {prediction.isLimited && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50/70 dark:bg-amber-500/10 p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    Keyakinan {prediction.confidenceLevel} ({prediction.fullMonthsCount}/3 Bulan Penuh)
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-300/90">{prediction.confidenceReason}</p>
                </div>
              </div>
            )}

            {prediction.negativeBalanceReason && (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-500/25 bg-rose-50/70 dark:bg-rose-500/10 p-4 flex items-start gap-3 text-xs sm:text-sm text-rose-900 dark:text-rose-200">
                <ShieldAlert className="h-5 w-5 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Peringatan Proyeksi Saldo Negatif</p>
                  <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300/90">
                    {prediction.negativeBalanceReason}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Prediksi Pemasukan</p>
                <p className="font-mono-num tabular-nums text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                  {formatMoney(prediction.predictedIncome)}
                </p>
                <p className="mt-1.5 font-mono-num tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
                  Rentang: {formatMoney(prediction.incomeRange.min)} – {formatMoney(prediction.incomeRange.max)}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Prediksi Pengeluaran</p>
                <p className="font-mono-num tabular-nums text-xl font-bold text-rose-600 dark:text-rose-400 mt-1.5">
                  {formatMoney(prediction.predictedExpense)}
                </p>
                <p className="mt-1.5 font-mono-num tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
                  Rentang: {formatMoney(prediction.expenseRange.min)} – {formatMoney(prediction.expenseRange.max)}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Prediksi Saldo Bulanan</p>
                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${
                      prediction.predictedBalance >= 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-400'
                    }`}
                  >
                    {prediction.predictedBalance >= 0 ? 'Surplus' : 'Defisit'}
                  </span>
                </div>
                <p
                  className={`font-mono-num tabular-nums text-xl font-bold mt-1.5 ${
                    prediction.predictedBalance >= 0
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatMoney(prediction.predictedBalance)}
                </p>
                <p className="mt-1.5 font-mono-num tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
                  Rentang: {formatMoney(prediction.balanceRange.min)} – {formatMoney(prediction.balanceRange.max)}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Estimasi Tabungan (Bulan Penuh)</p>
                <p className="font-mono-num tabular-nums text-xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">
                  {formatMoney(prediction.estimatedSavings)}
                </p>
                <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  Dari realisasi tabungan bulan penuh
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-2.5">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-sky-500 dark:text-sky-400" />
                <h4 className="font-display text-sm font-bold text-zinc-900 dark:text-[#FAFAFA]">
                  Asumsi & Dasar Perhitungan Prediksi
                </h4>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {prediction.assumptions.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>

      {/* SECTION 3: REKOMENDASI */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
              3. Rekomendasi Pengelolaan (Mode Berhemat)
            </h3>
          </div>
          {kpi.wantsExpense === 0 && (
            <span className="inline-flex items-center rounded-md border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Tanpa alokasi Keinginan — fokus kebutuhan & tabungan
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {safeRecommendations.map((rec, idx) => {
            const priorityClass =
              rec.priority === 'Tinggi'
                ? 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                : rec.priority === 'Sedang'
                  ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                  : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';

            return (
              <div
                key={idx}
                className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-4 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-[#FAFAFA]">
                    {rec.title}
                  </p>
                  <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium shrink-0 ${priorityClass}`}>
                    Prioritas {rec.priority}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {rec.detail}
                </p>
                {rec.potentialSaving > 0 && (
                  <p className="font-mono-num tabular-nums text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Potensi penghematan: {formatMoney(rec.potentialSaving)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
