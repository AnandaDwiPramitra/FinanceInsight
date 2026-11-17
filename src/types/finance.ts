export type TransactionType = 'Pemasukan' | 'Pengeluaran';

export type ExpenseNature =
  | 'Kebutuhan'
  | 'Keinginan'
  | 'Pemasukan'
  | 'Transfer'
  | 'Tabungan'
  | 'Perlu Ditinjau'
  | (string & {});

export type AccountType = 'Cash' | 'Bank' | 'E-Wallet';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface Transaction {
  id: number;
  tanggal: string; // YYYY-MM-DD
  tipe: TransactionType;
  kategori: string;
  metode: string;
  akun: string;
  masuk: number;
  keluar: number;
  keterangan: string;
  jenisPengeluaran: ExpenseNature;
  bulan?: string;
  importedSaldo?: number;
  transferId?: string;
}

export interface TransactionWithBalance extends Transaction {
  runningBalance: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  note?: string;
}

export interface AccountWithBalance extends Account {
  totalIn: number;
  totalOut: number;
  currentBalance: number;
  transactionCount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  periodKey: string; // e.g., '2026-09', '2026-10', '2026-11' or 'custom'
  targetAmount: number;
  manualSaved: number;
  targetDate: string; // YYYY-MM-DD
}

export interface SavingsGoalProgress extends SavingsGoal {
  transactionSaved: number;
  collectedAmount: number;
  shortfall: number;
  percentage: number;
  status: 'Tercapai' | 'Berjalan' | 'Belum Dimulai';
}

export interface PeriodOption {
  value: string; // 'all' or 'YYYY-MM'
  label: string;
}

export interface InsightItem {
  id: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  category: string;
  title: string;
  message: string;
}

export interface HealthScoreFactor {
  label: string;
  score: number;
  maxScore: number;
  detail: string;
}

export interface HealthScoreResult {
  score: number;
  label: 'Sangat Sehat' | 'Sehat' | 'Cukup' | 'Perlu Perhatian';
  factors: HealthScoreFactor[];
}

export interface OptimizationResult {
  periodLabel: string;
  income: number;
  actualExpense: number;
  savingsTarget: number;
  availableForSpending: number;
  remainingSpendingLimit: number;
  isOverLimit: boolean;
  overLimitAmount: number;
  remainingDays: number;
  dailySpendingLimit: number;
  averageDailyExpense: number;
  recommendations: {
    title: string;
    detail: string;
    potentialSaving: number;
    priority: 'Tinggi' | 'Sedang' | 'Rendah';
  }[];
}

export interface MonthlySummary {
  periodKey: string;
  periodLabel: string;
  income: number;
  expense: number;
  balance: number;
  savings: number;
  latestDate: string;
  daysRecorded: number;
  daysInMonth: number;
  isPartial: boolean;
}

export interface PredictionRange {
  min: number;
  max: number;
}

export interface PredictionAccountBreakdown {
  cash: number;
  shopeePay: number;
  seaBank: number;
  total: number;
}

export interface PredictionResult {
  available: boolean;
  isLimited: boolean;
  confidenceLevel: 'Tinggi' | 'Sedang' | 'Rendah';
  confidenceReason: string;
  monthsCount: number;
  fullMonthsCount: number;
  history: MonthlySummary[];
  predictedIncome: number;
  predictedExpense: number;
  predictedBalance: number;
  estimatedSavings: number;
  incomeRange: PredictionRange;
  expenseRange: PredictionRange;
  balanceRange: PredictionRange;
  currentAccounts: PredictionAccountBreakdown;
  assumptions: string[];
  negativeBalanceReason?: string;
  note: string;
}

export interface ValidationCheckItem {
  id: number;
  label: string;
  passed: boolean;
  detail: string;
}

export interface DatasetValidationReport {
  allPassed: boolean;
  passedCount: number;
  totalCount: number;
  checks: ValidationCheckItem[];
}

export interface AiAnalysisResult {
  source: 'gemini' | 'fallback';
  generatedAt: string;
  kondisiKeuangan: string;
  prediksi: string;
  risiko: string[];
  rekomendasi: string[];
  targetTabungan: string;
  errorNote?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  tanggal: string;
  tipe: TransactionType;
  kategori: string;
  metode: string;
  akun: string;
  masuk: number;
  keluar: number;
  keterangan: string;
  jenisPengeluaran: ExpenseNature;
  bulan: string;
  importedSaldo?: number;
  transferId?: string;
  status: 'Valid' | 'Warning' | 'Invalid';
  issues: string[];
  isDuplicate: boolean;
}

export interface ImportSummary {
  fileName: string;
  fileType: 'XLSX' | 'XLS' | 'CSV';
  sheetName?: string;
  totalRowsRead: number;
  importedCount: number;
  skippedDuplicateCount: number;
  failedCount: number;
  failedReasons: { rowNumber: number; reason: string }[];
  earliestDate: string;
  latestDate: string;
  perMonthCounts: { periodKey: string; periodLabel: string; count: number }[];
  cashBalance: number;
  shopeePayBalance: number;
  seaBankBalance: number;
  digitalBalance: number;
  totalSavings: number;
  validation?: DatasetValidationReport;
  importedAt: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}
