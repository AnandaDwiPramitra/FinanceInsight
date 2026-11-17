import {
  Account,
  AccountWithBalance,
  HealthScoreFactor,
  HealthScoreResult,
  PeriodOption,
  SavingsGoal,
  SavingsGoalProgress,
  Transaction,
  TransactionWithBalance,
} from '../types/finance';
import {
  formatMoney,
  getMonthKey,
  getMonthLabel,
  parseBulanToPeriodKey,
} from './formatMoney';

export function isTransferTransaction(
  t: Pick<Transaction, 'kategori' | 'jenisPengeluaran' | 'keterangan'>
): boolean {
  const kat = (t.kategori || '').toLowerCase().trim();
  const jenis = String(t.jenisPengeluaran || '').toLowerCase().trim();
  const ket = (t.keterangan || '').toLowerCase().trim();
  return kat === 'transfer' || jenis === 'transfer' || ket.includes('top up shopeepay');
}

export function isSavingsTransaction(
  t: Pick<Transaction, 'kategori' | 'jenisPengeluaran' | 'keterangan'>
): boolean {
  const kat = (t.kategori || '').toLowerCase().trim();
  const jenis = String(t.jenisPengeluaran || '').toLowerCase().trim();
  const ket = (t.keterangan || '').toLowerCase().trim();
  return (
    kat === 'tabungan' ||
    jenis === 'tabungan' ||
    ket.includes('tabungan seabank') ||
    ket.includes('setor tabungan')
  );
}

export function isSeaBankSavingsTransaction(
  t: Pick<Transaction, 'kategori' | 'jenisPengeluaran' | 'keterangan' | 'akun'>
): boolean {
  const akun = (t.akun || '').toLowerCase().replace(/\s+/g, '');
  const ket = (t.keterangan || '').toLowerCase();
  return isSavingsTransaction(t) && (akun === 'seabank' || ket.includes('seabank') || ket.includes('sea bank'));
}

export function isOpeningBalanceTransaction(
  t: Pick<Transaction, 'keterangan' | 'kategori'>
): boolean {
  const ket = (t.keterangan || '').toLowerCase().trim();
  const kat = (t.kategori || '').toLowerCase().trim();
  return (
    ket.includes('saldo awal') ||
    kat === 'saldo awal' ||
    ket.startsWith('saldo_awal')
  );
}

function getChronologicalSortRank(t: Transaction): number {
  if (isOpeningBalanceTransaction(t)) return 0;
  if (!isTransferTransaction(t) && !isSavingsTransaction(t) && (Number(t.masuk) || 0) > 0 && (Number(t.keluar) || 0) === 0) {
    return 1;
  }
  if (!isSavingsTransaction(t)) return 2;
  return 3;
}

export function sortTransactionsChronological(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    const rankDiff = getChronologicalSortRank(a) - getChronologicalSortRank(b);
    if (rankDiff !== 0) return rankDiff;
    if (isOpeningBalanceTransaction(a) && isOpeningBalanceTransaction(b)) {
      const aCash = (a.akun || '').toLowerCase().trim() === 'cash' ? 0 : 1;
      const bCash = (b.akun || '').toLowerCase().trim() === 'cash' ? 0 : 1;
      if (aCash !== bCash) return aCash - bCash;
    }
    return a.id - b.id;
  });
}

interface TxAccountDelta {
  cashDelta: number;
  shopeePayDelta: number;
  seaBankDelta: number;
  otherAccountKey?: string;
  otherDelta: number;
  kasDelta: number;
}

