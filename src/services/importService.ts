import * as XLSX from 'xlsx';
import { inferAccountFromMethod } from '../data/initialData';
import {
  Account,
  ExpenseNature,
  ImportPreviewRow,
  ImportSummary,
  Transaction,
  TransactionType,
} from '../types/finance';
import { computeAccountBalances, computeKpis } from '../utils/calculations';
import {
  getMonthKey,
  getMonthLabel,
  MONTH_LOOKUP,
  parseBulanToPeriodKey,
  parseCurrencyString,
} from '../utils/formatMoney';
import { validateFinanceDataset } from '../utils/validation';

const HEADER_ALIASES: Record<string, string> = {
  id: 'id',
  no_transaksi: 'id',
  transaction_id: 'id',
  kode_transaksi: 'id',
  no: 'id',

  transfer_id: 'transferId',
  transferid: 'transferId',
  id_transfer: 'transferId',
  kode_transfer: 'transferId',
  ref: 'transferId',
  no_referensi: 'transferId',
  no_ref: 'transferId',

  tanggal: 'tanggal',
  date: 'tanggal',
  tgl: 'tanggal',
  waktu: 'tanggal',
  time: 'tanggal',
  datetime: 'tanggal',
  hari_tanggal: 'tanggal',
  tgl_transaksi: 'tanggal',

  tipe: 'tipe',
  type: 'tipe',
  tipe_transaksi: 'tipe',
  tipetransaksi: 'tipe',
  jenis_transaksi: 'tipe',
  status_transaksi: 'tipe',
  direction: 'tipe',
  arus_kas: 'tipe',

  kategori: 'kategori',
  category: 'kategori',
  pos: 'kategori',
  pos_anggaran: 'kategori',
  kelompok: 'kategori',
  subkategori: 'kategori',
  jenis_belanja: 'kategori',

  metode: 'metode',
  method: 'metode',
  metode_pembayaran: 'metode',
  metodepembayaran: 'metode',
  metode_bayar: 'metode',
  metodebayar: 'metode',
  payment_method: 'metode',
  pembayaran: 'metode',
  cara_bayar: 'metode',
  channel: 'metode',
  via: 'metode',

  akun: 'akun',
  account: 'akun',
  dompet: 'akun',
  rekening: 'akun',
  sumber_dana: 'akun',
  wallet: 'akun',
  bank: 'akun',
  rekening_sumber: 'akun',

  pemasukan: 'masuk',
  masuk: 'masuk',
  income: 'masuk',
  kredit: 'masuk',
  uang_masuk: 'masuk',
  debit_masuk: 'masuk',
  cr: 'masuk',
  inflow: 'masuk',

  pengeluaran: 'keluar',
  keluar: 'keluar',
  expense: 'keluar',
  debit: 'keluar',
  uang_keluar: 'keluar',
  db: 'keluar',
  outflow: 'keluar',
  biaya_keluar: 'keluar',

  nominal: 'nominal',
  nominal_rupiah: 'nominal',
  nominalrupiah: 'nominal',
  nominal_rp: 'nominal',
  nominalrp: 'nominal',
  jumlah: 'nominal',
  amount: 'nominal',
  total: 'nominal',
  biaya: 'nominal',
  harga: 'nominal',
  nilai: 'nominal',
  rupiah: 'nominal',
  net: 'nominal',
  val: 'nominal',

  keterangan: 'keterangan',
  description: 'keterangan',
  catatan: 'keterangan',
  note: 'keterangan',
  uraian: 'keterangan',
  deskripsi: 'keterangan',
  rincian: 'keterangan',
  transaksi: 'keterangan',
  detail: 'keterangan',
  memo: 'keterangan',

  jenispengeluaran: 'jenisPengeluaran',
  jenis_pengeluaran: 'jenisPengeluaran',
  jenis: 'jenisPengeluaran',
  nature: 'jenisPengeluaran',
  tipe_pengeluaran: 'jenisPengeluaran',
  sifat_pengeluaran: 'jenisPengeluaran',
  kebutuhan_keinginan: 'jenisPengeluaran',

  saldo: 'saldo',
  balance: 'saldo',
  sisa_saldo: 'saldo',
  sisa: 'saldo',

  bulan: 'bulan',
  month: 'bulan',
  periode: 'bulan',
};

function normalizeHeader(header: string): string {
  const cleaned = header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return HEADER_ALIASES[cleaned] || cleaned;
}

