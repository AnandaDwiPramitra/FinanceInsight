import {
  MonthlySummary,
  PredictionAccountBreakdown,
  PredictionResult,
  Transaction,
} from '../types/finance';
import {
  computeActualSavingsTotal,
  isSavingsTransaction,
  isTransferTransaction,
  resolveTransactionPeriodKey,
} from './calculations';
import { formatMoney, getMonthLabel } from './formatMoney';

function isDayOneFixedExpense(t: Transaction): boolean {
  if (isTransferTransaction(t) || isSavingsTransaction(t)) return false;
  if ((Number(t.keluar) || 0) <= 0) return false;
  const day = parseInt(t.tanggal.slice(8, 10), 10);
  if (day === 1) return true;
  const ket = (t.keterangan || '').toLowerCase();
  return (
    day <= 2 &&
    (ket.includes('kuota') ||
      ket.includes('internet') ||
      ket.includes('skincare') ||
      ket.includes('wifi') ||
      ket.includes('listrik') ||
      ket.includes('kos'))
  );
}

export function computeMonthlySummaries(transactions: Transaction[]): MonthlySummary[] {
  const byMonth = new Map<
    string,
    {
      txs: Transaction[];
      income: number;
      expense: number;
      latestDate: string;
      maxDay: number;
    }
  >();

  transactions.forEach((t) => {
    const key = resolveTransactionPeriodKey(t);
    if (!key) return;
    const current = byMonth.get(key) || {
      txs: [],
      income: 0,
      expense: 0,
      latestDate: t.tanggal,
      maxDay: 0,
    };

    current.txs.push(t);
    if (/^\d{4}-\d{2}-\d{2}$/.test(t.tanggal)) {
      if (!current.latestDate || t.tanggal > current.latestDate) {
        current.latestDate = t.tanggal;
      }
      const dayNum = parseInt(t.tanggal.slice(8, 10), 10) || 0;
      if (dayNum > current.maxDay) current.maxDay = dayNum;
    }

    // Hanya income nyata dan pengeluaran konsumsi nyata (tidak memasukkan transfer/top up/tabungan)
    if (!isTransferTransaction(t) && !isSavingsTransaction(t)) {
      current.income += Number(t.masuk) || 0;
      current.expense += Number(t.keluar) || 0;
    }

    byMonth.set(key, current);
  });

  const sortedEntries = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));

  return sortedEntries.map(([periodKey, info], idx) => {
    const [yStr, mStr] = periodKey.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 30;
    const daysRecorded = info.maxDay > 0 ? Math.min(daysInMonth, info.maxDay) : daysInMonth;
    const isLatestMonth = idx === sortedEntries.length - 1;
    // Bulan terbaru dianggap parsial apabila tanggal transaksi terakhir masih jauh sebelum akhir bulan (misal 16 Nov dari 30 hari)
    const isPartial = isLatestMonth && daysRecorded < daysInMonth - 2;
    const savings = computeActualSavingsTotal(info.txs);

    return {
      periodKey,
      periodLabel: getMonthLabel(periodKey),
      income: info.income,
      expense: info.expense,
      balance: info.income - info.expense,
      savings,
      latestDate: info.latestDate || '-',
      daysRecorded,
      daysInMonth,
      isPartial,
    };
  });
}