function buildPerTransactionAccountDeltas(transactions: Transaction[]): Map<number, TxAccountDelta> {
  const result = new Map<number, TxAccountDelta>();
  const transferIdGroups = new Map<string, Transaction[]>();
  transactions.forEach((t) => {
    if (t.transferId) {
      const arr = transferIdGroups.get(t.transferId) || [];
      arr.push(t);
      transferIdGroups.set(t.transferId, arr);
    }
  });

  // Fallback pairing pools untuk transaksi lama tanpa transferId
  const transferInPool = new Map<string, number>();
  const transferOutPool = new Map<string, number>();
  const savingsCashOutPool = new Map<string, number>();
  const savingsSeaBankPool = new Map<string, number>();

  transactions.forEach((t) => {
    if (t.transferId) return;
    const akunKey = (t.akun || '').toLowerCase().replace(/\s+/g, '');
    const masuk = Number(t.masuk) || 0;
    const keluar = Number(t.keluar) || 0;

    if (isTransferTransaction(t)) {
      if (akunKey === 'shopeepay' && masuk > 0 && keluar === 0) {
        const k = `${t.tanggal}|${masuk}`;
        transferInPool.set(k, (transferInPool.get(k) || 0) + 1);
      } else if (akunKey === 'cash' && keluar > 0 && masuk === 0) {
        const k = `${t.tanggal}|${keluar}`;
        transferOutPool.set(k, (transferOutPool.get(k) || 0) + 1);
      }
    } else if (isSavingsTransaction(t)) {
      const amt = keluar > 0 ? keluar : masuk;
      if (amt > 0) {
        if (akunKey === 'cash' && keluar > 0) {
          const k = `${t.tanggal}|${amt}`;
          savingsCashOutPool.set(k, (savingsCashOutPool.get(k) || 0) + 1);
        } else if (akunKey === 'seabank') {
          const k = `${t.tanggal}|${amt}`;
          savingsSeaBankPool.set(k, (savingsSeaBankPool.get(k) || 0) + 1);
        }
      }
    }
  });

  const remainingTransferInForCash = new Map(transferInPool);
  const remainingTransferOutForShopee = new Map(transferOutPool);
  const remainingSavingsCashOut = new Map(savingsCashOutPool);
  const remainingSavingsSeaBank = new Map(savingsSeaBankPool);

  transactions.forEach((t) => {
    const masuk = Number(t.masuk) || 0;
    const keluar = Number(t.keluar) || 0;
    const akunRaw = (t.akun || '').trim();
    const akunKey = akunRaw.toLowerCase().trim();
    const akunCompact = akunKey.replace(/\s+/g, '');
    const ketLower = (t.keterangan || '').toLowerCase();

    const applySingle = (
      cashDelta: number,
      shopeePayDelta: number,
      seaBankDelta: number,
      otherAccountKey?: string,
      otherDelta = 0
    ) => {
      result.set(t.id, {
        cashDelta,
        shopeePayDelta,
        seaBankDelta,
        otherAccountKey,
        otherDelta,
        kasDelta: cashDelta + shopeePayDelta + otherDelta,
      });
    };

    // 1. Jika memiliki pasangan transferId yang lengkap (>= 2 baris), terapkan langsung ke akun masing-masing
    if (t.transferId) {
      const group = transferIdGroups.get(t.transferId) || [];
      if (group.length >= 2) {
        const net = masuk - keluar;
        if (akunCompact === 'cash' || akunCompact === 'tunai' || !akunCompact) {
          applySingle(net, 0, 0);
        } else if (akunCompact === 'shopeepay') {
          applySingle(0, net, 0);
        } else if (akunCompact === 'seabank') {
          applySingle(0, 0, net);
        } else {
          applySingle(0, 0, 0, akunKey, net);
        }
        return;
      }
    }

    // 2. Transaksi Transfer (mis. Top Up ShopeePay via Indomaret)
    if (isTransferTransaction(t)) {
      if (akunCompact === 'cash' && keluar > 0 && masuk === 0) {
        const key = `${t.tanggal}|${keluar}`;
        const pairedIn = remainingTransferInForCash.get(key) || 0;
        if (pairedIn > 0) {
          remainingTransferInForCash.set(key, pairedIn - 1);
          applySingle(-keluar, 0, 0);
        } else {
          // Single-row transfer: kurangi Cash, tambah ShopeePay
          applySingle(-keluar, keluar, 0);
        }
        return;
      }

      if (akunCompact === 'cash' && masuk > 0 && keluar === 0) {
        applySingle(masuk, -masuk, 0);
        return;
      }

      if (akunCompact === 'shopeepay' && masuk > 0 && keluar === 0) {
        const key = `${t.tanggal}|${masuk}`;
        const pairedOut = remainingTransferOutForShopee.get(key) || 0;
        if (pairedOut > 0) {
          remainingTransferOutForShopee.set(key, pairedOut - 1);
          applySingle(0, masuk, 0);
        } else {
          // Single-row transfer: tambah ShopeePay, kurangi Cash
          applySingle(-masuk, masuk, 0);
        }
        return;
      }

      if (akunCompact === 'shopeepay' && keluar > 0 && masuk === 0) {
        // Jika keterangan jelas menyebut Top Up ShopeePay (single-row yang kolom akunnya ditulis ShopeePay),
        // perlakukan tetap sebagai perpindahan Cash -> ShopeePay
        if (ketLower.includes('top up') && ketLower.includes('shopee')) {
          applySingle(-keluar, keluar, 0);
        } else {
          applySingle(keluar, -keluar, 0);
        }
        return;
      }

      // Transfer lain tanpa pasangan tetap netral terhadap kas jika bukan Cash/ShopeePay
      applySingle(0, 0, 0);
      return;
    }

    // 3. Transaksi Tabungan (Setor ke SeaBank)
    if (isSavingsTransaction(t)) {
      const amt = keluar > 0 ? keluar : masuk;
      if (amt > 0) {
        if (akunCompact === 'seabank') {
          const key = `${t.tanggal}|${amt}`;
          const pairedCashOut = remainingSavingsCashOut.get(key) || 0;
          if (pairedCashOut > 0) {
            remainingSavingsCashOut.set(key, pairedCashOut - 1);
            applySingle(0, 0, amt);
          } else if (keluar > 0 && masuk === 0) {
            // Single-row Setor Tabungan SeaBank: kurangi Cash, tambah SeaBank
            applySingle(-amt, 0, amt);
          } else {
            applySingle(0, 0, amt);
          }
          return;
        }

        if (akunCompact === 'cash' && keluar > 0) {
          const key = `${t.tanggal}|${keluar}`;
          const pairedSeaBank = remainingSavingsSeaBank.get(key) || 0;
          if (pairedSeaBank > 0) {
            remainingSavingsSeaBank.set(key, pairedSeaBank - 1);
            applySingle(-keluar, 0, 0);
          } else {
            applySingle(-keluar, 0, keluar);
          }
          return;
        }

        if (akunCompact === 'shopeepay') {
          const net = masuk - keluar;
          applySingle(0, net, keluar > 0 ? keluar : 0);
          return;
        }
      }
    }

    // 4. Transaksi reguler / Saldo Awal
    const net = masuk - keluar;
    if (akunCompact === 'cash' || akunCompact === 'tunai' || !akunCompact) {
      applySingle(net, 0, 0);
    } else if (akunCompact === 'shopeepay') {
      applySingle(0, net, 0);
    } else if (akunCompact === 'seabank') {
      applySingle(0, 0, net);
    } else {
      applySingle(0, 0, 0, akunKey, net);
    }
  });

  return result;
}