function normalizeDate(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '';

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getFullYear();
    const m = String(raw.getMonth() + 1).padStart(2, '0');
    const d = String(raw.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Excel serial number date (including fractional time part)
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 1000 && raw < 200000) {
    const parsed = XLSX.SSF.parse_date_code(Math.floor(raw));
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }

  let str = String(raw).trim();
  if (!str) return '';

  // Numeric string representing Excel serial date
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const serial = Math.floor(Number(str));
    if (serial > 1000 && serial < 200000) {
      const parsed = XLSX.SSF.parse_date_code(serial);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      }
    }
  }

  // Strip optional Indonesian/English weekday prefix e.g. "Senin, 16 November 2026"
  str = str.replace(/^[a-zA-Z]+,\s*/, '');

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s.*)?$/);
  if (dmyMatch) {
    const part1 = parseInt(dmyMatch[1], 10);
    const part2 = parseInt(dmyMatch[2], 10);
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;

    // Standard Indonesian DD/MM/YYYY; if part2 > 12 and part1 <= 12, swap as MM/DD/YYYY
    let day = part1;
    let month = part2;
    if (month > 12 && day <= 12) {
      day = part2;
      month = part1;
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Indonesian or English month name: "16 November 2026", "16 Nov 2026", "16-Nov-2026"
  const dMonthY = str.match(/^(\d{1,2})[\s-]+([a-zA-Z]+)[\s,-]+(\d{2,4})/);
  if (dMonthY) {
    const day = parseInt(dMonthY[1], 10);
    const monthNum = MONTH_LOOKUP[dMonthY[2].toLowerCase()];
    let year = dMonthY[3];
    if (year.length === 2) year = `20${year}`;
    if (monthNum && day >= 1 && day <= 31) {
      return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Month Day, Year: "November 16, 2026"
  const monthDY = str.match(/^([a-zA-Z]+)\s+(\d{1,2})[,\s]+(\d{4})/);
  if (monthDY) {
    const monthNum = MONTH_LOOKUP[monthDY[1].toLowerCase()];
    const day = parseInt(monthDY[2], 10);
    const year = monthDY[3];
    if (monthNum && day >= 1 && day <= 31) {
      return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const parsedDate = new Date(str);
  if (!Number.isNaN(parsedDate.getTime())) {
    const y = parsedDate.getFullYear();
    const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const d = String(parsedDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return '';
}

function isTotalRow(values: unknown[]): boolean {
  return values.some((val) => {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim().toLowerCase();
    return (
      trimmed === 'total' ||
      trimmed === 'grand total' ||
      trimmed === 'jumlah total' ||
      trimmed === 'subtotal' ||
      trimmed.startsWith('total ') ||
      trimmed.startsWith('total:') ||
      trimmed.startsWith('grand total')
    );
  });
}

function findHeaderRowIndex(matrix: unknown[][]): number {
  const limit = Math.min(20, matrix.length);
  for (let i = 0; i < limit; i += 1) {
    const row = matrix[i] || [];
    const normalized = row.map((cell) => normalizeHeader(String(cell ?? '')));
    const hasTanggal = normalized.includes('tanggal');
    const hasFinancialCol =
      normalized.includes('masuk') ||
      normalized.includes('keluar') ||
      normalized.includes('nominal') ||
      normalized.includes('keterangan') ||
      normalized.includes('kategori') ||
      normalized.includes('tipe');
    if (hasTanggal && hasFinancialCol) {
      return i;
    }
  }
  return -1;
}

function parseSemicolonCsvFallback(text: string): unknown[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  return lines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ';' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  });
}

function buildRowSignature(row: {
  tanggal: string;
  tipe: TransactionType;
  kategori: string;
  jenisPengeluaran: string;
  metode: string;
  akun: string;
  masuk: number;
  keluar: number;
  keterangan: string;
}): string {
  return [
    row.tanggal,
    row.tipe,
    row.kategori.toLowerCase().trim(),
    String(row.jenisPengeluaran || '').toLowerCase().trim(),
    row.metode.toLowerCase().trim(),
    row.akun.toLowerCase().trim(),
    Number(row.masuk) || 0,
    Number(row.keluar) || 0,
    row.keterangan.toLowerCase().trim(),
  ].join('|');
}

/**
 * Normalisasi variasi nama kategori menjadi standar rapi aplikasi.
 */
export function normalizeImportedCategory(
  rawCat: string,
  rawKet: string,
  tipe: TransactionType
): string {
  const catTrim = (rawCat || '').trim();
  const lowerCat = catTrim.toLowerCase();
  const lowerKet = (rawKet || '').toLowerCase();

  // 1. Pemetaan kategori langsung
  if (
    /^(bensin|uang\s*bensin|bbm|pertalite|pertamax|solar|parkir|ongkir|transport|transportasi|ojol|grab|gojek|toll|tol)/i.test(
      lowerCat
    )
  ) {
    return 'Transportasi';
  }
  if (
    /^(makanan|makan|minuman|minum|kuliner|konsumsi|food|beverage|makanan\s*(dan|&)\s*minuman)/i.test(
      lowerCat
    )
  ) {
    return 'Makanan dan Minuman';
  }
  if (
    /^(internet|kuota|kuota\s*internet|paket\s*data|pulsa|wifi|indihome|biznet|pln|listrik|pdam|air|tagihan|utilitas|langganan|subscription)/i.test(
      lowerCat
    )
  ) {
    return 'Tagihan & Internet';
  }
  if (
    /^(skincare|skin\s*care|perawatan|sabun|sampo|odol|kebersihan|laundry|kebutuhan\s*pribadi|personal\s*care)/i.test(
      lowerCat
    )
  ) {
    return 'Kebutuhan Pribadi';
  }
  if (
    /^(hiburan|entertainment|bioskop|nonton|game|gaming|topup\s*game|steam|wisata|rekreasi|hobi)/i.test(
      lowerCat
    )
  ) {
    return 'Hiburan';
  }
  if (
    /^(belanja|shopping|baju|pakaian|sepatu|tas|aksesoris|elektronik)/i.test(lowerCat)
  ) {
    return 'Belanja';
  }
  if (
    /^(tabungan|saving|investasi|reksadana|deposito|seabank|tabung)/i.test(lowerCat)
  ) {
    return 'Tabungan';
  }
  if (/^(transfer|mutasi|pindah\s*dana|top\s*up)/i.test(lowerCat)) {
    return 'Transfer';
  }
  if (
    /^(gaji|salary|pemasukan|income|honor|bonus|freelance|omset|uang\s*saku)/i.test(
      lowerCat
    )
  ) {
    return 'Pemasukan';
  }

  // 2. Jika kategori kosong atau "Lainnya", infer dari keterangan
  if (!catTrim || lowerCat === 'lainnya' || lowerCat === 'umum' || lowerCat === '-') {
    if (
      /bensin|bbm|pertalite|pertamax|parkir|toll|tol|ojol|grab|gojek/i.test(lowerKet)
    ) {
      return 'Transportasi';
    }
    if (
      /makan|sarapan|siang|malam|nasi|warteg|resto|bakso|mie|kopi|kafe|cafe|jajan|snack/i.test(
        lowerKet
      )
    ) {
      return 'Makanan dan Minuman';
    }
    if (
      /internet|kuota|pulsa|wifi|indihome|listrik|pln|pdam|tagihan/i.test(lowerKet)
    ) {
      return 'Tagihan & Internet';
    }
    if (/skincare|sabun|sampo|odol|laundry/i.test(lowerKet)) {
      return 'Kebutuhan Pribadi';
    }
    if (/game|steam|bioskop|netflix|spotify|hiburan/i.test(lowerKet)) {
      return 'Hiburan';
    }
    if (/tabungan|seabank|nabung/i.test(lowerKet)) {
      return 'Tabungan';
    }
    if (/top up|topup|transfer/i.test(lowerKet)) {
      return 'Transfer';
    }
    if (/gaji|salary|honor|uang saku|pemasukan/i.test(lowerKet)) {
      return 'Pemasukan';
    }
    return tipe === 'Pemasukan' ? 'Pemasukan' : 'Lainnya';
  }

  return catTrim;
}

/**
 * Normalisasi dan inferensi pintar sifat pengeluaran (Kebutuhan vs Keinginan vs Tabungan/Transfer).
 */
export function normalizeExpenseNatureFromImport(params: {
  rawJenis: string;
  kategori: string;
  keterangan: string;
  tipe: TransactionType;
}): ExpenseNature {
  const { rawJenis, kategori, keterangan, tipe } = params;
  const katLower = kategori.toLowerCase().trim();
  const jenisLower = (rawJenis || '').toLowerCase().trim();
  const ketLower = (keterangan || '').toLowerCase().trim();

  if (katLower === 'transfer' || jenisLower === 'transfer') return 'Transfer';
  if (katLower === 'tabungan' || jenisLower === 'tabungan') return 'Tabungan';
  if (tipe === 'Pemasukan') return 'Pemasukan';

  if (jenisLower === 'kebutuhan') return 'Kebutuhan';
  if (jenisLower === 'keinginan') return 'Keinginan';
  if (jenisLower === 'pemasukan') return 'Pemasukan';
  if (jenisLower === 'perlu ditinjau' || jenisLower === 'tidak jelas') return 'Perlu Ditinjau';

  // Smart inference bila kolom Jenis tidak diisi:
  // Kategori diskresioner (Keinginan):
  if (
    katLower === 'hiburan' ||
    katLower === 'belanja' ||
    /jajan|kopi|cafe|kafe|starbucks|boba|nongkrong|game|steam|topup game|snack|chatime|mixue/i.test(
      ketLower
    ) ||
    /jajan|kopi|nongkrong|game/i.test(katLower)
  ) {
    return 'Keinginan';
  }

  // Kategori esensial (Kebutuhan):
  if (
    katLower === 'transportasi' ||
    katLower === 'tagihan & internet' ||
    katLower === 'kebutuhan pribadi' ||
    katLower === 'kesehatan' ||
    katLower === 'pendidikan' ||
    /bensin|pertalite|pertamax|parkir|kuota|internet|pulsa|listrik|air|pdam|kos|sewa|skincare|sabun/i.test(
      ketLower
    )
  ) {
    return 'Kebutuhan';
  }

  // Makanan pokok adalah Kebutuhan
  if (katLower === 'makanan dan minuman') {
    return 'Kebutuhan';
  }

  return 'Kebutuhan';
}

/**
 * Universal payment method & account detection for Indonesian banks, e-wallets, and cash.
 */
export interface DetectedPaymentAccount {
  akun: string;
  metode: string;
}

export function detectPaymentAndAccount(params: {
  akunRaw: string;
  metodeRaw: string;
  keterangan: string;
  kategori: string;
  masuk: number;
  keluar: number;
}): DetectedPaymentAccount {
  const { akunRaw, metodeRaw, keterangan, kategori, masuk, keluar } = params;
  const ket = (keterangan || '').toLowerCase();
  const kat = (kategori || '').toLowerCase().trim();
  const met = (metodeRaw || '').toLowerCase().trim();
  const akun = (akunRaw || '').toLowerCase().trim();

  const findBrand = (text: string): { akun: string; type: Account['type'] } | null => {
    if (/\b(seabank|sea bank)\b/.test(text)) return { akun: 'SeaBank', type: 'Bank' };
    if (/\b(shopeepay|shopee pay|spay)\b/.test(text)) return { akun: 'ShopeePay', type: 'E-Wallet' };
    if (/\b(dana)\b/.test(text)) return { akun: 'DANA', type: 'E-Wallet' };
    if (/\b(gopay|go pay|gojek)\b/.test(text)) return { akun: 'GoPay', type: 'E-Wallet' };
    if (/\b(ovo)\b/.test(text)) return { akun: 'OVO', type: 'E-Wallet' };
    if (/\b(linkaja|link aja)\b/.test(text)) return { akun: 'LinkAja', type: 'E-Wallet' };
    if (/\b(mybca|bca mobile|klikbca|bca)\b/.test(text)) return { akun: 'BCA', type: 'Bank' };
    if (/\b(mandiri|livin|livin by mandiri)\b/.test(text)) return { akun: 'Mandiri', type: 'Bank' };
    if (/\b(bri|brimo)\b/.test(text)) return { akun: 'BRI', type: 'Bank' };
    if (/\b(bni|wondr)\b/.test(text)) return { akun: 'BNI', type: 'Bank' };
    if (/\b(jago|bank jago)\b/.test(text)) return { akun: 'Bank Jago', type: 'Bank' };
    if (/\b(blu|blu by bca digital)\b/.test(text)) return { akun: 'blu', type: 'Bank' };
    if (/\b(neobank|neo bank|bnc)\b/.test(text)) return { akun: 'NeoBank', type: 'Bank' };
    if (/\b(allo|allo bank)\b/.test(text)) return { akun: 'Allo Bank', type: 'Bank' };
    if (/\b(cimb|cimb niaga|octo)\b/.test(text)) return { akun: 'CIMB Niaga', type: 'Bank' };
    if (/\b(permata|permatame)\b/.test(text)) return { akun: 'Permata', type: 'Bank' };
    if (/\b(bsi|bank syariah indonesia)\b/.test(text)) return { akun: 'BSI', type: 'Bank' };
    if (/\b(jenius|btpn)\b/.test(text)) return { akun: 'Jenius', type: 'Bank' };
    if (/\b(cash|tunai|uang tunai)\b/.test(text)) return { akun: 'Cash', type: 'Cash' };
    return null;
  };

  // 1. Cek dari kolom akun
  let detected = findBrand(akun);

  // 2. Cek dari kolom metode
  if (!detected) {
    detected = findBrand(met);
  }

  // 3. Cek dari kolom keterangan
  if (!detected) {
    detected = findBrand(ket);
  }

  const isQris = met.includes('qris') || akun === 'qris' || ket.includes('qris');
  let finalMetode = metodeRaw.trim() || (isQris ? 'QRIS' : 'Tunai');
  if (isQris && !finalMetode) finalMetode = 'QRIS';

  // Kasus khusus Tabungan SeaBank & Top Up ShopeePay:
  if (
    kat === 'tabungan' ||
    ket.includes('seabank') ||
    ket.includes('sea bank') ||
    ket.includes('setor tabungan')
  ) {
    if (keluar > 0 && masuk === 0) {
      return { akun: 'Cash', metode: finalMetode || 'Transfer' };
    }
    return { akun: 'SeaBank', metode: finalMetode || 'SeaBank' };
  }

  if (kat === 'transfer' || ket.includes('top up shopeepay') || ket.includes('topup shopeepay')) {
    if (masuk > 0 && keluar === 0) return { akun: 'ShopeePay', metode: finalMetode || 'ShopeePay' };
    if (keluar > 0 && masuk === 0) return { akun: 'Cash', metode: finalMetode || 'Transfer' };
  }

  if (detected) {
    let finalAkun = detected.akun;
    if (finalAkun === 'Tunai') finalAkun = 'Cash';
    return {
      akun: finalAkun,
      metode: finalMetode || (finalAkun === 'Cash' ? 'Tunai' : finalAkun),
    };
  }

  if (akunRaw.trim() && akun !== 'qris' && akun !== 'tunai') {
    return {
      akun: akunRaw.trim(),
      metode: finalMetode || akunRaw.trim(),
    };
  }

  if (isQris || met === 'shopeepay') {
    return { akun: 'ShopeePay', metode: isQris ? 'QRIS' : 'ShopeePay' };
  }
  if (met === 'tunai' || met === 'cash' || !met) {
    return { akun: 'Cash', metode: 'Tunai' };
  }

  return {
    akun: inferAccountFromMethod(metodeRaw),
    metode: finalMetode,
  };
}

export interface ParsedImportResult {
  fileName: string;
  fileType: 'XLSX' | 'XLS' | 'CSV';
  sheetName?: string;
  totalRowsRead: number;
  rows: ImportPreviewRow[];
  failedRows: { rowNumber: number; reason: string }[];
  error?: string;
}

export async function parseImportFile(
  file: File,
  existingTransactions: Transaction[] = []
): Promise<ParsedImportResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    return {
      fileName: file.name,
      fileType: 'CSV',
      totalRowsRead: 0,
      rows: [],
      failedRows: [],
      error: 'Format file tidak didukung. Gunakan file .xlsx, .xls, atau .csv.',
    };
  }

  const fileType = ext === 'xlsx' ? 'XLSX' : ext === 'xls' ? 'XLS' : 'CSV';

  try {
    const sheetsToParse: { sheetName: string; matrix: unknown[][] }[] = [];

    if (fileType === 'CSV') {
      const text = await file.text();
      const workbook = XLSX.read(text, { type: 'string', raw: true });
      const firstSheet = workbook.SheetNames[0];
      let matrix: unknown[][] = [];
      if (firstSheet) {
        matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], {
          header: 1,
          defval: '',
          raw: true,
        });
      }

      if (
        matrix.length > 0 &&
        matrix[0].length === 1 &&
        String(matrix[0][0] || '').includes(';')
      ) {
        matrix = parseSemicolonCsvFallback(text);
      }
      if (matrix.length > 0) {
        sheetsToParse.push({ sheetName: firstSheet || 'CSV Data', matrix });
      }
    } else {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return {
          fileName: file.name,
          fileType,
          totalRowsRead: 0,
          rows: [],
          failedRows: [],
          error: 'Workbook Excel kosong atau tidak memiliki sheet.',
        };
      }

      // Filter sheet summary/rekap jika ada sheet transaksi spesifik
      const isSummarySheetName = (name: string) =>
        /summary|rekap|ringkasan|dashboard|laporan|grafik|chart|kpi|overview/i.test(name.trim());

      const candidateSheets = workbook.SheetNames.filter((name) => !isSummarySheetName(name));
      const targetSheets = candidateSheets.length > 0 ? candidateSheets : workbook.SheetNames;

      for (const sheetName of targetSheets) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: '',
          raw: true,
        });
        if (matrix && matrix.length > 0) {
          sheetsToParse.push({ sheetName, matrix });
        }
      }
    }

    if (sheetsToParse.length === 0) {
      return {
        fileName: file.name,
        fileType,
        totalRowsRead: 0,
        rows: [],
        failedRows: [],
        error: 'Tidak ditemukan sheet data yang dapat dibaca di dalam file.',
      };
    }

    const seenExplicitIds = new Set<string>();
    const existingOccurrenceCounts = new Map<string, number>();
    const existingSaldoSignatures = new Set<string>();
    existingTransactions.forEach((tx) => {
      const sig = buildRowSignature({
        tanggal: tx.tanggal,
        tipe: tx.tipe,
        kategori: tx.kategori,
        jenisPengeluaran: String(tx.jenisPengeluaran || ''),
        metode: tx.metode,
        akun: tx.akun,
        masuk: tx.masuk,
        keluar: tx.keluar,
        keterangan: tx.keterangan,
      });
      existingOccurrenceCounts.set(sig, (existingOccurrenceCounts.get(sig) || 0) + 1);
      if (typeof tx.importedSaldo === 'number' && !Number.isNaN(tx.importedSaldo)) {
        existingSaldoSignatures.add(`${sig}|${tx.importedSaldo}`);
      }
    });

    const fileOccurrenceCounts = new Map<string, number>();
    const previewRows: ImportPreviewRow[] = [];
    const failedRows: { rowNumber: number; reason: string }[] = [];
    const processedSheetNames: string[] = [];
    let totalRowsRead = 0;

    for (const { sheetName, matrix } of sheetsToParse) {
      if (!matrix || matrix.length < 2) continue;

      const headerIdx = findHeaderRowIndex(matrix);
      if (headerIdx === -1) {
        // Bukan tabel transaksi atau tidak memiliki header tanggal & kolom nominal/masuk/keluar
        continue;
      }

      const rawHeaders = (matrix[headerIdx] || []).map((h) => String(h ?? ''));
      const normalizedHeaders = rawHeaders.map(normalizeHeader);

      const hasTanggal = normalizedHeaders.includes('tanggal');
      const hasKeterangan = normalizedHeaders.includes('keterangan');
      const hasMasuk = normalizedHeaders.includes('masuk');
      const hasKeluar = normalizedHeaders.includes('keluar');
      const hasNominal = normalizedHeaders.includes('nominal');

      if (!hasTanggal || (!hasMasuk && !hasKeluar && !hasNominal)) {
        continue;
      }

      processedSheetNames.push(sheetName);

      for (let i = headerIdx + 1; i < matrix.length; i += 1) {
        const rowValues = matrix[i];
        if (!rowValues || rowValues.every((v) => String(v ?? '').trim() === '')) {
          continue;
        }

        if (isTotalRow(rowValues)) {
          continue;
        }

        totalRowsRead += 1;

        const record: Record<string, unknown> = {};
        normalizedHeaders.forEach((key, idx) => {
          if (key) record[key] = rowValues[idx];
        });

        const issues: string[] = [];
        const tanggal = normalizeDate(record.tanggal);
        if (!tanggal) {
          issues.push(`Tanggal tidak valid (${String(record.tanggal || 'kosong')})`);
        }

        let masuk = hasMasuk ? parseCurrencyString(record.masuk) : 0;
        let keluar = hasKeluar ? parseCurrencyString(record.keluar) : 0;

        // Auto-split nominal rupiah tunggal jika masuk/keluar terpisah tidak ada
        if (hasNominal && masuk === 0 && keluar === 0) {
          const rawNom = record.nominal;
          const nomVal = parseCurrencyString(rawNom);
          const rawTipe = String(record.tipe || '').toLowerCase().trim();

          if (
            /pemasukan|masuk|income|kredit|credit|\+|in\b|terima|diterima/i.test(rawTipe)
          ) {
            masuk = nomVal;
            keluar = 0;
          } else if (
            /pengeluaran|keluar|expense|debit|debet|-|out\b|bayar|beli|potong/i.test(rawTipe)
          ) {
            keluar = nomVal;
            masuk = 0;
          } else {
            if (typeof rawNom === 'string' && rawNom.trim().startsWith('-')) {
              keluar = nomVal;
              masuk = 0;
            } else {
              const katLower = String(record.kategori || '').toLowerCase().trim();
              if (/gaji|pemasukan|salary|income|uang saku|bonus/.test(katLower)) {
                masuk = nomVal;
                keluar = 0;
              } else {
                keluar = nomVal;
                masuk = 0;
              }
            }
          }
        }

        if (masuk === 0 && keluar === 0) {
          issues.push('Pemasukan dan Pengeluaran bernilai 0');
        }

        let tipe: TransactionType = 'Pengeluaran';
        const rawTipe = String(record.tipe || '').toLowerCase().trim();
        if (
          /pemasukan|masuk|income|credit|kredit|\+|in\b|terima/i.test(rawTipe) ||
          (masuk > 0 && keluar === 0)
        ) {
          tipe = 'Pemasukan';
        } else {
          tipe = 'Pengeluaran';
        }

        const keteranganRaw = hasKeterangan ? String(record.keterangan ?? '').trim() : '';

        // Kategori dinormalisasi rapi
        const rawCat = String(record.kategori ?? '').trim();
        const kategori = normalizeImportedCategory(rawCat, keteranganRaw, tipe);

        // Deteksi metode pembayaran & akun universal
        const akunRaw = String(record.akun ?? '').trim();
        const metodeRaw = String(record.metode ?? '').trim();
        const paymentAcc = detectPaymentAndAccount({
          akunRaw,
          metodeRaw,
          keterangan: keteranganRaw,
          kategori,
          masuk,
          keluar,
        });

        const akun = paymentAcc.akun;
        const metode = paymentAcc.metode;

        const keterangan = keteranganRaw || kategori;
        if (!hasKeterangan || !keteranganRaw) {
          issues.push('Keterangan kosong');
        }

        const rawJenis = String(record.jenisPengeluaran ?? '').trim();
        const jenisPengeluaran = normalizeExpenseNatureFromImport({
          rawJenis,
          kategori,
          keterangan,
          tipe,
        });

        const rawBulan = String(record.bulan ?? '').trim();
        const bulanKeyFromRaw = rawBulan ? parseBulanToPeriodKey(rawBulan) : '';
        const monthKey = getMonthKey(tanggal) || bulanKeyFromRaw;
        const bulan = rawBulan || (monthKey ? getMonthLabel(monthKey) : '');

        const importedSaldo =
          record.saldo !== undefined && String(record.saldo).trim() !== ''
            ? parseCurrencyString(record.saldo, true)
            : undefined;

        const transferIdRaw = String(record.transferId ?? '').trim();
        const explicitId = String(record.id ?? '').trim();

        const rowSig = buildRowSignature({
          tanggal: tanggal || '-',
          tipe,
          kategori,
          jenisPengeluaran: String(jenisPengeluaran),
          metode,
          akun,
          masuk,
          keluar,
          keterangan,
        });
        const occCount = (fileOccurrenceCounts.get(rowSig) || 0) + 1;
        fileOccurrenceCounts.set(rowSig, occCount);

        const existingCount = existingOccurrenceCounts.get(rowSig) || 0;
        const saldoDup =
          typeof importedSaldo === 'number' &&
          !Number.isNaN(importedSaldo) &&
          existingSaldoSignatures.has(`${rowSig}|${importedSaldo}`);

        let isDuplicate = false;
        if (explicitId) {
          if (seenExplicitIds.has(explicitId)) {
            isDuplicate = true;
            issues.push(`ID duplikat (${explicitId})`);
          } else {
            seenExplicitIds.add(explicitId);
          }
        }
        if (!isDuplicate && (existingCount >= occCount || saldoDup)) {
          isDuplicate = true;
          issues.push('Transaksi duplikat (sudah tersimpan sebelumnya)');
        }

        let status: ImportPreviewRow['status'] = 'Valid';
        if (!tanggal) {
          status = 'Invalid';
          failedRows.push({
            rowNumber: previewRows.length + failedRows.length + 1,
            reason: `[${sheetName}] Tanggal tidak terbaca: "${String(record.tanggal ?? '')}"`,
          });
        } else if (masuk === 0 && keluar === 0) {
          status = 'Invalid';
          failedRows.push({
            rowNumber: previewRows.length + failedRows.length + 1,
            reason: `[${sheetName}] Nominal pemasukan dan pengeluaran keduanya 0`,
          });
        } else if (issues.length > 0) {
          status = 'Warning';
        }

        previewRows.push({
          rowNumber: previewRows.length + failedRows.length + 1,
          tanggal: tanggal || '-',
          tipe,
          kategori,
          metode,
          akun,
          masuk,
          keluar,
          keterangan,
          jenisPengeluaran,
          bulan,
          importedSaldo,
          transferId: transferIdRaw || undefined,
          status,
          issues,
          isDuplicate,
        });
      }
    }

    if (previewRows.length === 0) {
      return {
        fileName: file.name,
        fileType,
        sheetName: processedSheetNames.join(', ') || undefined,
        totalRowsRead,
        rows: [],
        failedRows,
        error:
          'Import gagal: kolom "Tanggal", "Keterangan", "Pemasukan", "Pengeluaran", atau "Nominal" tidak ditemukan pada sheet data.',
      };
    }

    // Pasangkan baris Transfer / Setor Tabungan dengan transferId yang sama tanpa menambah baris baru
    const validRows = previewRows.filter((r) => r.status !== 'Invalid');
    const unmatchedTransferOut: ImportPreviewRow[] = [];
    const unmatchedSavingsOut: ImportPreviewRow[] = [];
    let trfSeq = 1;
    let savSeq = 1;

    validRows.forEach((row) => {
      if (row.transferId) return;
      const jenisLower = String(row.jenisPengeluaran).toLowerCase();
      const katLower = row.kategori.toLowerCase();
      const ketLower = row.keterangan.toLowerCase();
      const akunCompact = row.akun.toLowerCase().replace(/\s+/g, '');

      const isTransfer =
        jenisLower === 'transfer' || katLower === 'transfer' || ketLower.includes('top up shopeepay');
      const isSavings =
        jenisLower === 'tabungan' ||
        katLower === 'tabungan' ||
        ketLower.includes('tabungan seabank') ||
        ketLower.includes('setor tabungan');

      if (isTransfer) {
        if (akunCompact === 'cash' && row.keluar > 0 && row.masuk === 0) {
          unmatchedTransferOut.push(row);
        } else if (akunCompact === 'shopeepay' && row.masuk > 0 && row.keluar === 0) {
          const matchIdx = unmatchedTransferOut.findIndex(
            (src) => src.tanggal === row.tanggal && src.keluar === row.masuk && !src.transferId
          );
          if (matchIdx >= 0) {
            const pairId = `TRF-${row.tanggal.replace(/-/g, '')}-${row.masuk}-${trfSeq++}`;
            unmatchedTransferOut[matchIdx].transferId = pairId;
            row.transferId = pairId;
          }
        }
      } else if (isSavings) {
        if (akunCompact === 'cash' && row.keluar > 0 && row.masuk === 0) {
          unmatchedSavingsOut.push(row);
        } else if (akunCompact === 'seabank' && row.masuk > 0 && row.keluar === 0) {
          const matchIdx = unmatchedSavingsOut.findIndex(
            (src) => src.tanggal === row.tanggal && src.keluar === row.masuk && !src.transferId
          );
          if (matchIdx >= 0) {
            const pairId = `SAV-${row.tanggal.replace(/-/g, '')}-${row.masuk}-${savSeq++}`;
            unmatchedSavingsOut[matchIdx].transferId = pairId;
            row.transferId = pairId;
          }
        }
      }
    });

    return {
      fileName: file.name,
      fileType,
      sheetName: processedSheetNames.join(', ') || undefined,
      totalRowsRead,
      rows: previewRows,
      failedRows,
    };
  } catch (err) {
    return {
      fileName: file.name,
      fileType,
      totalRowsRead: 0,
      rows: [],
      failedRows: [],
      error: `Gagal membaca file: ${err instanceof Error ? err.message : 'Kesalahan tidak diketahui'}`,
    };
  }
}

