import { InsightItem, Transaction } from '../types/finance';
import {
  buildCategoryExpenseData,
  buildPaymentMethodData,
  computeKpis,
  filterTransactionsByPeriod,
} from './calculations';
import { formatMoney, getMonthKey, getMonthLabel } from './formatMoney';
import { isEssentialCategory } from './optimization';

export interface PeriodComparison {
  hasPrevious: boolean;
  currentLabel: string;
  previousLabel: string;
  expenseChangePct: number | null;
  incomeChangePct: number | null;
  previousExpense: number;
  previousIncome: number;
}

export function computePeriodComparison(
  allTransactions: Transaction[],
  selectedPeriod: string
): PeriodComparison {
  if (selectedPeriod === 'all') {
    const months = Array.from(
      new Set(allTransactions.map((t) => getMonthKey(t.tanggal)).filter(Boolean))
    ).sort();
    if (months.length < 2) {
      return {
        hasPrevious: false,
        currentLabel: 'Semua Periode',
        previousLabel: '-',
        expenseChangePct: null,
        incomeChangePct: null,
        previousExpense: 0,
        previousIncome: 0,
      };
    }
    const currKey = months[months.length - 1];
    const prevKey = months[months.length - 2];
    const currKpi = computeKpis(filterTransactionsByPeriod(allTransactions, currKey));
    const prevKpi = computeKpis(filterTransactionsByPeriod(allTransactions, prevKey));

    return {
      hasPrevious: true,
      currentLabel: getMonthLabel(currKey),
      previousLabel: getMonthLabel(prevKey),
      expenseChangePct:
        prevKpi.totalExpense > 0
          ? Math.round(((currKpi.totalExpense - prevKpi.totalExpense) / prevKpi.totalExpense) * 1000) / 10
          : null,
      incomeChangePct:
        prevKpi.totalIncome > 0
          ? Math.round(((currKpi.totalIncome - prevKpi.totalIncome) / prevKpi.totalIncome) * 1000) / 10
          : null,
      previousExpense: prevKpi.totalExpense,
      previousIncome: prevKpi.totalIncome,
    };
  }

  const [yStr, mStr] = selectedPeriod.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (!y || !m) {
    return {
      hasPrevious: false,
      currentLabel: selectedPeriod,
      previousLabel: '-',
      expenseChangePct: null,
      incomeChangePct: null,
      previousExpense: 0,
      previousIncome: 0,
    };
  }

  const prevDate = new Date(y, m - 2, 1);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const prevTx = filterTransactionsByPeriod(allTransactions, prevKey);
  if (prevTx.length === 0) {
    return {
      hasPrevious: false,
      currentLabel: getMonthLabel(selectedPeriod),
      previousLabel: getMonthLabel(prevKey),
      expenseChangePct: null,
      incomeChangePct: null,
      previousExpense: 0,
      previousIncome: 0,
    };
  }

  const currKpi = computeKpis(filterTransactionsByPeriod(allTransactions, selectedPeriod));
  const prevKpi = computeKpis(prevTx);

  return {
    hasPrevious: true,
    currentLabel: getMonthLabel(selectedPeriod),
    previousLabel: getMonthLabel(prevKey),
    expenseChangePct:
      prevKpi.totalExpense > 0
        ? Math.round(((currKpi.totalExpense - prevKpi.totalExpense) / prevKpi.totalExpense) * 1000) / 10
        : null,
    incomeChangePct:
      prevKpi.totalIncome > 0
        ? Math.round(((currKpi.totalIncome - prevKpi.totalIncome) / prevKpi.totalIncome) * 1000) / 10
        : null,
    previousExpense: prevKpi.totalExpense,
    previousIncome: prevKpi.totalIncome,
  };
}

