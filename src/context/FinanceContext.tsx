import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { buildAccountsFromTransactions } from '../services/importService';
import {
  clearAllUserTransactionData,
  getLastImportSummary,
  getUserAccounts,
  getUserCategories,
  getUserSavingsGoals,
  getUserTransactions,
  resetUserDemoData,
  saveLastImportSummary,
  saveUserAccounts,
  saveUserCategories,
  saveUserSavingsGoals,
  saveUserTransactions,
} from '../services/storageService';
import {
  Account,
  AccountType,
  AccountWithBalance,
  DatasetValidationReport,
  HealthScoreResult,
  ImportSummary,
  InsightItem,
  OptimizationResult,
  PeriodOption,
  PredictionResult,
  SavingsGoal,
  SavingsGoalProgress,
  Transaction,
  TransactionWithBalance,
} from '../types/finance';
import {
  buildCategoryExpenseData,
  buildMoneyActivityData,
  buildNeedsVsWantsData,
  buildPaymentMethodData,
  buildTrendData,
  computeAccountBalances,
  computeFinancialHealthScore,
  computeKpis,
  computeSavingsProgress,
  computeTransactionsWithBalance,
  filterTransactionsByPeriod,
  getAvailablePeriods,
  KpiSummary,
  resolveTransactionPeriodKey,
} from '../utils/calculations';
import { computePeriodComparison, generateFinancialInsights, PeriodComparison } from '../utils/insights';
import { computeOptimization } from '../utils/optimization';
import { computeMovingAveragePrediction } from '../utils/prediction';
import { validateFinanceDataset } from '../utils/validation';
import { useAuth } from './AuthContext';