export function buildAccountsFromTransactions(
  rows: Pick<Transaction, 'akun' | 'kategori' | 'jenisPengeluaran' | 'keterangan'>[]
): Account[] {
  const result: Account[] = [];
  const seen = new Set<string>();

  const addAcc = (name: string, type: Account['type'], note: string) => {
    const key = name.toLowerCase().trim();
    // Jangan pernah membuat akun bernama QRIS atau Tunai
    if (!key || key === 'qris' || key === 'tunai' || seen.has(key)) return;
    seen.add(key);
    result.push({
      id: `acc-${key.replace(/[^a-z0-9]+/g, '-')}`,
      name,
      type,
      initialBalance: 0,
      note,
    });
  };

  // Selalu sediakan 3 akun dasar (Cash, ShopeePay, SeaBank) agar tidak pernah hilang
  addAcc('Cash', 'Cash', 'Dompet tunai harian');
  addAcc('ShopeePay', 'E-Wallet', 'Akun digital ShopeePay / QRIS');
  addAcc('SeaBank', 'Bank', 'Rekening tabungan SeaBank');

  const getAccTypeAndNote = (accName: string): { type: Account['type']; note: string } => {
    const lower = accName.toLowerCase();
    if (/\b(dana|ovo|gopay|linkaja|shopeepay|spay)\b/.test(lower)) {
      return { type: 'E-Wallet', note: `Dompet digital ${accName}` };
    }
    if (
      /\b(bca|mandiri|bri|bni|jago|blu|neobank|allo|cimb|permata|bsi|jenius|seabank)\b/.test(lower)
    ) {
      return { type: 'Bank', note: `Rekening bank ${accName}` };
    }
    if (lower === 'cash' || lower === 'tunai') {
      return { type: 'Cash', note: 'Dompet tunai' };
    }
    return { type: 'Bank', note: `Akun ${accName}` };
  };

  rows.forEach((r) => {
    const accName = (r.akun || '').trim();
    const lower = accName.toLowerCase();
    const compact = lower.replace(/\s+/g, '');

    if (compact === 'cash' || compact === 'tunai') {
      addAcc('Cash', 'Cash', 'Dompet tunai harian');
    } else if (compact === 'shopeepay') {
      addAcc('ShopeePay', 'E-Wallet', 'Akun digital ShopeePay / QRIS');
    } else if (compact === 'seabank') {
      addAcc('SeaBank', 'Bank', 'Rekening tabungan SeaBank');
    } else if (accName && compact !== 'qris') {
      const { type, note } = getAccTypeAndNote(accName);
      addAcc(accName, type, note);
    }
  });

  return result;
}