export function computeMovingAveragePrediction(
  transactions: Transaction[],
  accountBalances?: Partial<PredictionAccountBreakdown>
): PredictionResult {
  const history = computeMonthlySummaries(transactions);

  const currentAccounts: PredictionAccountBreakdown = {
    cash: accountBalances?.cash ?? 0,
    shopeePay: accountBalances?.shopeePay ?? 0,
    seaBank: accountBalances?.seaBank ?? 0,
    total:
      accountBalances?.total ??
      (accountBalances?.cash ?? 0) +
        (accountBalances?.shopeePay ?? 0) +
        (accountBalances?.seaBank ?? 0),
  };

  const fullMonths = history.filter((m) => !m.isPartial);
  const partialMonths = history.filter((m) => m.isPartial);
  const fullMonthsCount = fullMonths.length;

  if (history.length < 3) {
    return {
      available: false,
      isLimited: true,
      confidenceLevel: 'Rendah',
      confidenceReason: `Baru tersedia ${history.length} periode historis (${fullMonthsCount} bulan penuh). Keyakinan Rendah: minimal 3 bulan penuh diperlukan.`,
      monthsCount: history.length,
      fullMonthsCount,
      history,
      predictedIncome: 0,
      predictedExpense: 0,
      predictedBalance: 0,
      estimatedSavings: 0,
      incomeRange: { min: 0, max: 0 },
      expenseRange: { min: 0, max: 0 },
      balanceRange: { min: 0, max: 0 },
      currentAccounts,
      assumptions: [
        'Dibutuhkan minimal 3 periode bulanan agar Moving Average 3 Bulan dapat dihitung tanpa angka buatan.',
      ],
      note: 'Prediksi belum tersedia. Dibutuhkan minimal 3 periode data historis.',
    };
  }

  const last3 = history.slice(-3);
  const fullInLast3 = last3.filter((m) => !m.isPartial);
  const partialLatest = last3.find((m) => m.isPartial);

  // Gunakan bulan penuh (mis. September & Oktober 2026) sebagai basis utama agar bulan parsial tidak menumpuk/membengkak
  const incomeBasis =
    fullInLast3.length > 0
      ? fullInLast3.map((m) => m.income)
      : last3.map((m) => m.income);

  // Pisahkan pengeluaran tetap awal bulan (tgl 1: Kuota Internet, Skincare, dll.) dari pengeluaran harian saat menganalisis bulan parsial
  let partialFixedExpense = 0;
  let partialVariableExpense = 0;
  let partialAdjustedProjection = 0;

  if (partialLatest) {
    const partialTx = transactions.filter(
      (t) => resolveTransactionPeriodKey(t) === partialLatest.periodKey
    );
    partialTx.forEach((t) => {
      if (isTransferTransaction(t) || isSavingsTransaction(t)) return;
      const amt = Number(t.keluar) || 0;
      if (amt <= 0) return;
      if (isDayOneFixedExpense(t)) {
        partialFixedExpense += amt;
      } else {
        partialVariableExpense += amt;
      }
    });
    const variableDays = Math.max(1, partialLatest.daysRecorded);
    const projectedVariable = Math.round(
      (partialVariableExpense / variableDays) * partialLatest.daysInMonth
    );
    partialAdjustedProjection = partialFixedExpense + projectedVariable;
  }

  // Basis utama pengeluaran menggunakan rata-rata bulan penuh yang tersedia (tanpa ekstrapolasi linear 30/16 pada biaya rutin tgl 1)
  const expenseBasis =
    fullInLast3.length > 0
      ? fullInLast3.map((m) => m.expense)
      : last3.map((m) => m.expense);

  const predictedIncome = Math.round(
    incomeBasis.reduce((s, v) => s + v, 0) / Math.max(1, incomeBasis.length)
  );
  const predictedExpense = Math.round(
    expenseBasis.reduce((s, v) => s + v, 0) / Math.max(1, expenseBasis.length)
  );
  const predictedBalance = predictedIncome - predictedExpense;

  // Estimasi tabungan diambil murni dari rata-rata bulan penuh aktual
  const savingsBasis = fullInLast3.length > 0 ? fullInLast3 : last3;
  const estimatedSavings = Math.round(
    savingsBasis.reduce((s, m) => s + m.savings, 0) / Math.max(1, savingsBasis.length)
  );

  // Skenario rentang atas/bawah membandingkan antar bulan penuh yang sepadan (tidak membandingkan 30 hari vs pemasukan setengah bulan)
  const incomeSamples =
    fullInLast3.length > 0
      ? fullInLast3.map((m) => m.income)
      : last3.map((m) => m.income);
  const expenseSamples =
    fullInLast3.length > 0
      ? fullInLast3.map((m) => m.expense)
      : last3.map((m) => m.expense);

  const incomeMin = incomeSamples.length > 0 ? Math.min(...incomeSamples) : predictedIncome;
  const incomeMax = incomeSamples.length > 0 ? Math.max(...incomeSamples) : predictedIncome;

  const expenseMin = expenseSamples.length > 0 ? Math.min(...expenseSamples) : predictedExpense;
  const expenseMax = expenseSamples.length > 0 ? Math.max(...expenseSamples) : predictedExpense;

  const incomeRange = { min: incomeMin, max: incomeMax };
  const expenseRange = { min: expenseMin, max: expenseMax };
  const balanceRange = {
    min: incomeMin - expenseMax,
    max: incomeMax - expenseMin,
  };

  // Masukkan sisa saldo kas likuid berjalan (Uang Tunai + ShopeePay) sebagai penyangga (buffer)
  const liquidBuffer = currentAccounts.cash + currentAccounts.shopeePay;
  const projectedCashWithBuffer = liquidBuffer + predictedBalance;
  const worstCaseCashWithBuffer = liquidBuffer + balanceRange.min;

  const isLimited = fullMonthsCount < 3 || partialMonths.length > 0;
  const confidenceLevel: PredictionResult['confidenceLevel'] =
    fullMonthsCount >= 3 && partialMonths.length === 0
      ? 'Tinggi'
      : fullMonthsCount >= 2 && partialMonths.length === 0
        ? 'Sedang'
        : 'Rendah';

  const confidenceReason = partialLatest
    ? `Tingkat keyakinan Rendah karena data historis baru memiliki ${fullMonthsCount} bulan penuh (${fullInLast3.map((m) => m.periodLabel).join(', ')}) dan 1 bulan parsial (${partialLatest.periodLabel} tercatat s.d. tanggal ${partialLatest.latestDate}, ${partialLatest.daysRecorded}/${partialLatest.daysInMonth} hari).`
    : fullMonthsCount < 3
      ? `Tingkat keyakinan ${confidenceLevel} karena baru tersedia ${fullMonthsCount} dari minimal 3 bulan penuh.`
      : 'Menggunakan 3 bulan penuh data historis dengan cakupan transaksi lengkap.';

  const fullMonthNames =
    fullInLast3.map((m) => m.periodLabel).join(', ') || last3.map((m) => m.periodLabel).join(', ');

  const assumptions: string[] = [
    `Basis utama pemasukan dan pengeluaran dihitung dari rata-rata bulan penuh yang tersedia (${fullMonthNames}), mengecualikan transfer internal dan setoran tabungan.`,
    partialLatest
      ? `${partialLatest.periodLabel} masih parsial (${partialLatest.daysRecorded}/${partialLatest.daysInMonth} hari, s.d. ${partialLatest.latestDate}) sehingga tidak diekstrapolasi linear (30/${partialLatest.daysRecorded}) agar biaya rutin tanggal 1 (${formatMoney(partialFixedExpense)}) tidak membengkak. Estimasi proporsional harian terpisah sebesar ${formatMoney(partialAdjustedProjection)}.`
      : 'Seluruh periode pada jendela MA 3 bulan merupakan bulan penuh.',
    `Skenario rentang bawah membandingkan pengeluaran maksimum bulan penuh (${formatMoney(expenseMax)}) terhadap pemasukan minimum bulan penuh (${formatMoney(incomeMin)}), bukan terhadap pemasukan bulan parsial.`,
    `Sisa saldo kas likuid berjalan sebesar ${formatMoney(liquidBuffer)} (Uang Tunai ${formatMoney(currentAccounts.cash)} + ShopeePay ${formatMoney(currentAccounts.shopeePay)}) diperhitungkan sebagai penyangga (buffer) terhadap risiko defisit bulanan.`,
    `Estimasi tabungan (${formatMoney(estimatedSavings)}) dihitung dari realisasi tabungan bulan penuh aktual.`,
  ];

  let negativeBalanceReason: string | undefined;
  if (projectedCashWithBuffer < 0) {
    negativeBalanceReason = `Rata-rata pengeluaran konsumsi (${formatMoney(predictedExpense)}) melebihi rata-rata pemasukan (${formatMoney(predictedIncome)}) sebesar ${formatMoney(Math.abs(predictedBalance))}, dan sisa kas likuid berjalan (${formatMoney(liquidBuffer)}) belum mencukupi untuk menutup proyeksi defisit tersebut.`;
  } else if (worstCaseCashWithBuffer < 0) {
    negativeBalanceReason = `Pada skenario rentang bawah (pemasukan ${formatMoney(incomeMin)} vs pengeluaran ${formatMoney(expenseMax)}), potensi defisit bulanan sebesar ${formatMoney(Math.abs(balanceRange.min))} melebihi penyangga saldo kas berjalan (${formatMoney(liquidBuffer)}).`;
  }

  return {
    available: true,
    isLimited,
    confidenceLevel,
    confidenceReason,
    monthsCount: history.length,
    fullMonthsCount,
    history,
    predictedIncome,
    predictedExpense,
    predictedBalance,
    estimatedSavings,
    incomeRange,
    expenseRange,
    balanceRange,
    currentAccounts,
    assumptions,
    negativeBalanceReason,
    note: isLimited
      ? `Keyakinan ${confidenceLevel} (basis ${fullMonthNames}${partialLatest ? `; ${partialLatest.periodLabel} parsial tidak diekstrapolasi linear` : ''}).`
      : 'Prediksi Moving Average 3 Bulan dihitung murni dari pemasukan nyata, pengeluaran konsumsi nyata, dan tabungan aktual.',
  };
}