interface FinanceContextValue {
  transactions: Transaction[];
  transactionsWithBalance: TransactionWithBalance[];
  filteredTransactions: Transaction[];
  filteredTransactionsWithBalance: TransactionWithBalance[];
  accounts: Account[];
  accountsWithBalance: AccountWithBalance[];
  cashBalance: number;
  shopeePayBalance: number;
  seaBankBalance: number;
  bankBalance: number;
  ewalletBalance: number;
  digitalBalance: number;
  liquidBalance: number;
  totalAccountBalance: number;
  savingsGoals: SavingsGoal[];
  goalsProgress: SavingsGoalProgress[];
  activeSavingsTarget: number;
  activeSavingsCollected: number;
  activeSavingsPercentage: number;
  categories: string[];
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  availablePeriods: PeriodOption[];
  kpi: KpiSummary;
  trendData: ReturnType<typeof buildTrendData>;
  categoryExpenseData: ReturnType<typeof buildCategoryExpenseData>;
  paymentMethodData: ReturnType<typeof buildPaymentMethodData>;
  needsVsWantsData: ReturnType<typeof buildNeedsVsWantsData>;
  moneyActivityData: ReturnType<typeof buildMoneyActivityData>;
  insights: InsightItem[];
  periodComparison: PeriodComparison;
  optimization: OptimizationResult;
  prediction: PredictionResult;
  healthScore: HealthScoreResult;
  validationReport: DatasetValidationReport;
  lastImportSummary: ImportSummary | null;
  addTransaction: (tx: Omit<Transaction, 'id'>) => Transaction;
  bulkImportTransactions: (
    rows: Omit<Transaction, 'id'>[],
    options?: { replaceExisting?: boolean; summary?: ImportSummary }
  ) => number;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: number) => void;
  addCategory: (name: string) => void;
  addAccount: (acc: Omit<Account, 'id'>) => void;
  updateAccount: (acc: Account) => void;
  deleteAccount: (id: string) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  updateSavingsGoal: (goal: SavingsGoal) => void;
  deleteSavingsGoal: (id: string) => void;
  resetAllData: () => void;
  resetDemoData: () => void;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [lastImportSummary, setLastImportSummary] = useState<ImportSummary | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setAccounts([]);
      setSavingsGoals([]);
      setCategories([]);
      setLastImportSummary(null);
      setSelectedPeriod('all');
      return;
    }

    const rawTx = getUserTransactions(user.id);
    const userTx = rawTx.map((t) => {
      if (t.tipe === 'Pemasukan' && String(t.jenisPengeluaran || '').toLowerCase().trim() === 'tidak berlaku') {
        return { ...t, jenisPengeluaran: 'Pemasukan' as const };
      }
      return t;
    });
    const rawAcc = getUserAccounts(user.id);
    let userAcc = rawAcc;
    if (rawAcc.length > 0 && !rawAcc.some((a) => a.name.toLowerCase().replace(/\s+/g, '') === 'seabank')) {
      userAcc = [
        ...rawAcc,
        {
          id: 'acc-seabank',
          name: 'SeaBank',
          type: 'Bank',
          initialBalance: 0,
          note: 'Rekening tabungan SeaBank',
        },
      ];
      saveUserAccounts(user.id, userAcc);
    }
    const userGoals = getUserSavingsGoals(user.id);
    const userCats = getUserCategories(user.id);
    const userImportSummary = getLastImportSummary(user.id);

    setTransactions(userTx);
    setAccounts(userAcc);
    setSavingsGoals(userGoals);
    setCategories(userCats);
    setLastImportSummary(userImportSummary);
    setSelectedPeriod('all');
  }, [user]);

  const persistTransactions = useCallback(
    (next: Transaction[]) => {
      setTransactions(next);
      if (user) saveUserTransactions(user.id, next);
    },
    [user]
  );

  const persistAccounts = useCallback(
    (next: Account[]) => {
      setAccounts(next);
      if (user) saveUserAccounts(user.id, next);
    },
    [user]
  );

  const persistSavingsGoals = useCallback(
    (next: SavingsGoal[]) => {
      setSavingsGoals(next);
      if (user) saveUserSavingsGoals(user.id, next);
    },
    [user]
  );

  const persistCategories = useCallback(
    (next: string[]) => {
      setCategories(next);
      if (user) saveUserCategories(user.id, next);
    },
    [user]
  );

  const addCategory = useCallback(
    (name: string) => {
      const cleaned = name.trim();
      if (!cleaned) return;
      if (categories.some((c) => c.toLowerCase() === cleaned.toLowerCase())) return;
      persistCategories([...categories, cleaned]);
    },
    [categories, persistCategories]
  );

  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id'>) => {
      const maxId = transactions.reduce((max, item) => Math.max(max, item.id), 0);
      const created: Transaction = {
        ...tx,
        id: maxId + 1,
      };
      if (
        tx.kategori.trim() &&
        !categories.some((c) => c.toLowerCase() === tx.kategori.trim().toLowerCase())
      ) {
        persistCategories([...categories, tx.kategori.trim()]);
      }
      persistTransactions([...transactions, created]);
      return created;
    },
    [transactions, categories, persistCategories, persistTransactions]
  );

  const bulkImportTransactions = useCallback(
    (
      rows: Omit<Transaction, 'id'>[],
      options?: { replaceExisting?: boolean; summary?: ImportSummary }
    ) => {
      if (rows.length === 0) return 0;
      const replaceExisting = Boolean(options?.replaceExisting);
      const baseTransactions = replaceExisting ? [] : transactions;
      let nextId = baseTransactions.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const newItems: Transaction[] = rows.map((r) => ({
        ...r,
        id: nextId++,
      }));

      const nextCats: string[] = replaceExisting ? [] : [...categories];
      newItems.forEach((item) => {
        const cat = item.kategori.trim();
        if (cat && !nextCats.some((c) => c.toLowerCase() === cat.toLowerCase())) {
          nextCats.push(cat);
        }
      });
      persistCategories(nextCats);

      // Sinkronkan akun langsung dari hasil import (Cash, ShopeePay, SeaBank) tanpa membuat akun fiktif BCA
      const derivedAccounts = buildAccountsFromTransactions(newItems);
      let nextAccounts: Account[] = replaceExisting
        ? derivedAccounts
        : [...accounts];

      if (!replaceExisting) {
        derivedAccounts.forEach((acc) => {
          if (!nextAccounts.some((a) => a.name.toLowerCase().trim() === acc.name.toLowerCase().trim())) {
            nextAccounts = [...nextAccounts, acc];
          }
        });
      }

      persistAccounts(nextAccounts);
      persistTransactions([...baseTransactions, ...newItems]);
      setSelectedPeriod('all');

      if (options?.summary) {
        setLastImportSummary(options.summary);
        if (user) saveLastImportSummary(user.id, options.summary);
      }

      return newItems.length;
    },
    [transactions, categories, accounts, user, persistCategories, persistAccounts, persistTransactions]
  );

  const updateTransaction = useCallback(
    (updated: Transaction) => {
      if (
        updated.kategori.trim() &&
        !categories.some((c) => c.toLowerCase() === updated.kategori.trim().toLowerCase())
      ) {
        persistCategories([...categories, updated.kategori.trim()]);
      }
      const next = transactions.map((t) => (t.id === updated.id ? updated : t));
      persistTransactions(next);
    },
    [transactions, categories, persistCategories, persistTransactions]
  );

  const deleteTransaction = useCallback(
    (id: number) => {
      persistTransactions(transactions.filter((t) => t.id !== id));
    },
    [transactions, persistTransactions]
  );

  const addAccount = useCallback(
    (acc: Omit<Account, 'id'>) => {
      const created: Account = {
        ...acc,
        id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      };
      persistAccounts([...accounts, created]);
    },
    [accounts, persistAccounts]
  );

  const updateAccount = useCallback(
    (updated: Account) => {
      const previous = accounts.find((a) => a.id === updated.id);
      const nextAccounts = accounts.map((a) => (a.id === updated.id ? updated : a));
      persistAccounts(nextAccounts);

      // Sinkronkan nama akun pada transaksi terkait jika nama akun berubah
      if (previous && previous.name !== updated.name) {
        const nextTx = transactions.map((t) =>
          t.akun.toLowerCase().trim() === previous.name.toLowerCase().trim()
            ? { ...t, akun: updated.name }
            : t
        );
        persistTransactions(nextTx);
      }
    },
    [accounts, transactions, persistAccounts, persistTransactions]
  );

  const deleteAccount = useCallback(
    (id: string) => {
      persistAccounts(accounts.filter((a) => a.id !== id));
    },
    [accounts, persistAccounts]
  );

  const addSavingsGoal = useCallback(
    (goal: Omit<SavingsGoal, 'id'>) => {
      const created: SavingsGoal = {
        ...goal,
        id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      };
      persistSavingsGoals([...savingsGoals, created]);
    },
    [savingsGoals, persistSavingsGoals]
  );

  const updateSavingsGoal = useCallback(
    (updated: SavingsGoal) => {
      persistSavingsGoals(savingsGoals.map((g) => (g.id === updated.id ? updated : g)));
    },
    [savingsGoals, persistSavingsGoals]
  );

  const deleteSavingsGoal = useCallback(
    (id: string) => {
      persistSavingsGoals(savingsGoals.filter((g) => g.id !== id));
    },
    [savingsGoals, persistSavingsGoals]
  );

  const resetAllData = useCallback(() => {
    if (!user) return;
    const cleared = clearAllUserTransactionData(user.id);
    setTransactions(cleared.transactions);
    setAccounts(cleared.accounts);
    setSavingsGoals(cleared.savingsGoals);
    setLastImportSummary(null);
    setSelectedPeriod('all');
  }, [user]);

  const resetDemoData = useCallback(() => {
    if (!user) return;
    const restored = resetUserDemoData(user.id);
    setTransactions(restored.transactions);
    setAccounts(restored.accounts);
    setSavingsGoals(restored.savingsGoals);
    setCategories(restored.categories);
    setLastImportSummary(null);
    setSelectedPeriod('all');
  }, [user]);

  const availablePeriods = useMemo(() => getAvailablePeriods(transactions), [transactions]);

  useEffect(() => {
    if (
      selectedPeriod !== 'all' &&
      !availablePeriods.some((p) => p.value === selectedPeriod)
    ) {
      setSelectedPeriod('all');
    }
  }, [availablePeriods, selectedPeriod]);

  const totalManualInitialBalance = useMemo(
    () => accounts.reduce((sum, a) => sum + (Number(a.initialBalance) || 0), 0),
    [accounts]
  );

  const transactionsWithBalance = useMemo(
    () => computeTransactionsWithBalance(transactions, totalManualInitialBalance),
    [transactions, totalManualInitialBalance]
  );

  const filteredTransactions = useMemo(
    () => filterTransactionsByPeriod(transactions, selectedPeriod),
    [transactions, selectedPeriod]
  );

  const filteredTransactionsWithBalance = useMemo(
    () =>
      selectedPeriod === 'all'
        ? transactionsWithBalance
        : filterTransactionsByPeriod(transactionsWithBalance, selectedPeriod) as typeof transactionsWithBalance,
    [transactionsWithBalance, selectedPeriod]
  );

  const kpi = useMemo(() => computeKpis(filteredTransactions), [filteredTransactions]);

  // Saldo akun kumulatif penuh dan saldo akun kumulatif carry-over s.d. akhir periode terpilih
  const accountSummary = useMemo(
    () => computeAccountBalances(accounts, transactions),
    [accounts, transactions]
  );

  const transactionsUpToPeriod = useMemo(() => {
    if (!selectedPeriod || selectedPeriod === 'all') return transactions;
    return transactions.filter((t) => {
      const pk = resolveTransactionPeriodKey(t);
      return !pk || pk <= selectedPeriod;
    });
  }, [transactions, selectedPeriod]);

  const periodAccountSummary = useMemo(() => {
    if (selectedPeriod === 'all') return accountSummary;
    return computeAccountBalances(accounts, transactionsUpToPeriod);
  }, [accounts, transactionsUpToPeriod, selectedPeriod, accountSummary]);

  const savingsSummary = useMemo(
    () => computeSavingsProgress(savingsGoals, transactions, selectedPeriod),
    [savingsGoals, transactions, selectedPeriod]
  );

  const initialAccountBalances = useMemo(() => {
    const cash = accounts
      .filter((a) => a.type === 'Cash' || a.name.toLowerCase().trim() === 'cash')
      .reduce((sum, a) => sum + (Number(a.initialBalance) || 0), 0);
    const shopeePay = accounts
      .filter((a) => a.name.toLowerCase().replace(/\s+/g, '') === 'shopeepay')
      .reduce((sum, a) => sum + (Number(a.initialBalance) || 0), 0);
    return { cash, shopeePay };
  }, [accounts]);

  const trendData = useMemo(
    () => buildTrendData(transactions, selectedPeriod, initialAccountBalances),
    [transactions, selectedPeriod, initialAccountBalances]
  );
  const categoryExpenseData = useMemo(
    () => buildCategoryExpenseData(filteredTransactions),
    [filteredTransactions]
  );
  const paymentMethodData = useMemo(
    () => buildPaymentMethodData(filteredTransactions),
    [filteredTransactions]
  );
  const needsVsWantsData = useMemo(
    () => buildNeedsVsWantsData(filteredTransactions),
    [filteredTransactions]
  );
  const moneyActivityData = useMemo(
    () => buildMoneyActivityData(kpi, periodAccountSummary.liquidBalance),
    [kpi, periodAccountSummary.liquidBalance]
  );

  const periodComparison = useMemo(
    () => computePeriodComparison(transactions, selectedPeriod),
    [transactions, selectedPeriod]
  );

  const insights = useMemo(
    () =>
      generateFinancialInsights({
        filteredTransactions,
        allTransactions: transactions,
        selectedPeriod,
        savingsTarget: savingsSummary.activeTargetAmount,
        savingsCollected: savingsSummary.activeCollectedAmount,
        cashBalance: accountSummary.cashBalance,
        digitalBalance: accountSummary.digitalBalance,
      }),
    [filteredTransactions, transactions, selectedPeriod, savingsSummary, accountSummary]
  );

  const optimization = useMemo(
    () =>
      computeOptimization({
        transactions: filteredTransactions,
        selectedPeriod,
        savingsTarget: savingsSummary.activeTargetAmount || 300000,
      }),
    [filteredTransactions, selectedPeriod, savingsSummary.activeTargetAmount]
  );

  const prediction = useMemo(
    () =>
      computeMovingAveragePrediction(transactions, {
        cash: accountSummary.cashBalance,
        shopeePay: accountSummary.shopeePayBalance,
        seaBank: accountSummary.seaBankBalance,
        total: accountSummary.totalAccountBalance,
      }),
    [
      transactions,
      accountSummary.cashBalance,
      accountSummary.shopeePayBalance,
      accountSummary.seaBankBalance,
      accountSummary.totalAccountBalance,
    ]
  );

  const validationReport = useMemo(
    () =>
      validateFinanceDataset(transactions, accounts, {
        skippedDuplicateCount: lastImportSummary?.skippedDuplicateCount,
      }),
    [transactions, accounts, lastImportSummary?.skippedDuplicateCount]
  );

  const healthScore = useMemo(
    () =>
      computeFinancialHealthScore(
        filteredTransactions,
        kpi,
        savingsSummary.activePercentage
      ),
    [filteredTransactions, kpi, savingsSummary.activePercentage]
  );

  const value: FinanceContextValue = {
    transactions,
    transactionsWithBalance,
    filteredTransactions,
    filteredTransactionsWithBalance,
    accounts,
    accountsWithBalance: periodAccountSummary.accountsWithBalance,
    cashBalance: periodAccountSummary.cashBalance,
    shopeePayBalance: periodAccountSummary.shopeePayBalance,
    seaBankBalance: periodAccountSummary.seaBankBalance,
    bankBalance: periodAccountSummary.bankBalance,
    ewalletBalance: periodAccountSummary.ewalletBalance,
    digitalBalance: periodAccountSummary.digitalBalance,
    liquidBalance: periodAccountSummary.liquidBalance,
    totalAccountBalance: periodAccountSummary.totalAccountBalance,
    savingsGoals,
    goalsProgress: savingsSummary.goalsProgress,
    activeSavingsTarget: savingsSummary.activeTargetAmount,
    activeSavingsCollected: savingsSummary.activeCollectedAmount,
    activeSavingsPercentage: savingsSummary.activePercentage,
    categories,
    selectedPeriod,
    setSelectedPeriod,
    availablePeriods,
    kpi,
    trendData,
    categoryExpenseData,
    paymentMethodData,
    needsVsWantsData,
    moneyActivityData,
    insights,
    periodComparison,
    optimization,
    prediction,
    healthScore,
    validationReport,
    lastImportSummary,
    addTransaction,
    bulkImportTransactions,
    updateTransaction,
    deleteTransaction,
    addCategory,
    addAccount,
    updateAccount,
    deleteAccount,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    resetAllData,
    resetDemoData,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