export function buildImportSummary(params: {
  parsed: ParsedImportResult;
  importedRows: ImportPreviewRow[];
  skippedDuplicateCount?: number;
}): ImportSummary {
  const { parsed, importedRows, skippedDuplicateCount = 0 } = params;
  const dates = importedRows
    .map((r) => r.tanggal)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  const earliestDate = dates[0] || '-';
  const latestDate = dates[dates.length - 1] || '-';

  const monthCountsMap = new Map<string, number>();
  importedRows.forEach((r) => {
    const mk = getMonthKey(r.tanggal) || parseBulanToPeriodKey(r.bulan);
    if (mk) {
      monthCountsMap.set(mk, (monthCountsMap.get(mk) || 0) + 1);
    }
  });

  const tempTx: Transaction[] = importedRows.map((r, idx) => ({
    id: idx + 1,
    tanggal: r.tanggal,
    tipe: r.tipe,
    kategori: r.kategori,
    metode: r.metode,
    akun: r.akun,
    masuk: r.masuk,
    keluar: r.keluar,
    keterangan: r.keterangan,
    jenisPengeluaran: r.jenisPengeluaran,
    bulan: r.bulan,
    importedSaldo: r.importedSaldo,
    transferId: r.transferId,
  }));

  const derivedAccounts = buildAccountsFromTransactions(tempTx);
  const accSummary = computeAccountBalances(derivedAccounts, tempTx);
  const kpi = computeKpis(tempTx);
  const validation = validateFinanceDataset(tempTx, derivedAccounts, { skippedDuplicateCount });

  const perMonthCounts = Array.from(monthCountsMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodKey, count]) => ({
      periodKey,
      periodLabel: getMonthLabel(periodKey),
      count,
    }));

  return {
    fileName: parsed.fileName,
    fileType: parsed.fileType,
    sheetName: parsed.sheetName,
    totalRowsRead: parsed.totalRowsRead,
    importedCount: importedRows.length,
    skippedDuplicateCount,
    failedCount: parsed.failedRows.length,
    failedReasons: parsed.failedRows,
    earliestDate,
    latestDate,
    perMonthCounts,
    cashBalance: accSummary.cashBalance,
    shopeePayBalance: accSummary.shopeePayBalance,
    seaBankBalance: accSummary.seaBankBalance,
    digitalBalance: accSummary.digitalBalance,
    totalSavings: accSummary.seaBankBalance || kpi.savingsFromTransactions,
    validation,
    importedAt: new Date().toISOString(),
  };
}