export function computeTransactionKasDelta(
  t: Transaction,
  pairedSavingsCashDates?: Set<string>
): number {
  const masuk = Number(t.masuk) || 0;
  const keluar = Number(t.keluar) || 0;

  if (isTransferTransaction(t)) {
    return 0;
  }

  if (isSavingsTransaction(t)) {
    const akunCompact = (t.akun || '').toLowerCase().replace(/\s+/g, '');
    if (akunCompact !== 'seabank') {
      return masuk - keluar;
    }
    if (keluar > 0 && masuk === 0 && !t.transferId) {
      const hasCashPair = pairedSavingsCashDates?.has(`${t.tanggal}|${keluar}`);
      if (!hasCashPair) return -keluar;
    }
    return 0;
  }

  return masuk - keluar;
}

export function computeTransactionsWithBalance(
  transactions: Transaction[],
  initialBalance: number = 0
): TransactionWithBalance[] {
  const sorted = sortTransactionsChronological(transactions);
  const deltaMap = buildPerTransactionAccountDeltas(sorted);
  let balance = Number(initialBalance) || 0;
  return sorted.map((t) => {
    const delta = deltaMap.get(t.id);
    balance += delta ? delta.kasDelta : computeTransactionKasDelta(t);
    return {
      ...t,
      runningBalance: balance,
    };
  });
}

export function resolveTransactionPeriodKey(t: Transaction): string {
  return getMonthKey(t.tanggal) || (t.bulan ? parseBulanToPeriodKey(t.bulan) : '');
}

export function getAvailablePeriods(transactions: Transaction[]): PeriodOption[] {
  const seen = new Set<string>();
  transactions.forEach((t) => {
    const mk = resolveTransactionPeriodKey(t);
    if (mk) seen.add(mk);
  });

  const sortedKeys = Array.from(seen).sort();
  const options: PeriodOption[] = [{ value: 'all', label: 'Semua Periode' }];

  sortedKeys.forEach((key) => {
    options.push({
      value: key,
      label: getMonthLabel(key),
    });
  });

  return options;
}

export function filterTransactionsByPeriod(transactions: Transaction[], period: string): Transaction[] {
  if (!period || period === 'all') return transactions;
  return transactions.filter((t) => resolveTransactionPeriodKey(t) === period);
}

export function computeActualSavingsTotal(transactions: Transaction[]): number {
  const savingsRows = transactions.filter((t) => isSavingsTransaction(t));
  if (savingsRows.length === 0) return 0;

  const byTransferId = new Map<string, Transaction[]>();
  const noTransferIdRows: Transaction[] = [];

  savingsRows.forEach((t) => {
    if (t.transferId) {
      const list = byTransferId.get(t.transferId) || [];
      list.push(t);
      byTransferId.set(t.transferId, list);
    } else {
      noTransferIdRows.push(t);
    }
  });

  let total = 0;

  // Hitung 1 kali per grup transferId tabungan (agar 2 baris sumber+tujuan tidak terhitung 2x)
  byTransferId.forEach((group) => {
    const seaBankIn = group
      .filter((g) => g.akun.toLowerCase().replace(/\s+/g, '') === 'seabank' && (Number(g.masuk) || 0) > 0)
      .reduce((s, g) => s + (Number(g.masuk) || 0), 0);
    if (seaBankIn > 0) {
      total += seaBankIn;
    } else {
      const maxSingle = group.reduce(
        (m, g) => Math.max(m, Number(g.keluar) || 0, Number(g.masuk) || 0),
        0
      );
      total += maxSingle;
    }
  });

  // Fallback untuk data lama tanpa transferId: pasangkan Cash keluar & SeaBank masuk pada tanggal+nominal sama
  const cashOutPairs = new Map<string, number>();
  const seaBankInPairs = new Map<string, number>();

  noTransferIdRows.forEach((t) => {
    const akunCompact = (t.akun || '').toLowerCase().replace(/\s+/g, '');
    const masuk = Number(t.masuk) || 0;
    const keluar = Number(t.keluar) || 0;
    if (akunCompact === 'cash' && keluar > 0) {
      const k = `${t.tanggal}|${keluar}`;
      cashOutPairs.set(k, (cashOutPairs.get(k) || 0) + 1);
    } else if (akunCompact === 'seabank' && masuk > 0) {
      const k = `${t.tanggal}|${masuk}`;
      seaBankInPairs.set(k, (seaBankInPairs.get(k) || 0) + 1);
    }
  });

  const skipCashCount = new Map<string, number>();
  cashOutPairs.forEach((cashCount, key) => {
    const sbCount = seaBankInPairs.get(key) || 0;
    const paired = Math.min(cashCount, sbCount);
    if (paired > 0) skipCashCount.set(key, paired);
  });

  noTransferIdRows.forEach((t) => {
    const akunCompact = (t.akun || '').toLowerCase().replace(/\s+/g, '');
    const masuk = Number(t.masuk) || 0;
    const keluar = Number(t.keluar) || 0;
    const amt = keluar > 0 ? keluar : masuk;
    if (akunCompact === 'cash' && keluar > 0) {
      const k = `${t.tanggal}|${keluar}`;
      const skip = skipCashCount.get(k) || 0;
      if (skip > 0) {
        skipCashCount.set(k, skip - 1);
        return;
      }
    }
    total += amt;
  });

  return total;
}

