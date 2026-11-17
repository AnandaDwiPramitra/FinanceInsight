import { Account, ExpenseNature, SavingsGoal, Transaction } from '../types/finance';

export const INITIAL_TRANSACTIONS_RAW = [
  {
    id: 1,
    tanggal: '2026-10-01',
    tipe: 'Pemasukan' as const,
    kategori: 'uang harian',
    metode: 'transfer',
    masuk: 2055000,
    keluar: 0,
    keterangan: 'Uang bulanan',
  },
  {
    id: 2,
    tanggal: '2026-10-02',
    tipe: 'Pengeluaran' as const,
    kategori: 'uang kuliah',
    metode: 'transfer',
    masuk: 0,
    keluar: 705000,
    keterangan: 'Semesteran',
  },
  {
    id: 3,
    tanggal: '2026-10-05',
    tipe: 'Pengeluaran' as const,
    kategori: 'listrik',
    metode: 'transfer',
    masuk: 0,
    keluar: 299500,
    keterangan: 'Token listrik',
  },
  {
    id: 4,
    tanggal: '2026-10-08',
    tipe: 'Pengeluaran' as const,
    kategori: 'bensin',
    metode: 'cash',
    masuk: 0,
    keluar: 146000,
    keterangan: 'Isi full tank',
  },
  {
    id: 5,
    tanggal: '2026-10-10',
    tipe: 'Pengeluaran' as const,
    kategori: 'kuota internet',
    metode: 'qris',
    masuk: 0,
    keluar: 109000,
    keterangan: 'Paket bulanan',
  },
  {
    id: 6,
    tanggal: '2026-10-12',
    tipe: 'Pengeluaran' as const,
    kategori: 'makan',
    metode: 'qris',
    masuk: 0,
    keluar: 186000,
    keterangan: 'Makan siang & malam',
  },
  {
    id: 7,
    tanggal: '2026-10-15',
    tipe: 'Pengeluaran' as const,
    kategori: 'jajan',
    metode: 'cash',
    masuk: 0,
    keluar: 91000,
    keterangan: 'Cemilan',
  },
  {
    id: 8,
    tanggal: '2026-10-18',
    tipe: 'Pengeluaran' as const,
    kategori: 'makanan kucing',
    metode: 'qris',
    masuk: 0,
    keluar: 83000,
    keterangan: 'Whiskas',
  },
  {
    id: 9,
    tanggal: '2026-10-20',
    tipe: 'Pengeluaran' as const,
    kategori: 'air minum',
    metode: 'cash',
    masuk: 0,
    keluar: 43000,
    keterangan: 'Galon',
  },
  {
    id: 10,
    tanggal: '2026-10-22',
    tipe: 'Pengeluaran' as const,
    kategori: 'gorengan',
    metode: 'cash',
    masuk: 0,
    keluar: 25000,
    keterangan: 'Gorengan sore',
  },
  {
    id: 11,
    tanggal: '2026-10-25',
    tipe: 'Pengeluaran' as const,
    kategori: 'kopi',
    metode: 'qris',
    masuk: 0,
    keluar: 15000,
    keterangan: 'Es Kopi',
  },
  {
    id: 12,
    tanggal: '2026-10-28',
    tipe: 'Pengeluaran' as const,
    kategori: 'tabungan',
    metode: 'transfer',
    masuk: 0,
    keluar: 20000,
    keterangan: 'Simpanan',
  },
];

export function inferExpenseNature(kategori: string, tipe: 'Pemasukan' | 'Pengeluaran'): ExpenseNature {
  if (tipe === 'Pemasukan') return 'Pemasukan';
  const k = kategori.toLowerCase().trim();
  if (k === 'tabungan' || k.includes('tabungan')) return 'Tabungan';
  if (k === 'transfer' || k.includes('top up')) return 'Transfer';

  const needsKeywords = [
    'uang kuliah',
    'kuliah',
    'listrik',
    'bensin',
    'kuota',
    'internet',
    'makan',
    'makanan kucing',
    'air minum',
    'air',
    'kesehatan',
    'sewa',
    'kos',
    'transport',
  ];
  const wantsKeywords = ['jajan', 'gorengan', 'kopi', 'hiburan', 'belanja', 'game', 'nongkrong', 'streaming'];

  if (wantsKeywords.some((w) => k.includes(w))) return 'Keinginan';
  if (needsKeywords.some((n) => k.includes(n))) return 'Kebutuhan';
  return 'Perlu Ditinjau';
}

export function inferAccountFromMethod(metode: string): string {
  const m = metode.toLowerCase().trim();
  if (m === 'cash' || m === 'tunai') return 'Cash';
  if (m === 'qris' || m === 'shopeepay' || m === 'shopee pay') return 'ShopeePay';
  if (m === 'seabank' || m === 'sea bank') return 'SeaBank';
  if (m === 'e-wallet' || m === 'ewallet') return 'ShopeePay';
  return 'Cash';
}

export const INITIAL_TRANSACTIONS: Transaction[] = INITIAL_TRANSACTIONS_RAW.map((item) => ({
  ...item,
  akun: inferAccountFromMethod(item.metode),
  jenisPengeluaran: inferExpenseNature(item.kategori, item.tipe),
}));

export const DEFAULT_CATEGORIES: string[] = [
  'uang harian',
  'uang kuliah',
  'listrik',
  'bensin',
  'kuota internet',
  'makan',
  'jajan',
  'makanan kucing',
  'air minum',
  'gorengan',
  'kopi',
  'tabungan',
  'Pemasukan',
  'Lainnya',
];

export const DEFAULT_PAYMENT_METHODS: string[] = ['Tunai', 'QRIS', 'ShopeePay', 'Transfer'];

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-cash',
    name: 'Cash',
    type: 'Cash',
    initialBalance: 0,
    note: 'Dompet tunai harian',
  },
  {
    id: 'acc-shopeepay',
    name: 'ShopeePay',
    type: 'E-Wallet',
    initialBalance: 0,
    note: 'Akun digital ShopeePay / QRIS',
  },
  {
    id: 'acc-seabank',
    name: 'SeaBank',
    type: 'Bank',
    initialBalance: 0,
    note: 'Rekening tabungan SeaBank',
  },
];

export const DEFAULT_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'goal-2026-09',
    name: 'Target Tabungan September 2026',
    periodKey: '2026-09',
    targetAmount: 300000,
    manualSaved: 0,
    targetDate: '2026-09-30',
  },
  {
    id: 'goal-2026-10',
    name: 'Target Tabungan Oktober 2026',
    periodKey: '2026-10',
    targetAmount: 300000,
    manualSaved: 0,
    targetDate: '2026-10-31',
  },
  {
    id: 'goal-2026-11',
    name: 'Target Tabungan November 2026',
    periodKey: '2026-11',
    targetAmount: 300000,
    manualSaved: 0,
    targetDate: '2026-11-30',
  },
];

export const BASE_PERIOD_OPTIONS = [
  { value: 'all', label: 'Semua Periode' },
  { value: '2026-09', label: 'September 2026' },
  { value: '2026-10', label: 'Oktober 2026' },
  { value: '2026-11', label: 'November 2026' },
];
