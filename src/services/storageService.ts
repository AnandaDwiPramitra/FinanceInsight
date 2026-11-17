import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  DEFAULT_SAVINGS_GOALS,
  INITIAL_TRANSACTIONS,
} from '../data/initialData';
import { Account, ImportSummary, SavingsGoal, Transaction, User } from '../types/finance';

const KEYS = {
  USERS: 'fi_users',
  CURRENT_USER: 'fi_current_user',
  TRANSACTIONS_BY_USER: 'fi_transactions_by_user',
  ACCOUNTS_BY_USER: 'fi_accounts_by_user',
  SAVINGS_BY_USER: 'fi_savings_goals_by_user',
  CATEGORIES_BY_USER: 'fi_categories_by_user',
  IMPORT_SUMMARY_BY_USER: 'fi_import_summary_by_user',
  GEMINI_API_KEY: 'fi_gemini_api_key',
  THEME: 'fi_theme',
} as const;

export const DEMO_USER_EMAIL = 'demo@financeinsight.local';
export const DEMO_USER_PASSWORD = 'demo123';

export async function hashPassword(password: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`finance-insight-salt:${password}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fallback if crypto.subtle is unavailable
  }
  let hash = 0;
  const input = `finance-insight-salt:${password}`;
  for (let i = 0; i < input.length; i += 1) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `fallback_${Math.abs(hash).toString(16)}`;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export async function ensureDemoUserExists(): Promise<User[]> {
  const users = readJson<User[]>(KEYS.USERS, []);
  const hasDemo = users.some((u) => u.email.toLowerCase() === DEMO_USER_EMAIL);
  if (hasDemo) return users;

  const passwordHash = await hashPassword(DEMO_USER_PASSWORD);
  const demoUser: User = {
    id: 'user-demo-1',
    name: 'Demo User',
    email: DEMO_USER_EMAIL,
    passwordHash,
    createdAt: new Date().toISOString(),
    isDemo: true,
  };

  const nextUsers = [demoUser, ...users];
  writeJson(KEYS.USERS, nextUsers);

  // Seed initial demo data only if demo user has no stored data yet
  seedUserFinanceData(demoUser.id, true);
  return nextUsers;
}

export function seedUserFinanceData(userId: string, withDemoTransactions: boolean): void {
  const txMap = readJson<Record<string, Transaction[]>>(KEYS.TRANSACTIONS_BY_USER, {});
  if (!txMap[userId]) {
    txMap[userId] = withDemoTransactions ? INITIAL_TRANSACTIONS.map((t) => ({ ...t })) : [];
    writeJson(KEYS.TRANSACTIONS_BY_USER, txMap);
  }

  const accMap = readJson<Record<string, Account[]>>(KEYS.ACCOUNTS_BY_USER, {});
  if (!accMap[userId]) {
    accMap[userId] = withDemoTransactions
      ? DEFAULT_ACCOUNTS.map((a) => ({ ...a }))
      : [];
    writeJson(KEYS.ACCOUNTS_BY_USER, accMap);
  }

  const savMap = readJson<Record<string, SavingsGoal[]>>(KEYS.SAVINGS_BY_USER, {});
  if (!savMap[userId]) {
    savMap[userId] = DEFAULT_SAVINGS_GOALS.map((g) => ({ ...g }));
    writeJson(KEYS.SAVINGS_BY_USER, savMap);
  }

  const catMap = readJson<Record<string, string[]>>(KEYS.CATEGORIES_BY_USER, {});
  if (!catMap[userId]) {
    catMap[userId] = [...DEFAULT_CATEGORIES];
    writeJson(KEYS.CATEGORIES_BY_USER, catMap);
  }
}

export function getUsers(): User[] {
  return readJson<User[]>(KEYS.USERS, []);
}

export function saveUsers(users: User[]): void {
  writeJson(KEYS.USERS, users);
}

export function getCurrentUser(): User | null {
  return readJson<User | null>(KEYS.CURRENT_USER, null);
}

export function setCurrentUser(user: User | null): void {
  if (!user) {
    localStorage.removeItem(KEYS.CURRENT_USER);
  } else {
    writeJson(KEYS.CURRENT_USER, user);
  }
}

export function getUserTransactions(userId: string): Transaction[] {
  const map = readJson<Record<string, Transaction[]>>(KEYS.TRANSACTIONS_BY_USER, {});
  return map[userId] || [];
}

export function saveUserTransactions(userId: string, transactions: Transaction[]): void {
  const map = readJson<Record<string, Transaction[]>>(KEYS.TRANSACTIONS_BY_USER, {});
  map[userId] = transactions;
  writeJson(KEYS.TRANSACTIONS_BY_USER, map);
}

export function getUserAccounts(userId: string): Account[] {
  const map = readJson<Record<string, Account[]>>(KEYS.ACCOUNTS_BY_USER, {});
  return map[userId] || [];
}

export function saveUserAccounts(userId: string, accounts: Account[]): void {
  const map = readJson<Record<string, Account[]>>(KEYS.ACCOUNTS_BY_USER, {});
  map[userId] = accounts;
  writeJson(KEYS.ACCOUNTS_BY_USER, map);
}

export function getUserSavingsGoals(userId: string): SavingsGoal[] {
  const map = readJson<Record<string, SavingsGoal[]>>(KEYS.SAVINGS_BY_USER, {});
  return map[userId] || DEFAULT_SAVINGS_GOALS.map((g) => ({ ...g }));
}

export function saveUserSavingsGoals(userId: string, goals: SavingsGoal[]): void {
  const map = readJson<Record<string, SavingsGoal[]>>(KEYS.SAVINGS_BY_USER, {});
  map[userId] = goals;
  writeJson(KEYS.SAVINGS_BY_USER, map);
}

export function getUserCategories(userId: string): string[] {
  const map = readJson<Record<string, string[]>>(KEYS.CATEGORIES_BY_USER, {});
  return map[userId] || [...DEFAULT_CATEGORIES];
}

export function saveUserCategories(userId: string, categories: string[]): void {
  const map = readJson<Record<string, string[]>>(KEYS.CATEGORIES_BY_USER, {});
  map[userId] = categories;
  writeJson(KEYS.CATEGORIES_BY_USER, map);
}

export function getLastImportSummary(userId: string): ImportSummary | null {
  const map = readJson<Record<string, ImportSummary | null>>(KEYS.IMPORT_SUMMARY_BY_USER, {});
  return map[userId] || null;
}

export function saveLastImportSummary(userId: string, summary: ImportSummary | null): void {
  const map = readJson<Record<string, ImportSummary | null>>(KEYS.IMPORT_SUMMARY_BY_USER, {});
  if (!summary) {
    delete map[userId];
  } else {
    map[userId] = summary;
  }
  writeJson(KEYS.IMPORT_SUMMARY_BY_USER, map);
}

export function clearAllUserTransactionData(userId: string): {
  transactions: Transaction[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
} {
  saveUserTransactions(userId, []);
  saveUserAccounts(userId, []);
  saveLastImportSummary(userId, null);

  // Pertahankan konfigurasi target tabungan user, tetapi nolkan manualSaved agar Total Tabungan kembali ke Rp 0
  const resetGoals = getUserSavingsGoals(userId).map((g) => ({
    ...g,
    manualSaved: 0,
  }));
  saveUserSavingsGoals(userId, resetGoals);

  return {
    transactions: [],
    accounts: [],
    savingsGoals: resetGoals,
  };
}

export function resetUserDemoData(userId: string): {
  transactions: Transaction[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  categories: string[];
} {
  const transactions = INITIAL_TRANSACTIONS.map((t) => ({ ...t }));
  const accounts = DEFAULT_ACCOUNTS.map((a) => ({ ...a }));
  const savingsGoals = DEFAULT_SAVINGS_GOALS.map((g) => ({ ...g }));
  const categories = [...DEFAULT_CATEGORIES];

  saveUserTransactions(userId, transactions);
  saveUserAccounts(userId, accounts);
  saveUserSavingsGoals(userId, savingsGoals);
  saveUserCategories(userId, categories);
  saveLastImportSummary(userId, null);

  return { transactions, accounts, savingsGoals, categories };
}

export function getStoredGeminiApiKey(): string {
  return localStorage.getItem(KEYS.GEMINI_API_KEY) || '';
}

export function saveGeminiApiKey(key: string): void {
  localStorage.setItem(KEYS.GEMINI_API_KEY, key.trim());
}

export function removeGeminiApiKey(): void {
  localStorage.removeItem(KEYS.GEMINI_API_KEY);
}

export function getStoredTheme(): 'light' | 'dark' {
  const val = localStorage.getItem(KEYS.THEME);
  return val === 'light' ? 'light' : 'dark';
}

export function saveStoredTheme(theme: 'light' | 'dark'): void {
  localStorage.setItem(KEYS.THEME, theme);
}