export interface KpiSummary {
  totalIncome: number;
  totalExpense: number;
  consumptionExpense: number;
  balance: number;
  transactionCount: number;
  savingsFromTransactions: number;
  needsExpense: number;
  wantsExpense: number;
  reviewExpense: number;
  needsPercentage: number;
  wantsPercentage: number;
  reviewPercentage: number;
}

export function computeKpis(transactions: Transaction[]): KpiSummary {
  // Uang Masuk: hanya pendapatan nyata (tidak termasuk transfer antar akun, top up ShopeePay, atau setor tabungan)
  const totalIncome = transactions
    .filter((t) => !isTransferTransaction(t) && !isSavingsTransaction(t))
    .reduce((sum, t) => sum + (Number(t.masuk) || 0), 0);

  // Uang Keluar: hanya pengeluaran konsumsi nyata (tidak termasuk transfer antar akun, top up ShopeePay, atau setor tabungan)
  const totalExpense = transactions
    .filter((t) => !isTransferTransaction(t) && !isSavingsTransaction(t))
    .reduce((sum, t) => sum + (Number(t.keluar) || 0), 0);

  const consumptionExpense = totalExpense;
  const balance = totalIncome - totalExpense;

  const savingsFromTransactions = computeActualSavingsTotal(transactions);

  const consumptionExpenses = transactions.filter(
    (t) =>
      t.tipe === 'Pengeluaran' &&
      !isTransferTransaction(t) &&
      !isSavingsTransaction(t) &&
      (Number(t.keluar) || 0) > 0
  );

  const needsExpense = consumptionExpenses
    .filter((t) => String(t.jenisPengeluaran || '').toLowerCase().trim() === 'kebutuhan')
    .reduce((sum, t) => sum + (Number(t.keluar) || 0), 0);

  const wantsExpense = consumptionExpenses
    .filter((t) => String(t.jenisPengeluaran || '').toLowerCase().trim() === 'keinginan')
    .reduce((sum, t) => sum + (Number(t.keluar) || 0), 0);

  const reviewExpense = consumptionExpenses
    .filter((t) => {
      const j = String(t.jenisPengeluaran || '').toLowerCase().trim();
      return j !== 'kebutuhan' && j !== 'keinginan';
    })
    .reduce((sum, t) => sum + (Number(t.keluar) || 0), 0);

  const ratioDenominator =
    consumptionExpense > 0 ? consumptionExpense : needsExpense + wantsExpense + reviewExpense;
  const needsPercentage =
    ratioDenominator > 0 ? Math.round((needsExpense / ratioDenominator) * 1000) / 10 : 0;
  const wantsPercentage =
    ratioDenominator > 0 ? Math.round((wantsExpense / ratioDenominator) * 1000) / 10 : 0;
  const reviewPercentage =
    ratioDenominator > 0 ? Math.round((reviewExpense / ratioDenominator) * 1000) / 10 : 0;

  return {
    totalIncome,
    totalExpense,
    consumptionExpense,
    balance,
    transactionCount: transactions.length,
    savingsFromTransactions,
    needsExpense,
    wantsExpense,
    reviewExpense,
    needsPercentage,
    wantsPercentage,
    reviewPercentage,
  };
}

