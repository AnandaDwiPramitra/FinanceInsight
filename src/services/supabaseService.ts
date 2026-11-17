import { Account, SavingsGoal, Transaction, User } from '../types/finance';
import { supabase } from './supabaseClient';
import {
  ensureDemoUserExists,
  getCurrentUser,
  getUsers,
  getUserAccounts,
  getUserCategories,
  getUserSavingsGoals,
  getUserTransactions,
  saveUserAccounts,
  saveUserCategories,
  saveUserSavingsGoals,
  saveUserTransactions,
  saveUsers,
  setCurrentUser,
} from './storageService';

const USE_LOCAL_FALLBACK = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function supabaseLogin(
  email: string,
  pass: string
): Promise<{ ok: boolean; user?: User; error?: string }> {
  const normEmail = email.trim().toLowerCase();
  if (USE_LOCAL_FALLBACK) {
    // Fallback ke local storage auth jika credentials supabase belum diset
    const users = await ensureDemoUserExists();
    const target = users.find((u) => u.email.toLowerCase() === normEmail);
    if (!target) return { ok: false, error: 'Email belum terdaftar.' };
    setCurrentUser(target);
    return { ok: true, user: target };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normEmail,
      password: pass,
    });
    if (error || !data.user) {
      return { ok: false, error: error?.message || 'Login Supabase gagal.' };
    }

    // Ambil profil dari public.users
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const userObj: User = {
      id: data.user.id,
      name: profile?.name || data.user.user_metadata?.name || 'User',
      email: data.user.email || normEmail,
      passwordHash: '',
      createdAt: profile?.created_at || data.user.created_at,
      isDemo: profile?.is_demo || false,
    };

    setCurrentUser(userObj);
    return { ok: true, user: userObj };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Kesalahan koneksi Supabase.' };
  }
}

export async function supabaseRegister(params: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: boolean; user?: User; error?: string }> {
  const name = params.name.trim();
  const email = params.email.trim().toLowerCase();
  const password = params.password;

  if (USE_LOCAL_FALLBACK) {
    const users = await ensureDemoUserExists();
    if (users.some((u) => u.email.toLowerCase() === email)) {
      return { ok: false, error: 'Email sudah terdaftar.' };
    }
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      email,
      passwordHash: '',
      createdAt: new Date().toISOString(),
      isDemo: false,
    };
    saveUsers([...users, newUser]);
    setCurrentUser(newUser);
    return { ok: true, user: newUser };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error || !data.user) {
      return { ok: false, error: error?.message || 'Registrasi Supabase gagal.' };
    }

    const newUser: User = {
      id: data.user.id,
      name,
      email,
      passwordHash: '',
      createdAt: data.user.created_at,
      isDemo: false,
    };

    // Upsert ke tabel public.users
    await supabase.from('users').upsert({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      password_hash: '',
      created_at: newUser.createdAt,
      is_demo: false,
    });

    setCurrentUser(newUser);
    return { ok: true, user: newUser };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Kesalahan koneksi Supabase.' };
  }
}

export async function supabaseLogout(): Promise<void> {
  setCurrentUser(null);
  if (!USE_LOCAL_FALLBACK) {
    await supabase.auth.signOut();
  }
}

export async function fetchUserTransactionsFromSupabase(userId: string): Promise<Transaction[]> {
  if (USE_LOCAL_FALLBACK) {
    return getUserTransactions(userId);
  }
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('tanggal', { ascending: true });

    if (error || !data) return getUserTransactions(userId);

    return data.map((t: any) => ({
      id: Number(t.id) || Date.now(),
      tanggal: t.tanggal,
      tipe: t.tipe,
      kategori: t.kategori,
      metode: t.metode,
      akun: t.akun,
      masuk: Number(t.masuk) || 0,
      keluar: Number(t.keluar) || 0,
      keterangan: t.keterangan,
      jenisPengeluaran: t.jenis_pengeluaran || 'Kebutuhan',
      bulan: t.bulan,
      importedSaldo: t.imported_saldo !== null ? Number(t.imported_saldo) : undefined,
      transferId: t.transfer_id || undefined,
    }));
  } catch {
    return getUserTransactions(userId);
  }
}