export function exportTransactionsToCsv(
  transactions: Transaction[],
  filename = 'finance-insight-transaksi.csv'
): void {
  const headers = [
    'Tanggal',
    'Keterangan',
    'Kategori',
    'Jenis',
    'Metode',
    'Akun',
    'Pemasukan',
    'Pengeluaran',
    'Bulan',
    'ID Transfer',
  ];
  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.join(','),
    ...transactions.map((t) =>
      [
        t.tanggal,
        t.keterangan,
        t.kategori,
        t.jenisPengeluaran,
        t.metode,
        t.akun,
        t.masuk,
        t.keluar,
        t.bulan || getMonthLabel(getMonthKey(t.tanggal)),
        t.transferId || '',
      ]
        .map(escapeCsv)
        .join(',')
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTransactionsToExcel(
  transactions: Transaction[],
  filename = 'finance-insight-transaksi.xlsx'
): void {
  const rows = transactions.map((t) => ({
    Tanggal: t.tanggal,
    Keterangan: t.keterangan,
    Kategori: t.kategori,
    Jenis: t.jenisPengeluaran,
    Metode: t.metode,
    Akun: t.akun,
    Pemasukan: t.masuk,
    Pengeluaran: t.keluar,
    Bulan: t.bulan || getMonthLabel(getMonthKey(t.tanggal)),
    'ID Transfer': t.transferId || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Keuangan');
  XLSX.writeFile(workbook, filename);
}

/**
 * Ekstraksi Spreadsheet ID dan GID opsional dari URL Google Sheets.
 * Mendukung format URL edit, view, pubhtml, atau query parameters.
 */
export function extractGoogleSheetsInfo(url: string): {
  spreadsheetId: string | null;
  gid: string | null;
} {
  const trimmed = url.trim();
  const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = idMatch ? idMatch[1] : null;

  let gid: string | null = null;
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
  if (gidMatch) {
    gid = gidMatch[1];
  }

  return { spreadsheetId, gid };
}

/**
 * Mengambil workbook Google Sheets langsung dalam format .xlsx (multi-sheet support)
 * atau fallback .csv jika diperlukan.
 */
export async function fetchGoogleSheetAsFile(url: string): Promise<File> {
  const { spreadsheetId, gid } = extractGoogleSheetsInfo(url);
  if (!spreadsheetId) {
    throw new Error('Link Google Sheets tidak valid. Pastikan menyalin URL lengkap dari browser.');
  }

  const xlsxUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;

  let response: Response;
  try {
    response = await fetch(xlsxUrl, { redirect: 'follow' });
  } catch {
    throw new Error(
      'Gagal mengakses Google Sheets. Pastikan izin berbagi sudah diubah ke "Siapa saja yang memiliki link (Viewer)" dan koneksi internet stabil.'
    );
  }

  if (!response.ok) {
    if (gid) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
      try {
        const csvResponse = await fetch(csvUrl, { redirect: 'follow' });
        if (csvResponse.ok) {
          const blob = await csvResponse.blob();
          return new File([blob], `GoogleSheet-${spreadsheetId}.csv`, { type: 'text/csv' });
        }
      } catch {
        // Abaikan dan gunakan pesan error di bawah
      }
    }

    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new Error(
        'Gagal mengakses Google Sheets. Pastikan izin berbagi sudah diubah ke "Siapa saja yang memiliki link (Viewer)".'
      );
    }

    throw new Error(
      `Gagal mengunduh Google Sheets (Status ${response.status}). Pastikan dokumen tidak terkunci dan tautan masih aktif.`
    );
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(
      'Gagal mengakses Google Sheets. Dokumen bersifat privat. Pastikan izin berbagi sudah diubah ke "Siapa saja yang memiliki link (Viewer)".'
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength < 50) {
    const textPreview = new TextDecoder().decode(arrayBuffer);
    if (textPreview.includes('<html') || textPreview.includes('<!DOCTYPE')) {
      throw new Error(
        'Gagal mengakses Google Sheets. Dokumen bersifat privat. Pastikan izin berbagi sudah diubah ke "Siapa saja yang memiliki link (Viewer)".'
      );
    }
  }

  let fileName = `GoogleSheet-${spreadsheetId}.xlsx`;
  const disposition = response.headers.get('content-disposition');
  if (disposition) {
    const fnMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    if (fnMatch && fnMatch[1]) {
      try {
        fileName = decodeURIComponent(fnMatch[1].trim());
      } catch {
        fileName = fnMatch[1].trim();
      }
      if (!fileName.toLowerCase().endsWith('.xlsx') && !fileName.toLowerCase().endsWith('.csv')) {
        fileName += '.xlsx';
      }
    }
  }

  return new File([arrayBuffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Mengunduh dan langsung mem-parsing Google Sheets via URL menggunakan parser pintar aplikasi.
 */
export async function parseGoogleSheetUrl(
  url: string,
  existingTransactions: Transaction[] = []
): Promise<ParsedImportResult> {
  try {
    const file = await fetchGoogleSheetAsFile(url);
    const parsed = await parseImportFile(file, existingTransactions);
    return parsed;
  } catch (err) {
    return {
      fileName: 'Google Sheets',
      fileType: 'XLSX',
      totalRowsRead: 0,
      rows: [],
      failedRows: [],
      error: err instanceof Error ? err.message : 'Gagal memproses link Google Sheets.',
    };
  }
}