export function computeAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): {
  accountsWithBalance: AccountWithBalance[];
  cashBalance: number;
  shopeePayBalance: number;
  seaBankBalance: number;
  bankBalance: number;
  ewalletBalance: number;
  digitalBalance: number;
  liquidBalance: number;
  totalAccountBalance: number;
} {
  const stats = new Map<string, { in: number; out: number; count: number }>();

  const ensureStat = (name: string) => {
    const key = name.toLowerCase().trim();
    let entry = stats.get(key);
    if (!entry) {
      entry = { in: 0, out: 0, count: 0 };
      stats.set(key, entry);
    }
    return entry;
  };

  // Pre-seed stat entries for known accounts
  accounts.forEach((acc) => ensureStat(acc.name));

  // Hitung pasangan berdasarkan transferId jika ada
  const transferIdGroups = new Map<string, Transaction[]>();
  transactions.forEach((t) => {
    if (t.transferId) {
      const arr = transferIdGroups.get(t.transferId) || [];
      arr.push(t);
      transferIdGroups.set(t.transferId, arr);
    }
  });

  // Fallback pairing pools untuk transaksi lama tanpa transferId
  const transferInPool = new Map<string, number>();
  const transferOutPool = new Map<string, number>();
  const savingsCashOutPool = new Map<string, number>();
  const savingsSeaBankPool = new Map<string, number>();

  transactions.forEach((t) => {
    if (t.transferId) return;
    const akunKey = (t.akun || '').toLowerCase().replace(/\s+/g, '');
    const masuk = Number(t.masuk) || 0;
    const keluar = Number(t.keluar) || 0;

    if (isTransferTransaction(t)) {
      if (akunKey === 'shopeepay' && masuk > 0 && keluar === 0) {
        const k = `${t.tanggal}|${masuk}`;
        transferInPool.set(k, (transferInPool.get(k) || 0) + 1);
      } else if (akunKey === 'cash' && keluar > 0 && masuk === 0) {
        const k = `${t.tanggal}|${keluar}`;
        transferOutPool.set(k, (transferOutPool.get(k) || 0) + 1);
      }
    } else if (isSavingsTransaction(t)) {
      const amt = keluar > 0 ? keluar : masuk;
      if (amt > 0) {
        if (akunKey === 'cash' && keluar > 0) {
          const k = `${t.tanggal}|${amt}`;
          savingsCashOutPool.set(k, (savingsCashOutPool.get(k) || 0) + 1);
        } else if (akunKey === 'seabank') {
          const k = `${t.tanggal}|${amt}`;
          savingsSeaBankPool.set(k, (savingsSeaBankPool.get(k) || 0) + 1);
        }
      }
    }
  });

  const remainingTransferInForCash = new Map(transferInPool);
  const remainingTransferOutForShopee = new Map(transferOutPool);
  const remainingSavingsCashOut = new Map(savingsCashOutPool);
  const remainingSavingsSeaBank = new Map(savingsSeaBankPool);

  transactions.forEach((t) => {
    const masuk = Number(t.masuk) || 0;
    const keluar = Number(t.keluar) || 0;
    const akunRaw = (t.akun || '').trim();
    const akunCompact = akunRaw.toLowerCase().replace(/\s+/g, '');

    // Jika memiliki pasangan transferId yang lengkap (sumber keluar + tujuan masuk), terapkan langsung ke akun masing-masing
    if (t.transferId) {
      const group = transferIdGroups.get(t.transferId) || [];
      if (group.length >= 2) {
        const targetAcc = akunRaw || 'Cash';
        const accStat = ensureStat(targetAcc);
        accStat.in += masuk;
        accStat.out += keluar;
        accStat.count += 1;
        return;
      }
    }

    if (isTransferTransaction(t)) {
      if (akunCompact === 'cash' && keluar > 0 && masuk === 0) {
        const cashStat = ensureStat('Cash');
        cashStat.out += keluar;
        cashStat.count += 1;

        const key = `${t.tanggal}|${keluar}`;
        const pairedIn = remainingTransferInForCash.get(key) || 0;
        if (pairedIn > 0) {
          remainingTransferInForCash.set(key, pairedIn - 1);
        } else {
          // Single-row transfer: tambahkan juga ke ShopeePay
          ensureStat('ShopeePay').in += keluar;
        }
        return;
      }

      if (akunCompact === 'cash' && masuk > 0 && keluar === 0) {
        const cashStat = ensureStat('Cash');
        cashStat.in += masuk;
        cashStat.count += 1;
        ensureStat('ShopeePay').out += masuk;
        return;
      }

      if (akunCompact === 'shopeepay' && masuk > 0 && keluar === 0) {
        const spStat = ensureStat('ShopeePay');
        spStat.in += masuk;
        spStat.count += 1;

        const key = `${t.tanggal}|${masuk}`;
        const pairedOut = remainingTransferOutForShopee.get(key) || 0;
        if (pairedOut > 0) {
          remainingTransferOutForShopee.set(key, pairedOut - 1);
        } else {
          // Single-row transfer: kurangi juga dari Cash
          ensureStat('Cash').out += masuk;
        }
        return;
      }

      if (akunCompact === 'shopeepay' && keluar > 0 && masuk === 0) {
        const ketLower = (t.keterangan || '').toLowerCase();
        if (ketLower.includes('top up') && ketLower.includes('shopee')) {
          const spStat = ensureStat('ShopeePay');
          spStat.in += keluar;
          spStat.count += 1;
          ensureStat('Cash').out += keluar;
        } else {
          const spStat = ensureStat('ShopeePay');
          spStat.out += keluar;
          spStat.count += 1;
          ensureStat('Cash').in += keluar;
        }
        return;
      }
    }

    if (isSavingsTransaction(t)) {
      const amt = keluar > 0 ? keluar : masuk;
      if (amt > 0) {
        if (akunCompact === 'seabank') {
          const sbStat = ensureStat('SeaBank');
          sbStat.in += amt;
          sbStat.count += 1;

          const key = `${t.tanggal}|${amt}`;
          const pairedCashOut = remainingSavingsCashOut.get(key) || 0;
          if (pairedCashOut > 0) {
            remainingSavingsCashOut.set(key, pairedCashOut - 1);
          } else if (keluar > 0 && masuk === 0) {
            // Single-row Setor Tabungan SeaBank: kurangi dari Cash
            ensureStat('Cash').out += amt;
          }
          return;
        }

        if (akunCompact === 'cash' && keluar > 0) {
          const cashStat = ensureStat('Cash');
          cashStat.out += keluar;
          cashStat.count += 1;

          const key = `${t.tanggal}|${keluar}`;
          const pairedSeaBank = remainingSavingsSeaBank.get(key) || 0;
          if (pairedSeaBank > 0) {
            remainingSavingsSeaBank.set(key, pairedSeaBank - 1);
          } else {
            ensureStat('SeaBank').in += keluar;
          }
          return;
        }
      }
    }

    // Transaksi reguler: Saldo Akun = Saldo Awal + Pemasukan Akun - Pengeluaran Akun
    const targetAcc = akunRaw || 'Cash';
    const accStat = ensureStat(targetAcc);
    accStat.in += masuk;
    accStat.out += keluar;
    accStat.count += 1;
  });

  const accountsWithBalance: AccountWithBalance[] = accounts.map((acc) => {
    const st = stats.get(acc.name.toLowerCase().trim()) || { in: 0, out: 0, count: 0 };
    const currentBalance = (Number(acc.initialBalance) || 0) + st.in - st.out;
    return {
      ...acc,
      totalIn: st.in,
      totalOut: st.out,
      currentBalance,
      transactionCount: st.count,
    };
  });

  const knownKeys = new Set(accounts.map((a) => a.name.toLowerCase().trim()));
  const getUnmatchedNet = (predicate: (key: string) => boolean) => {
    let total = 0;
    stats.forEach((st, key) => {
      if (!knownKeys.has(key) && predicate(key)) {
        total += st.in - st.out;
      }
    });
    return total;
  };

  const cashBalance =
    accountsWithBalance
      .filter((a) => a.type === 'Cash')
      .reduce((sum, a) => sum + a.currentBalance, 0) +
    getUnmatchedNet((k) => k === 'cash' || k === 'tunai');

  const shopeePayFromAccounts = accountsWithBalance
    .filter((a) => a.name.toLowerCase().replace(/\s+/g, '') === 'shopeepay')
    .reduce((sum, a) => sum + a.currentBalance, 0);
  const shopeePayBalance =
    shopeePayFromAccounts + getUnmatchedNet((k) => k.replace(/\s+/g, '') === 'shopeepay');

  const seaBankFromAccounts = accountsWithBalance
    .filter((a) => a.name.toLowerCase().replace(/\s+/g, '') === 'seabank')
    .reduce((sum, a) => sum + a.currentBalance, 0);
  const seaBankBalance =
    seaBankFromAccounts + getUnmatchedNet((k) => k.replace(/\s+/g, '') === 'seabank');

  const bankBalance =
    accountsWithBalance
      .filter((a) => a.type === 'Bank')
      .reduce((sum, a) => sum + a.currentBalance, 0) +
    getUnmatchedNet((k) => k.replace(/\s+/g, '') === 'seabank');

  const ewalletBalance =
    accountsWithBalance
      .filter((a) => a.type === 'E-Wallet')
      .reduce((sum, a) => sum + a.currentBalance, 0) +
    getUnmatchedNet((k) => k !== 'cash' && k !== 'tunai' && k.replace(/\s+/g, '') !== 'seabank');

  // Saldo Digital hanya dompet digital likuid aktif (ShopeePay / E-Wallet), TIDAK termasuk tabungan SeaBank
  const digitalBalance = ewalletBalance;
  // Sisa Saldo kas likuid aktif = Cash + Saldo Digital (ShopeePay), terpisah dari Total Tabungan (SeaBank)
  const liquidBalance = cashBalance + digitalBalance;
  const totalAccountBalance = cashBalance + digitalBalance + bankBalance;

  return {
    accountsWithBalance,
    cashBalance,
    shopeePayBalance,
    seaBankBalance,
    bankBalance,
    ewalletBalance,
    digitalBalance,
    liquidBalance,
    totalAccountBalance,
  };
}

