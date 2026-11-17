import { OptimizationResult, Transaction } from '../types/finance';
import { buildCategoryExpenseData, computeKpis } from './calculations';
import { formatMoney, getMonthLabel } from './formatMoney';

export const ESSENTIAL_CATEGORY_KEYWORDS = [
  'transportasi',
  'bensin',
  'bbm',
  'pertalite',
  'pertamax',
  'parkir',
  'ongkir',
  'tagihan',
  'utilitas',
  'internet',
  'kuota',
  'pulsa',
  'listrik',
  'air',
  'pdam',
  'sewa',
  'kos',
  'kontrakan',
  'kesehatan',
  'obat',
  'pendidikan',
  'kebutuhan pribadi',
];

export function isEssentialCategory(kategori: string): boolean {
  const lower = (kategori || '').toLowerCase().trim();
  return ESSENTIAL_CATEGORY_KEYWORDS.some((kw) => lower.includes(kw));
}

export function computeOptimization(params: {
  transactions: Transaction[];
  selectedPeriod: string;
  savingsTarget: number;
}): OptimizationResult {
  const { transactions, selectedPeriod, savingsTarget } = params;
  const kpi = computeKpis(transactions);
  const periodLabel = getMonthLabel(selectedPeriod);

  const income = kpi.totalIncome;
  const actualExpense = kpi.consumptionExpense;
  const target = Math.max(0, Number(savingsTarget) || 0);

  const availableForSpending = Math.max(0, income - target);
  const remainingSpendingLimit = availableForSpending - actualExpense;
  const isOverLimit = remainingSpendingLimit < 0;
  const overLimitAmount = isOverLimit ? Math.abs(remainingSpendingLimit) : 0;

  // Hitung sisa hari dalam bulan terpilih atau 30 hari jika Semua Periode
  let totalDaysInPeriod = 30;
  let elapsedDays = 15;

  if (selectedPeriod !== 'all' && /^\d{4}-\d{2}$/.test(selectedPeriod)) {
    const [y, m] = selectedPeriod.split('-').map(Number);
    totalDaysInPeriod = new Date(y, m, 0).getDate();
    const dates = transactions.map((t) => parseInt(t.tanggal.slice(8, 10), 10)).filter((d) => !Number.isNaN(d));
    const maxDay = dates.length > 0 ? Math.max(...dates) : 1;
    elapsedDays = Math.max(1, Math.min(totalDaysInPeriod, maxDay));
  } else {
    const uniqueDates = new Set(transactions.map((t) => t.tanggal)).size;
    elapsedDays = Math.max(1, uniqueDates);
  }

  const remainingDays = Math.max(1, totalDaysInPeriod - elapsedDays);
  const dailySpendingLimit =
    remainingSpendingLimit > 0 ? Math.round(remainingSpendingLimit / remainingDays) : 0;
  const averageDailyExpense = transactions.length > 0 ? Math.round(actualExpense / elapsedDays) : 0;

  const recommendations: OptimizationResult['recommendations'] = [];

  if (transactions.length === 0) {
    recommendations.push({
      title: 'Mulai catat pemasukan dan pengeluaran',
      detail: 'Belum ada data transaksi pada periode ini untuk menghasilkan rekomendasi optimasi.',
      potentialSaving: 0,
      priority: 'Sedang',
    });
  } else {
    if (isOverLimit) {
      recommendations.push({
        title: 'Pengeluaran telah melewati batas rekomendasi',
        detail: `Pengeluaran aktual (${formatMoney(actualExpense)}) melewati batas belanja maksimal (${formatMoney(availableForSpending)}) sebesar ${formatMoney(overLimitAmount)}. Hentikan pengeluaran non-esensial hingga akhir periode.`,
        potentialSaving: overLimitAmount,
        priority: 'Tinggi',
      });
    } else {
      recommendations.push({
        title: 'Pertahankan batas belanja harian',
        detail: `Dengan sisa batas ${formatMoney(remainingSpendingLimit)} untuk ${remainingDays} hari tersisa, jaga pengeluaran harian di bawah ${formatMoney(dailySpendingLimit)} per hari.`,
        potentialSaving: Math.max(0, Math.round((averageDailyExpense - dailySpendingLimit) * remainingDays)),
        priority: dailySpendingLimit < averageDailyExpense ? 'Tinggi' : 'Rendah',
      });
    }

    if (kpi.wantsExpense > 0) {
      const targetCut = Math.round(kpi.wantsExpense * 0.3);
      recommendations.push({
        title: 'Optimasi pos pengeluaran Keinginan',
        detail: `Pengeluaran keinginan saat ini sebesar ${formatMoney(kpi.wantsExpense)} (${kpi.wantsPercentage}%). Memangkas 30% pos keinginan dapat menambah ruang tabungan sebesar ${formatMoney(targetCut)}.`,
        potentialSaving: targetCut,
        priority: kpi.wantsPercentage > 25 ? 'Tinggi' : 'Sedang',
      });
    } else {
      recommendations.push({
        title: 'Pertahankan mode berhemat tanpa pos Keinginan',
        detail:
          'Pengeluaran keinginan tercatat Rp0. Tetap prioritaskan kebutuhan esensial dan jangan menambah alokasi keinginan sebelum target tabungan tercapai.',
        potentialSaving: 0,
        priority: 'Rendah',
      });
    }
    const topCategories = buildCategoryExpenseData(transactions).filter(
      (c) => !['tabungan', 'transfer'].includes(c.kategori.toLowerCase().trim())
    );
    if (topCategories.length > 0) {
      const biggest = topCategories[0];
      const isBiggestEssential = isEssentialCategory(biggest.kategori);

      if (isBiggestEssential) {
        recommendations.push({
          title: `Pos Kebutuhan Primer — ${biggest.kategori}`,
          detail: `${biggest.kategori} merupakan pengeluaran terbesar (${formatMoney(biggest.total)}), namun merupakan pos kebutuhan rutin operasional primer. Pemangkasan drastis tidak disarankan agar tidak mengganggu mobilitas harian. Jaga efisiensi pemakaian secara wajar.`,
          potentialSaving: 0,
          priority: 'Rendah',
        });

        const discretionaryTop = topCategories.find((c) => !isEssentialCategory(c.kategori));
        if (discretionaryTop && discretionaryTop.total > 0) {
          const cut10 = Math.round(discretionaryTop.total * 0.1);
          recommendations.push({
            title: `Evaluasi efisiensi kategori ${discretionaryTop.kategori}`,
            detail: `Sebagai pos pengeluaran diskresioner/fleksibel (${formatMoney(discretionaryTop.total)}), penghematan 10% pada pos ini langsung menyumbang ${formatMoney(cut10)} ke tabungan tanpa mengorbankan kebutuhan pokok.`,
            potentialSaving: cut10,
            priority: 'Sedang',
          });
        }
      } else {
        const cut10 = Math.round(biggest.total * 0.1);
        recommendations.push({
          title: `Evaluasi efisiensi kategori ${biggest.kategori}`,
          detail: `Sebagai kategori pengeluaran terbesar (${formatMoney(biggest.total)}), penghematan 10% pada pos ini langsung menyumbang ${formatMoney(cut10)} ke tabungan.`,
          potentialSaving: cut10,
          priority: 'Sedang',
        });
      }
    }

    if (kpi.balance >= target && target > 0 && kpi.savingsFromTransactions < target) {
      const unallocated = target - kpi.savingsFromTransactions;
      recommendations.push({
        title: 'Segera alokasikan surplus ke pos Tabungan',
        detail: `Sisa saldo periode (${formatMoney(kpi.balance)}) cukup untuk menutup kekurangan target tabungan sebesar ${formatMoney(unallocated)}. Catat transfer setoran tabungan ke SeaBank agar target tercapai.`,
        potentialSaving: unallocated,
        priority: 'Tinggi',
      });
    }
  }

  return {
    periodLabel,
    income,
    actualExpense,
    savingsTarget: target,
    availableForSpending,
    remainingSpendingLimit,
    isOverLimit,
    overLimitAmount,
    remainingDays,
    dailySpendingLimit,
    averageDailyExpense,
    recommendations,
  };
}
