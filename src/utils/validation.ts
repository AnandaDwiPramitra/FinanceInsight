import {
  Account,
  DatasetValidationReport,
  Transaction,
  ValidationCheckItem,
} from '../types/finance';
import { computeAccountBalances } from './calculations';
import { formatMoney, getMonthKey } from './formatMoney';

const VALID_JENIS = new Set([
  'kebutuhan',
  'keinginan',
  'pemasukan',
  'transfer',
  'tabungan',
  'perlu ditinjau',
]);

const SWAPPED_KATEGORI_TERMS = new Set(['kebutuhan', 'keinginan', 'perlu ditinjau', 'tidak berlaku']);
const PHANTOM_ACCOUNTS = new Set(['qris', 'tunai']);

export function isTransferLike(t: Pick<Transaction, 'kategori' | 'jenisPengeluaran' | 'keterangan'>): boolean {
  const kat = (t.kategori || '').toLowerCase().trim();
  const jenis = String(t.jenisPengeluaran || '').toLowerCase().trim();
  const ket = (t.keterangan || '').toLowerCase().trim();
  return kat === 'transfer' || jenis === 'transfer' || ket.includes('top up shopeepay');
}

export function isSavingsLike(t: Pick<Transaction, 'kategori' | 'jenisPengeluaran' | 'keterangan'>): boolean {
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

export function validateFinanceDataset(
  transactions: Transaction[],
  accounts: Account[],
  options?: { skippedDuplicateCount?: number }
): DatasetValidationReport {
  if (transactions.length === 0) {
    const hasSeaBank = accounts.some((a) => a.name.toLowerCase().replace(/\s+/g, '') === 'seabank');
    const checks: ValidationCheckItem[] = [
      { id: 1, label: 'Kategori & Jenis tidak tertukar', passed: true, detail: 'Belum ada transaksi.' },
      { id: 2, label: 'Metode & Akun tidak tertukar', passed: true, detail: 'Belum ada transaksi.' },
      { id: 3, label: 'Pemasukan berjenis Pemasukan', passed: true, detail: 'Belum ada transaksi.' },
      { id: 4, label: 'Nominal pengeluaran valid', passed: true, detail: 'Belum ada transaksi.' },
      { id: 5, label: 'QRIS menggunakan akun ShopeePay', passed: true, detail: 'Belum ada transaksi.' },
      { id: 6, label: 'Tunai menggunakan akun Cash', passed: true, detail: 'Belum ada transaksi.' },
      {
        id: 7,
        label: 'SeaBank terdaftar sebagai akun aktif',
        passed: hasSeaBank,
        detail: hasSeaBank ? 'Akun SeaBank aktif.' : 'Akun SeaBank belum terdaftar.',
      },
      { id: 8, label: 'Transfer memiliki catatan pasangan', passed: true, detail: 'Belum ada transaksi transfer.' },
      { id: 9, label: 'Akumulasi tabungan SeaBank konsisten', passed: true, detail: 'Belum ada transaksi.' },
      { id: 10, label: 'Tanggal dan periode transaksi valid', passed: true, detail: 'Belum ada transaksi.' },
      { id: 11, label: 'Tidak ada duplikasi impor', passed: true, detail: 'Belum ada transaksi.' },
    ];
    return {
      allPassed: checks.every((c) => c.passed),
      passedCount: checks.filter((c) => c.passed).length,
      totalCount: checks.length,
      checks,
    };
  }

  // 1. Kategori & Jenis Pengeluaran tidak tertukar
  const swappedKatJenis = transactions.filter((t) => {
    const kat = (t.kategori || '').toLowerCase().trim();
    const jenis = String(t.jenisPengeluaran || '').toLowerCase().trim();
    return SWAPPED_KATEGORI_TERMS.has(kat) || !VALID_JENIS.has(jenis);
  });

  // 2. Metode Pembayaran & Akun tidak tertukar (tidak ada akun bernama QRIS atau Tunai)
  const badPhantomAcc = accounts.filter((a) =>
    PHANTOM_ACCOUNTS.has(a.name.toLowerCase().trim())
  );
  const swappedMethodAcc = transactions.filter((t) => {
    const met = (t.metode || '').toLowerCase().replace(/\s+/g, '');
    const akun = (t.akun || '').toLowerCase().replace(/\s+/g, '');
    return !akun || PHANTOM_ACCOUNTS.has(akun) || met === 'seabank';
  });

  // 3. Semua pemasukan memiliki Jenis = Pemasukan (tidak "Tidak berlaku")
  const invalidIncomeJenis = transactions.filter((t) => {
    const isIncome = t.tipe === 'Pemasukan' && t.masuk > 0 && t.keluar === 0;
    if (!isIncome) return false;
    const jenis = String(t.jenisPengeluaran || '').toLowerCase().trim();
    if (isTransferLike(t) || isSavingsLike(t)) return false;
    return jenis !== 'pemasukan';
  });

  // 4. Semua transaksi pengeluaran memiliki Pengeluaran > 0
  const invalidExpenses = transactions.filter(
    (t) => t.tipe === 'Pengeluaran' && (!Number.isFinite(t.keluar) || t.keluar <= 0)
  );

  // 5. QRIS -> Akun ShopeePay
  const invalidQris = transactions.filter((t) => {
    const met = (t.metode || '').toLowerCase().trim();
    const akun = (t.akun || '').toLowerCase().replace(/\s+/g, '');
    return met === 'qris' && akun !== 'shopeepay';
  });

  // 6. Tunai -> Akun Cash (kecuali sisi tujuan setor tabungan ke SeaBank)
  const invalidTunai = transactions.filter((t) => {
    const met = (t.metode || '').toLowerCase().trim();
    const akun = (t.akun || '').toLowerCase().replace(/\s+/g, '');
    if (met !== 'tunai' && met !== 'cash') return false;
    if (akun === 'seabank' && isSavingsLike(t) && t.masuk > 0) return false;
    return akun !== 'cash';
  });

  // 7. SeaBank terdaftar sebagai akun aktif
  const hasSeaBank = accounts.some((a) => a.name.toLowerCase().replace(/\s+/g, '') === 'seabank');

  // 8. Transfer / Setor Tabungan SeaBank memiliki pasangan catatan dengan transferId sama
  const transferGroups = new Map<string, Transaction[]>();
  const unpairedTransferRows: Transaction[] = [];
  transactions.forEach((t) => {
    if (
      !isTransferLike(t) &&
      !(isSavingsLike(t) && (t.transferId || (t.keterangan || '').toLowerCase().includes('seabank')))
    ) {
      return;
    }
    if (!t.transferId) {
      unpairedTransferRows.push(t);
      return;
    }
    const list = transferGroups.get(t.transferId) || [];
    list.push(t);
    transferGroups.set(t.transferId, list);
  });
  let badTransferGroups = unpairedTransferRows.length;
  transferGroups.forEach((group) => {
    const hasOut = group.some((g) => g.keluar > 0);
    const hasIn = group.some((g) => g.masuk > 0);
    if (group.length < 2 || !hasOut || !hasIn) {
      badTransferGroups += 1;
    }
  });

  // 9. Akumulasi tabungan SeaBank kumulatif konsisten (carry-over tanpa reset)
  const accountBal = computeAccountBalances(accounts, transactions);
  const savingsBalValid = accountBal.seaBankBalance >= 0;

  // 10. Semua transaksi memiliki format tanggal YYYY-MM-DD yang valid
  const invalidDates = transactions.filter(
    (t) => !/^\d{4}-\d{2}-\d{2}$/.test(t.tanggal) || !getMonthKey(t.tanggal)
  );

  // 11. Tidak ada transaksi duplikat yang terimpor dua kali
  const seenIds = new Set<number>();
  const seenExactSigWithSaldo = new Set<string>();
  let dupCount = 0;
  transactions.forEach((t) => {
    if (seenIds.has(t.id)) dupCount += 1;
    seenIds.add(t.id);

    if (typeof t.importedSaldo === 'number' && !Number.isNaN(t.importedSaldo)) {
      const sig = `${t.tanggal}|${t.tipe}|${t.kategori}|${t.jenisPengeluaran}|${t.metode}|${t.akun}|${t.masuk}|${t.keluar}|${t.keterangan.toLowerCase().trim()}|${t.importedSaldo}`;
      if (seenExactSigWithSaldo.has(sig)) dupCount += 1;
      seenExactSigWithSaldo.add(sig);
    }
  });

  const skippedDup = options?.skippedDuplicateCount || 0;

  const checks: ValidationCheckItem[] = [
    {
      id: 1,
      label: 'Kategori & Jenis tidak tertukar',
      passed: swappedKatJenis.length === 0,
      detail:
        swappedKatJenis.length === 0
          ? `Seluruh ${transactions.length} transaksi memiliki Kategori dan Jenis valid.`
          : `${swappedKatJenis.length} transaksi memiliki Kategori/Jenis yang tertukar atau tidak valid.`,
    },
    {
      id: 2,
      label: 'Metode & Akun tidak tertukar',
      passed: swappedMethodAcc.length === 0 && badPhantomAcc.length === 0,
      detail:
        swappedMethodAcc.length === 0 && badPhantomAcc.length === 0
          ? 'Akun terpetakan tepat tanpa akun fiktif QRIS/Tunai.'
          : `Ditemukan ${swappedMethodAcc.length + badPhantomAcc.length} ketidaksesuaian Metode vs Akun.`,
    },
    {
      id: 3,
      label: 'Pemasukan berjenis Pemasukan',
      passed: invalidIncomeJenis.length === 0,
      detail:
        invalidIncomeJenis.length === 0
          ? 'Semua pemasukan nyata menggunakan Jenis = Pemasukan (bukan Tidak berlaku).'
          : `${invalidIncomeJenis.length} transaksi pemasukan belum berjenis "Pemasukan".`,
    },
    {
      id: 4,
      label: 'Nominal pengeluaran valid (> 0)',
      passed: invalidExpenses.length === 0,
      detail:
        invalidExpenses.length === 0
          ? 'Seluruh transaksi pengeluaran memiliki nominal > 0.'
          : `${invalidExpenses.length} transaksi pengeluaran bernilai <= 0.`,
    },
    {
      id: 5,
      label: 'Metode QRIS menggunakan akun ShopeePay',
      passed: invalidQris.length === 0,
      detail:
        invalidQris.length === 0
          ? 'Semua transaksi QRIS terhubung ke akun ShopeePay.'
          : `${invalidQris.length} transaksi QRIS belum terhubung ke ShopeePay.`,
    },
    {
      id: 6,
      label: 'Metode Tunai menggunakan akun Cash',
      passed: invalidTunai.length === 0,
      detail:
        invalidTunai.length === 0
          ? 'Semua transaksi Tunai terhubung ke akun Cash.'
          : `${invalidTunai.length} transaksi Tunai tidak terhubung ke Cash.`,
    },
    {
      id: 7,
      label: 'SeaBank tersedia sebagai akun aktif',
      passed: hasSeaBank,
      detail: hasSeaBank
        ? 'Akun SeaBank aktif bersama Cash dan ShopeePay.'
        : 'Akun SeaBank belum ditemukan di daftar akun.',
    },
    {
      id: 8,
      label: 'Transfer & setoran tabungan berpasangan',
      passed: badTransferGroups === 0,
      detail:
        badTransferGroups === 0
          ? `Semua transfer/setoran tabungan (${transferGroups.size} pasang) berpasangan sumber & tujuan.`
          : `${badTransferGroups} catatan transfer/tabungan belum memiliki pasangan sumber & tujuan.`,
    },
    {
      id: 9,
      label: 'Akumulasi tabungan SeaBank konsisten',
      passed: savingsBalValid,
      detail: savingsBalValid
        ? `Total tabungan kumulatif SeaBank tercatat ${formatMoney(accountBal.seaBankBalance)} (terpisah dari kas likuid).`
        : `Saldo SeaBank negatif (${formatMoney(accountBal.seaBankBalance)}).`,
    },
    {
      id: 10,
      label: 'Tanggal dan periode transaksi valid',
      passed: invalidDates.length === 0,
      detail:
        invalidDates.length === 0
          ? `Seluruh ${transactions.length} transaksi memiliki tanggal YYYY-MM-DD yang valid.`
          : `${invalidDates.length} transaksi memiliki format tanggal tidak valid.`,
    },
    {
      id: 11,
      label: 'Tidak ada duplikasi impor',
      passed: dupCount === 0,
      detail:
        dupCount === 0
          ? skippedDup > 0
            ? `0 duplikat tersimpan (${skippedDup} baris duplikat dilewati otomatis).`
            : 'Tidak ditemukan duplikasi transaksi.'
          : `Terdeteksi ${dupCount} potensi transaksi duplikat.`,
    },
  ];

  return {
    allPassed: checks.every((c) => c.passed),
    passedCount: checks.filter((c) => c.passed).length,
    totalCount: checks.length,
    checks,
  };
}