export function computeSavingsProgress(
  goals: SavingsGoal[],
  transactions: Transaction[],
  selectedPeriod: string = 'all'
): {
  goalsProgress: SavingsGoalProgress[];
  activeTargetAmount: number;
  activeCollectedAmount: number;
  activePercentage: number;
} {
  const goalsProgress: SavingsGoalProgress[] = goals.map((goal) => {
    const txInPeriod = transactions.filter((t) => {
      if (!isSavingsTransaction(t)) return false;
      if (goal.periodKey && goal.periodKey !== 'custom') {
        return resolveTransactionPeriodKey(t) === goal.periodKey;
      }
      return true;
    });

    const transactionSaved = computeActualSavingsTotal(txInPeriod);
    const collectedAmount = transactionSaved + (Number(goal.manualSaved) || 0);
    const target = Math.max(0, Number(goal.targetAmount) || 0);
    const rawPct = target > 0 ? (collectedAmount / target) * 100 : 0;
    const percentage = Math.min(100, Math.round(rawPct * 10) / 10);
    const shortfall = Math.max(0, target - collectedAmount);

    let status: 'Tercapai' | 'Berjalan' | 'Belum Dimulai' = 'Belum Dimulai';
    if (target > 0 && collectedAmount >= target) {
      status = 'Tercapai';
    } else if (collectedAmount > 0) {
      status = 'Berjalan';
    }

    return {
      ...goal,
      transactionSaved,
      collectedAmount,
      shortfall,
      percentage,
      status,
    };
  });

  const relevantGoals =
    selectedPeriod === 'all'
      ? goalsProgress
      : goalsProgress.filter((g) => g.periodKey === selectedPeriod);

  const txSavedForPeriod = computeActualSavingsTotal(
    transactions.filter(
      (t) =>
        isSavingsTransaction(t) &&
        (selectedPeriod === 'all' || resolveTransactionPeriodKey(t) === selectedPeriod)
    )
  );

  const activeTargetAmount = relevantGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const activeCollectedAmount =
    relevantGoals.length > 0
      ? relevantGoals.reduce((sum, g) => sum + g.collectedAmount, 0)
      : txSavedForPeriod;
  const activePercentage =
    activeTargetAmount > 0
      ? Math.min(100, Math.round((activeCollectedAmount / activeTargetAmount) * 1000) / 10)
      : 0;

  return {
    goalsProgress,
    activeTargetAmount,
    activeCollectedAmount,
    activePercentage,
  };
}

