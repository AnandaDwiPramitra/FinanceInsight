import React, { useState } from 'react';
import { Bot, RotateCcw, Save, ShieldCheck, Trash2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';

interface ProfilePageProps {
  onOpenAiModal: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenAiModal }) => {
  const { user, updateProfile } = useAuth();
  const { resetAllData, resetDemoData } = useFinance();
  const { showToast, confirmAction } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateProfile({
      name,
      email,
      newPassword: newPassword.trim() ? newPassword : undefined,
    });
    setSaving(false);

    if (!res.ok) {
      showToast({ type: 'error', title: 'Gagal memperbarui profil', description: res.error });
      return;
    }
    setNewPassword('');
    showToast({ type: 'success', title: 'Profil berhasil diperbarui' });
  };

  const handleResetAll = async () => {
    const ok = await confirmAction({
      title: 'Reset semua data?',
      message:
        'Semua transaksi hasil import CSV/XLSX dan data transaksi yang tersimpan di aplikasi akan dihapus. Tindakan ini tidak dapat dibatalkan.',
      confirmLabel: 'Reset Data',
      cancelLabel: 'Batal',
      destructive: true,
    });
    if (ok) {
      resetAllData();
      showToast({ type: 'success', title: 'Semua data berhasil dihapus.' });
    }
  };

  const handleResetDemo = async () => {
    const ok = await confirmAction({
      title: 'Reset demo data?',
      message:
        'Transaksi, akun, dan target tabungan milik pengguna aktif akan dikembalikan ke data awal (INITIAL_TRANSACTIONS). Akun pengguna tidak akan dihapus.',
      confirmLabel: 'Reset Demo',
      destructive: true,
    });
    if (ok) {
      resetDemoData();
      showToast({ type: 'info', title: 'Data demo dikembalikan ke kondisi awal' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-[#FAFAFA]">
          Profil Pengguna
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
          Kelola identitas akun lokal, pengaturan AI, dan data transaksi
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-6 space-y-4"
      >
        <div className="flex items-center gap-3 pb-4 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-100 dark:bg-[#18181B] text-zinc-600 dark:text-zinc-400">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
              {user?.name}
            </p>
            <p className="font-mono-num tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
              User ID: {user?.id} (read-only)
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Nama
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-900 dark:focus:border-[#FAFAFA] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-900 dark:focus:border-[#FAFAFA] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Password Baru (kosongkan jika tidak ingin mengubah)
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-[#FAFAFA] focus:outline-none"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-5 py-2 text-sm font-semibold disabled:opacity-60 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </form>

      {/* Utilities: AI API Key & Reset Data */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-6 space-y-4">
        <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
          Pengaturan Aplikasi & Manajemen Data
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-zinc-200 dark:border-white/[0.08]">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA]">
              Integrasi Gemini AI
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Kelola API key lokal atau jalankan analisis AI dengan mode fallback.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAiModal}
            className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0 transition-colors"
          >
            <Bot className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>Kelola Gemini AI</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-zinc-200 dark:border-white/[0.08]">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA]">
              Reset Data (Hapus Semua Transaksi)
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Hapus seluruh transaksi hasil import CSV/XLSX & transaksi manual. Akun, profil, dan target tabungan tetap aman.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetAll}
            className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 shrink-0 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Reset Data</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA]">
              Muat Ulang Data Demo
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Kembalikan contoh data demo Oktober 2026 tanpa menghapus akun Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDemo}
            className="min-h-[40px] inline-flex items-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0 transition-colors"
          >
            <RotateCcw className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400 px-1">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-zinc-500 dark:text-zinc-400" />
        <span>
          Semua data disimpan secara lokal di browser (local-first architecture) melalui service layer terpisah sehingga siap dihubungkan ke REST API/backend di masa depan. Autentikasi lokal hanya untuk penggunaan demo/lokal.
        </span>
      </p>
    </div>
  );
};