export function generateFinancialInsights(params: {
  filteredTransactions: Transaction[];
  allTransactions: Transaction[];
  selectedPeriod: string;
  savingsTarget: number;
  savingsCollected: number;
  cashBalance: number;
  digitalBalance: number;
}): InsightItem[] {
  const {
    filteredTransactions,
    allTransactions,
    selectedPeriod,
    savingsTarget,
    savingsCollected,
    cashBalance,
    digitalBalance,
  } = params;

  if (filteredTransactions.length === 0) {
    return [
      {
        id: 'empty-insight',
        type: 'info',
        category: 'Data',
        title: 'Belum ada transaksi pada periode ini',
        message: 'Tambahkan transaksi atau pilih periode lain untuk melihat analisis adaptif.',
      },
    ];
  }

  const insights: InsightItem[] = [];
  const kpi = computeKpis(filteredTransactions);
  const categories = buildCategoryExpenseData(filteredTransactions);
  const methods = buildPaymentMethodData(filteredTransactions);
  const comparison = computePeriodComparison(allTransactions, selectedPeriod);

  // 1. Kategori Pengeluaran Terbesar
  if (categories.length > 0) {
    const top = categories[0];
    const expBase = kpi.consumptionExpense > 0 ? kpi.consumptionExpense : kpi.totalExpense;
    const pct = expBase > 0 ? Math.round((top.total / expBase) * 1000) / 10 : 0;
    const isEssential = isEssentialCategory(top.kategori);

    if (isEssential) {
      insights.push({
        id: 'top-category',
        type: 'info',
        category: 'Kategori Terbesar',
        title: `Pengeluaran terbesar berasal dari kebutuhan primer ${top.kategori}`,
        message: `Total alokasi kategori ${top.kategori} sebesar ${formatMoney(top.total)} (${pct}% dari total pengeluaran konsumsi). Ini merupakan pos kebutuhan rutin operasional harian yang stabil.`,
      });
    } else {
      insights.push({
        id: 'top-category',
        type: pct > 35 ? 'warning' : 'info',
        category: 'Kategori Terbesar',
        title: `Pengeluaran terbesar berasal dari kategori ${top.kategori}`,
        message: `Total pengeluaran kategori ${top.kategori} mencapai ${formatMoney(top.total)} (${pct}% dari total pengeluaran konsumsi periode ini).`,
      });
    }
  }

  // 2. Tren Perbandingan Periode Sebelumnya (hanya jika data pembanding tersedia)
  if (comparison.hasPrevious && comparison.expenseChangePct !== null) {
    if (comparison.expenseChangePct > 0) {
      insights.push({
        id: 'expense-trend-up',
        type: 'warning',
        category: 'Tren Pengeluaran',
        title: `Pengeluaran naik ${comparison.expenseChangePct}% dibanding ${comparison.previousLabel}`,
        message: `Pengeluaran pada ${comparison.currentLabel} (${formatMoney(kpi.totalExpense)}) lebih tinggi dibanding ${comparison.previousLabel} (${formatMoney(comparison.previousExpense)}).`,
      });
    } else if (comparison.expenseChangePct < 0) {
      insights.push({
        id: 'expense-trend-down',
        type: 'success',
        category: 'Tren Pengeluaran',
        title: `Pengeluaran turun ${Math.abs(comparison.expenseChangePct)}% dibanding ${comparison.previousLabel}`,
        message: `Efisiensi pengeluaran membaik dibanding periode ${comparison.previousLabel} (${formatMoney(comparison.previousExpense)}).`,
      });
    }
  }

  if (comparison.hasPrevious && comparison.incomeChangePct !== null) {
    if (comparison.incomeChangePct !== 0) {
      insights.push({
        id: 'income-trend',
        type: comparison.incomeChangePct >= 0 ? 'success' : 'warning',
        category: 'Tren Pemasukan',
        title:
          comparison.incomeChangePct >= 0
            ? `Pemasukan naik ${comparison.incomeChangePct}%`
            : `Pemasukan turun ${Math.abs(comparison.incomeChangePct)}%`,
        message: `Perubahan pemasukan tercatat dibandingkan ${comparison.previousLabel} (${formatMoney(comparison.previousIncome)}).`,
      });
    }
  }

  // 3. Kebutuhan vs Keinginan
  if (kpi.consumptionExpense > 0) {
    const reviewNote =
      kpi.reviewExpense > 0
        ? ` Terdapat ${kpi.reviewPercentage}% (${formatMoney(kpi.reviewExpense)}) berstatus Perlu Ditinjau.`
        : '';
    if (kpi.wantsPercentage > 30) {
      insights.push({
        id: 'wants-high',
        type: 'warning',
        category: 'Kebutuhan vs Keinginan',
        title: `Proporsi keinginan mencapai ${kpi.wantsPercentage}%`,
        message: `Proporsi pengeluaran keinginan (${formatMoney(kpi.wantsExpense)}) cukup tinggi dan dapat dikurangi untuk meningkatkan ruang tabungan.${reviewNote}`,
      });
    } else {
      insights.push({
        id: 'needs-dominant',
        type: 'success',
        category: 'Kebutuhan vs Keinginan',
        title: `Pengeluaran kebutuhan mendominasi (${kpi.needsPercentage}%)`,
        message: `Alokasi pengeluaran kebutuhan sebesar ${formatMoney(kpi.needsExpense)}, sedangkan keinginan terkendali pada ${kpi.wantsPercentage}% (${formatMoney(kpi.wantsExpense)}).${reviewNote}`,
      });
    }
  }

  // 4. Saldo & Arus Kas
  if (kpi.balance < 0) {
    insights.push({
      id: 'negative-balance',
      type: 'danger',
      category: 'Arus Kas',
      title: 'Defisit arus kas pada periode ini',
      message: `Pengeluaran (${formatMoney(kpi.totalExpense)}) melebihi pemasukan (${formatMoney(kpi.totalIncome)}) sebesar ${formatMoney(Math.abs(kpi.balance))}.`,
    });
  } else if (kpi.totalIncome > 0) {
    const surplusRatio = Math.round((kpi.balance / kpi.totalIncome) * 1000) / 10;
    insights.push({
      id: 'positive-balance',
      type: 'success',
      category: 'Arus Kas',
      title: `Sisa saldo periode positif (${formatMoney(kpi.balance)})`,
      message: `Anda mempertahankan ${surplusRatio}% dari total pemasukan sebagai surplus periode.`,
    });
  }

  // 5. Pencapaian Target Tabungan
  if (savingsTarget > 0) {
    if (savingsCollected >= savingsTarget) {
      insights.push({
        id: 'savings-met',
        type: 'success',
        category: 'Target Tabungan',
        title: 'Target tabungan periode tercapai',
        message: `Dana tabungan terkumpul ${formatMoney(savingsCollected)} dari target ${formatMoney(savingsTarget)}.`,
      });
    } else {
      const gap = savingsTarget - savingsCollected;
      insights.push({
        id: 'savings-gap',
        type: 'warning',
        category: 'Target Tabungan',
        title: 'Pencapaian tabungan masih berada di bawah target',
        message: `Terkumpul ${formatMoney(savingsCollected)} dari target ${formatMoney(savingsTarget)}. Dibutuhkan tambahan ${formatMoney(gap)} untuk memenuhi target.`,
      });
    }
  }

  // 6. Dominasi Metode Pembayaran & Cash vs Digital
  if (methods.length > 0) {
    const dom = methods[0];
    const totalVol = methods.reduce((s, m) => s + m.value, 0);
    const pct = totalVol > 0 ? Math.round((dom.value / totalVol) * 1000) / 10 : 0;
    insights.push({
      id: 'payment-method',
      type: 'info',
      category: 'Metode Pembayaran',
      title: `Metode ${dom.name.toUpperCase()} paling dominan (${pct}%)`,
      message: `Volume transaksi melalui ${dom.name} mencapai ${formatMoney(dom.value)}.`,
    });
  }

  const totalAccountBal = cashBalance + digitalBalance;
  if (totalAccountBal > 0) {
    const digitalShare = Math.round((digitalBalance / totalAccountBal) * 1000) / 10;
    insights.push({
      id: 'cash-digital',
      type: 'info',
      category: 'Likuiditas Akun',
      title: `${digitalShare}% kas likuid tersimpan di dompet digital`,
      message: `Uang Tunai ${formatMoney(cashBalance)} dan Saldo Digital (ShopeePay) ${formatMoney(digitalBalance)}.`,
    });
  }

  return insights;
}