export interface TrendDataPoint {
  tanggal: string;
  label: string;
  pemasukan: number;
  pengeluaran: number;
  uangTunai: number;
  shopeePay: number;
  saldo: number;
}

export function buildTrendData(
  transactions: Transaction[],
  selectedPeriod: string = 'all',
  initialBalances: number | { cash?: number; shopeePay?: number } = 0
): TrendDataPoint[] {
  const sorted = sortTransactionsChronological(transactions);
  if (sorted.length === 0) return [];

  const deltaMap = buildPerTransactionAccountDeltas(sorted);
  const hasSpecificMonth = Boolean(selectedPeriod && selectedPeriod !== 'all');

  let carryOverCash =
    typeof initialBalances === 'number' ? Number(initialBalances) || 0 : Number(initialBalances.cash) || 0;
  let carryOverShopeePay =
    typeof initialBalances === 'number' ? 0 : Number(initialBalances.shopeePay) || 0;

  const periodTx: Transaction[] = [];

  sorted.forEach((t) => {
    const pk = resolveTransactionPeriodKey(t);
    const delta = deltaMap.get(t.id);
    if (hasSpecificMonth && pk && pk < selectedPeriod) {
      if (delta) {
        carryOverCash += delta.cashDelta;
        carryOverShopeePay += delta.shopeePayDelta;
      }
    } else if (!hasSpecificMonth || pk === selectedPeriod) {
      periodTx.push(t);
    }
  });

  if (periodTx.length === 0) return [];

  const byDate = new Map<
    string,
    {
      tanggal: string;
      pemasukan: number;
      pengeluaran: number;
      cashDelta: number;
      shopeePayDelta: number;
    }
  >();

  periodTx.forEach((t) => {
    const existing = byDate.get(t.tanggal) || {
      tanggal: t.tanggal,
      pemasukan: 0,
      pengeluaran: 0,
      cashDelta: 0,
      shopeePayDelta: 0,
    };
    if (!isTransferTransaction(t) && !isSavingsTransaction(t)) {
      existing.pemasukan += Number(t.masuk) || 0;
      existing.pengeluaran += Number(t.keluar) || 0;
    }
    const delta = deltaMap.get(t.id);
    if (delta) {
      existing.cashDelta += delta.cashDelta;
      existing.shopeePayDelta += delta.shopeePayDelta;
    }
    byDate.set(t.tanggal, existing);
  });

  let runningCash = carryOverCash;
  let runningShopeePay = carryOverShopeePay;

  return Array.from(byDate.values())
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .map((row) => {
      runningCash += row.cashDelta;
      runningShopeePay += row.shopeePayDelta;
      return {
        tanggal: row.tanggal,
        label: row.tanggal.slice(5),
        pemasukan: row.pemasukan,
        pengeluaran: row.pengeluaran,
        uangTunai: runningCash,
        shopeePay: runningShopeePay,
        saldo: runningCash + runningShopeePay,
      };
    });
}

export function buildCategoryExpenseData(transactions: Transaction[]) {
  const map = new Map<string, number>();
  transactions
    .filter(
      (t) =>
        t.tipe === 'Pengeluaran' &&
        t.keluar > 0 &&
        !isTransferTransaction(t) &&
        !isSavingsTransaction(t)
    )
    .forEach((t) => {
      const cat = t.kategori.trim() || 'Lainnya';
      map.set(cat, (map.get(cat) || 0) + t.keluar);
    });

  return Array.from(map.entries())
    .map(([kategori, total]) => ({ kategori, total }))
    .sort((a, b) => b.total - a.total);
}

