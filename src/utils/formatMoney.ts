/**
 * Format angka mata uang dengan pemisah ribuan Indonesia.
 * Contoh:
 *   1000000 -> "Rp1.000.000"
 *   50000   -> "Rp50.000"
 *   -50000  -> "-Rp50.000"
 *   0       -> "Rp0"
 */
export function formatMoney(value: number | string | null | undefined): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'Rp0';
  const rounded = Math.round(num);
  const formattedAbs = Math.abs(rounded).toLocaleString('id-ID');
  if (rounded < 0) {
    return `-Rp${formattedAbs}`;
  }
  return `Rp${formattedAbs}`;
}

export function formatNumberPlain(value: number | string | null | undefined): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return Math.round(num).toLocaleString('id-ID');
}

/**
 * Hitung interval & ticks sumbu Y/X otomatis yang mudah dibaca
 * (misal Rp10.000, Rp50.000, Rp100.000, Rp500.000, Rp1.000.000) sesuai rentang data aktual.
 */
export function computeNiceAxisScale(values: number[]): {
  domain: [number, number];
  ticks: number[];
  step: number;
} {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return {
      domain: [0, 100000],
      ticks: [0, 25000, 50000, 75000, 100000],
      step: 25000,
    };
  }

  const rawMin = Math.min(0, ...finite);
  const rawMax = Math.max(0, ...finite);
  const span = Math.max(10000, rawMax - rawMin);

  const niceSteps = [
    2000,
    5000,
    10000,
    20000,
    25000,
    50000,
    100000,
    200000,
    250000,
    500000,
    1000000,
    2000000,
    5000000,
  ];

  const idealStep = span / 5;
  const step =
    niceSteps.find((s) => s >= idealStep) ||
    Math.ceil(idealStep / 1000000) * 1000000;

  const domainMin = rawMin < 0 ? Math.floor(rawMin / step) * step : 0;
  let domainMax = Math.ceil(rawMax / step) * step;
  if (domainMax <= domainMin) {
    domainMax = domainMin + step * 4;
  }

  const ticks: number[] = [];
  for (let cur = domainMin; cur <= domainMax; cur += step) {
    ticks.push(cur);
  }

  return {
    domain: [domainMin, domainMax],
    ticks,
    step,
  };
}

/**
 * Membersihkan format mata uang dari Excel/CSV seperti:
 * "Rp 1.000.000", "1,000,000", "1.000.000", "Rp299.500" -> 1000000 / 299500
 */
export function parseCurrencyString(raw: unknown, allowNegative = false): number {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return 0;
    const rounded = Math.round(raw);
    return allowNegative ? rounded : Math.max(0, rounded);
  }
  if (raw === null || raw === undefined) return 0;
  let str = String(raw).trim();
  if (!str || str === '-') return 0;

  const isNeg = str.startsWith('-') || (str.startsWith('(') && str.endsWith(')'));

  // Remove currency symbols and spaces
  str = str.replace(/rp/gi, '').replace(/idr/gi, '').replace(/\s+/g, '');

  // Handle decimal ending like ",00" or ".00"
  if (/[.,]00$/.test(str)) {
    str = str.slice(0, -3);
  }

  // Strip all dots and commas used as thousand separators, keep digits
  const cleaned = str.replace(/[.,]/g, '').replace(/[^\d]/g, '');
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  const signed = isNeg ? -Math.round(parsed) : Math.round(parsed);
  return allowNegative ? signed : Math.max(0, signed);
}

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTH_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export const MONTH_LOOKUP: Record<string, number> = {
  januari: 1,
  january: 1,
  jan: 1,
  februari: 2,
  february: 2,
  feb: 2,
  maret: 3,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  june: 6,
  jun: 6,
  juli: 7,
  july: 7,
  jul: 7,
  agustus: 8,
  august: 8,
  agu: 8,
  ags: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  october: 10,
  okt: 10,
  oct: 10,
  november: 11,
  nov: 11,
  nopember: 11,
  nop: 11,
  desember: 12,
  december: 12,
  des: 12,
  dec: 12,
};

export function parseBulanToPeriodKey(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}$/.test(s)) return s;

  // e.g. "November 2026" or "Nov 2026"
  const matchWordYear = s.match(/([a-zA-Z]+)\s+(\d{4})/);
  if (matchWordYear) {
    const monthNum = MONTH_LOOKUP[matchWordYear[1].toLowerCase()];
    if (monthNum) {
      return `${matchWordYear[2]}-${String(monthNum).padStart(2, '0')}`;
    }
  }

  // e.g. "2026-11-16" or "2026/11"
  const matchIso = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (matchIso) {
    const m = parseInt(matchIso[2], 10);
    if (m >= 1 && m <= 12) return `${matchIso[1]}-${String(m).padStart(2, '0')}`;
  }

  // e.g. "11/2026"
  const matchMy = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (matchMy) {
    const m = parseInt(matchMy[1], 10);
    if (m >= 1 && m <= 12) return `${matchMy[2]}-${String(m).padStart(2, '0')}`;
  }

  return '';
}

export function getMonthKey(dateStr: string): string {
  if (!dateStr) return '';
  const match = dateStr.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  return '';
}

export function getMonthLabel(monthKey: string): string {
  if (!monthKey || monthKey === 'all') return 'Semua Periode';
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(monthIdx)) return monthKey;
  return `${MONTH_NAMES_ID[monthIdx]} ${year}`;
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const monthIdx = parseInt(m, 10) - 1;
  if (monthIdx < 0 || monthIdx > 11 || Number.isNaN(monthIdx)) return dateStr;
  return `${d} ${MONTH_SHORT_ID[monthIdx]} ${y}`;
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