export async function saveUserTransactionsToSupabase(userId: string, txs: Transaction[]): Promise<void> {
  saveUserTransactions(userId, txs); // sinkron ke local cache
  if (USE_LOCAL_FALLBACK) return;

  try {
    // Untuk kesederhanaan sinkronisasi massal, kita upsert row by row atau sync
    const rows = txs.map((t) => ({
      user_id: userId,
      tanggal: t.tanggal,
      tipe: t.tipe,
      kategori: t.kategori,
      metode: t.metode,
      akun: t.akun,
      masuk: t.masuk,
      keluar: t.keluar,
      keterangan: t.keterangan,
      jenis_pengeluaran: t.jenisPengeluaran,
      bulan: t.bulan || null,
      imported_saldo: t.importedSaldo ?? null,
      transfer_id: t.transferId || null,
    }));

    // Hapus data lama user ini lalu masukkan batch baru
    await supabase.from('transactions').delete().eq('user_id', userId);
    if (rows.length > 0) {
      await supabase.from('transactions').insert(rows);
    }
  } catch (err) {
    console.error('Gagal sync transaksi ke Supabase:', err);
  }
}

export async function fetchUserAccountsFromSupabase(userId: string): Promise<Account[]> {
  if (USE_LOCAL_FALLBACK) {
    return getUserAccounts(userId);
  }
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return getUserAccounts(userId);
    }

    return data.map((a: any) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      initialBalance: Number(a.initial_balance) || 0,
      note: a.note || '',
    }));
  } catch {
    return getUserAccounts(userId);
  }
}

export async function saveUserAccountsToSupabase(userId: string, accs: Account[]): Promise<void> {
  saveUserAccounts(userId, accs);
  if (USE_LOCAL_FALLBACK) return;

  try {
    const rows = accs.map((a) => ({
      id: a.id,
      user_id: userId,
      name: a.name,
      type: a.type,
      initial_balance: a.initialBalance,
      note: a.note || null,
    }));

    await supabase.from('accounts').delete().eq('user_id', userId);
    if (rows.length > 0) {
      await supabase.from('accounts').upsert(rows);
    }
  } catch (err) {
    console.error('Gagal sync akun ke Supabase:', err);
  }
}

export async function fetchUserSavingsGoalsFromSupabase(userId: string): Promise<SavingsGoal[]> {
  if (USE_LOCAL_FALLBACK) {
    return getUserSavingsGoals(userId);
  }
  try {
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId);

    if (error || !data) return getUserSavingsGoals(userId);

    return data.map((g: any) => ({
      id: g.id,
      name: g.name,
      periodKey: g.period_key,
      targetAmount: Number(g.target_amount) || 0,
      manualSaved: Number(g.manual_saved) || 0,
      targetDate: g.target_date,
    }));
  } catch {
    return getUserSavingsGoals(userId);
  }
}

export async function saveUserSavingsGoalsToSupabase(userId: string, goals: SavingsGoal[]): Promise<void> {
  saveUserSavingsGoals(userId, goals);
  if (USE_LOCAL_FALLBACK) return;

  try {
    const rows = goals.map((g) => ({
      id: g.id,
      user_id: userId,
      name: g.name,
      period_key: g.periodKey,
      target_amount: g.targetAmount,
      manual_saved: g.manualSaved,
      target_date: g.targetDate,
    }));

    await supabase.from('savings_goals').delete().eq('user_id', userId);
    if (rows.length > 0) {
      await supabase.from('savings_goals').upsert(rows);
    }
  } catch (err) {
    console.error('Gagal sync savings goals ke Supabase:', err);
  }
}