export function buildPaymentMethodData(transactions: Transaction[]) {
  const map = new Map<string, number>();
  transactions
    .filter((t) => !isTransferTransaction(t) && !isSavingsTransaction(t))
    .forEach((t) => {
      const amount = t.keluar > 0 ? t.keluar : t.masuk;
      if (amount <= 0) return;
      const method = (t.metode || 'lainnya').trim();
      map.set(method, (map.get(method) || 0) + amount);
    });

  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function buildNeedsVsWantsData(transactions: Transaction[]) {
  const consumptionExpenses = transactions.filter(
    (t) =>
      t.tipe === 'Pengeluaran' &&
      !isTransferTransaction(t) &&
      !isSavingsTransaction(t) &&
      (Number(t.keluar) || 0) > 0
  );

  const needs = consumptionExpenses
    .filter((t) => String(t.jenisPengeluaran || '').toLowerCase().trim() === 'kebutuhan')
    .reduce((sum, t) => sum + (Number(t.keluar) || 0), 0);

  const wants = consumptionExpenses
    .filter((t) => String(t.jenisPengeluaran || '').toLowerCase().trim() === 'keinginan')
    .reduce((sum, t) => sum + (Number(t.keluar) || 0), 0);

  const review = consumptionExpenses
    .filter((t) => {
      const j = String(t.jenisPengeluaran || '').toLowerCase().trim();
      return j !== 'kebutuhan' && j !== 'keinginan';
    })
    .reduce((sum, t) => sum + (Number(t.keluar) || 0), 0);

  const total = needs + wants + review;
  if (total === 0) return [];

  const result = [
    {
      name: 'Kebutuhan',
      value: needs,
      percentage: Math.round((needs / total) * 1000) / 10,
    },
    {
      name: 'Keinginan',
      value: wants,
      percentage: Math.round((wants / total) * 1000) / 10,
    },
  ];

  if (review > 0) {
    result.push({
      name: 'Perlu Ditinjau',
      value: review,
      percentage: Math.round((review / total) * 1000) / 10,
    });
  }

  return result;
}

export function buildMoneyActivityData(kpi: KpiSummary, totalAccountBalance?: number) {
  return [
    { name: 'Masuk', nominal: kpi.totalIncome },
    { name: 'Keluar', nominal: kpi.totalExpense },
    { name: 'Sisa', nominal: totalAccountBalance !== undefined ? totalAccountBalance : kpi.balance },
  ];
}

export function computeFinancialHealthScore(
  transactions: Transaction[],
  kpi: KpiSummary,
  savingsPercentage: number
): HealthScoreResult {
  if (transactions.length === 0) {
    return {
      score: 0,
      label: 'Perlu Perhatian',
      factors: [
        {
          label: 'Aktivitas Transaksi',
          score: 0,
          maxScore: 100,
          detail: 'Belum ada transaksi untuk dihitung.',
        },
      ],
    };
  }

  // 1. Rasio Sisa Saldo terhadap Pemasukan (max 25)
  let balanceScore = 0;
  if (kpi.totalIncome > 0) {
    const ratio = kpi.balance / kpi.totalIncome;
    balanceScore = Math.max(0, Math.min(25, Math.round(ratio * 60)));
  } else if (kpi.balance > 0) {
    balanceScore = 15;
  }

  // 2. Pengendalian Pengeluaran Konsumsi (max 25)
  let expenseControlScore = 0;
  const controlExpense = kpi.consumptionExpense;
  if (kpi.totalIncome > 0) {
    const expRatio = controlExpense / kpi.totalIncome;
    if (expRatio <= 0.7) expenseControlScore = 25;
    else if (expRatio <= 0.85) expenseControlScore = 20;
    else if (expRatio <= 1) expenseControlScore = 12;
    else expenseControlScore = 4;
  }

  // 3. Keseimbangan Kebutuhan vs Keinginan (max 20)
  let needsWantsScore = 10;
  if (kpi.consumptionExpense > 0) {
    if (kpi.wantsPercentage <= 20) needsWantsScore = 20;
    else if (kpi.wantsPercentage <= 30) needsWantsScore = 15;
    else if (kpi.wantsPercentage <= 45) needsWantsScore = 9;
    else needsWantsScore = 4;
  }

  // 4. Pencapaian Target Tabungan (max 20)
  const savingsScore = Math.max(0, Math.min(20, Math.round((savingsPercentage / 100) * 20)));

  // 5. Konsistensi Pemasukan (max 10)
  const incomeCount = transactions.filter(
    (t) => !isTransferTransaction(t) && !isSavingsTransaction(t) && t.masuk > 0
  ).length;
  const consistencyScore = incomeCount > 0 ? 10 : 0;

  const totalScore = Math.max(
    0,
    Math.min(100, balanceScore + expenseControlScore + needsWantsScore + savingsScore + consistencyScore)
  );

  let label: HealthScoreResult['label'] = 'Perlu Perhatian';
  if (totalScore >= 80) label = 'Sangat Sehat';
  else if (totalScore >= 65) label = 'Sehat';
  else if (totalScore >= 45) label = 'Cukup';

  const factors: HealthScoreFactor[] = [
    {
      label: 'Sisa Saldo',
      score: balanceScore,
      maxScore: 25,
      detail: `Surplus bersih ${formatMoney(kpi.balance)} dari pemasukan nyata ${formatMoney(kpi.totalIncome)}.`,
    },
    {
      label: 'Kontrol Pengeluaran',
      score: expenseControlScore,
      maxScore: 25,
      detail:
        kpi.totalIncome > 0
          ? `Pengeluaran konsumsi sebesar ${Math.round((controlExpense / kpi.totalIncome) * 100)}% dari pemasukan.`
          : 'Belum ada pemasukan tercatat.',
    },
    {
      label: 'Kebutuhan vs Keinginan',
      score: needsWantsScore,
      maxScore: 20,
      detail:
        kpi.reviewExpense > 0
          ? `Kebutuhan ${kpi.needsPercentage}%, Keinginan ${kpi.wantsPercentage}%, Perlu Ditinjau ${kpi.reviewPercentage}%.`
          : `Kebutuhan ${kpi.needsPercentage}% dan Keinginan ${kpi.wantsPercentage}%.`,
    },
    {
      label: 'Target Tabungan',
      score: savingsScore,
      maxScore: 20,
      detail: `Tercapai ${savingsPercentage}% dari target periode aktif.`,
    },
    {
      label: 'Konsistensi Pemasukan',
      score: consistencyScore,
      maxScore: 10,
      detail: incomeCount > 0 ? `${incomeCount} transaksi pemasukan nyata tercatat.` : 'Belum ada pemasukan.',
    },
  ];

  return {
    score: totalScore,
    label,
    factors,
  };
}
