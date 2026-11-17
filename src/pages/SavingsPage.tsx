import React, { useState } from 'react';
import { Banknote, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { SavingsGoal } from '../types/finance';
import { formatDateShort, formatMoney } from '../utils/formatMoney';

export const SavingsPage: React.FC = () => {
  const {
    goalsProgress,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addTransaction,
    accounts,
  } = useFinance();
  const { showToast, confirmAction } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [name, setName] = useState('');
  const [periodKey, setPeriodKey] = useState('2026-10');
  const [targetAmountStr, setTargetAmountStr] = useState('300000');
  const [manualSavedStr, setManualSavedStr] = useState('0');
  const [targetDate, setTargetDate] = useState('2026-10-31');

  const [depositModalGoal, setDepositModalGoal] = useState<SavingsGoal | null>(null);
  const [depositAmountStr, setDepositAmountStr] = useState('100000');
  const [depositAccount, setDepositAccount] = useState(accounts[0]?.name || 'SeaBank');

  const openCreateModal = () => {
    setEditing(null);
    setName('Target Tabungan Baru');
    setPeriodKey('2026-11');
    setTargetAmountStr('300000');
    setManualSavedStr('0');
    setTargetDate('2026-11-30');
    setModalOpen(true);
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditing(goal);
    setName(goal.name);
    setPeriodKey(goal.periodKey);
    setTargetAmountStr(String(goal.targetAmount));
    setManualSavedStr(String(goal.manualSaved));
    setTargetDate(goal.targetDate);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmount = Math.max(0, Math.round(Number(targetAmountStr) || 0));
    const manualSaved = Math.max(0, Math.round(Number(manualSavedStr) || 0));

    if (!name.trim()) {
      showToast({ type: 'error', title: 'Nama target wajib diisi' });
      return;
    }
    if (!targetDate) {
      showToast({ type: 'error', title: 'Tanggal target wajib diisi' });
      return;
    }

    if (editing) {
      updateSavingsGoal({
        ...editing,
        name: name.trim(),
        periodKey: periodKey.trim() || 'custom',
        targetAmount,
        manualSaved,
        targetDate,
      });
      showToast({ type: 'success', title: 'Target berhasil diperbarui' });
    } else {
      addSavingsGoal({
        name: name.trim(),
        periodKey: periodKey.trim() || 'custom',
        targetAmount,
        manualSaved,
        targetDate,
      });
      showToast({ type: 'success', title: 'Target tabungan ditambahkan' });
    }
    setModalOpen(false);
  };

  const handleDelete = async (goal: SavingsGoal) => {
    const ok = await confirmAction({
      title: 'Hapus target tabungan?',
      message: `Target "${goal.name}" akan dihapus.`,
      confirmLabel: 'Hapus',
      destructive: true,
    });
    if (ok) {
      deleteSavingsGoal(goal.id);
      showToast({ type: 'success', title: 'Target dihapus' });
    }
  };

  const handleQuickDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalGoal) return;
    const amount = Math.round(Number(depositAmountStr) || 0);
    if (amount <= 0) {
      showToast({ type: 'error', title: 'Nominal setoran harus lebih dari 0' });
      return;
    }

    const txDate =
      depositModalGoal.periodKey && /^\d{4}-\d{2}$/.test(depositModalGoal.periodKey)
        ? `${depositModalGoal.periodKey}-28`
        : new Date().toISOString().slice(0, 10);

    addTransaction({
      tanggal: txDate,
      tipe: 'Pengeluaran',
      kategori: 'Tabungan',
      metode: 'Tunai',
      akun: depositAccount || 'SeaBank',
      masuk: 0,
      keluar: amount,
      keterangan: `Setoran ${depositModalGoal.name}`,
      jenisPengeluaran: 'Tabungan',
    });

    showToast({
      type: 'success',
      title: 'Setoran tabungan dicatat',
      description: `${formatMoney(amount)} tercatat pada kategori tabungan.`,
    });
    setDepositModalGoal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-[#FAFAFA]">
            Target Tabungan
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Default target Rp300.000 per bulan. Terintegrasi otomatis dengan transaksi kategori tabungan.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Target</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goalsProgress.map((goal) => {
          const badgeClass =
            goal.status === 'Tercapai'
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400/90'
              : goal.status === 'Berjalan'
                ? 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300/90'
                : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400';

          return (
            <div
              key={goal.id}
              className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Banknote className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA] truncate">
                      {goal.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Target tgl {formatDateShort(goal.targetDate)}</span>
                      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${badgeClass}`}>
                        {goal.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(goal)}
                    aria-label="Edit target"
                    className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(goal)}
                    aria-label="Hapus target"
                    className="p-2 rounded-lg text-zinc-500 hover:bg-rose-500/10 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`font-mono-num tabular-nums text-lg font-bold ${
                      goal.percentage >= 100
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {formatMoney(goal.collectedAmount)}
                  </span>
                  <span className="font-mono-num tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                    / {formatMoney(goal.targetAmount)}
                  </span>
                </div>

                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      goal.percentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${goal.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-mono-num tabular-nums font-semibold ${
                      goal.percentage >= 100
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {goal.percentage}% tercapai
                  </span>
                  <span className="font-mono-num tabular-nums text-zinc-500 dark:text-zinc-400">
                    Kekurangan: {formatMoney(goal.shortfall)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDepositModalGoal(goal);
                  setDepositAmountStr(String(Math.max(50000, goal.shortfall || 100000)));
                  setDepositAccount(accounts.find((a) => a.name === 'SeaBank')?.name || accounts[0]?.name || 'SeaBank');
                }}
                className="w-full min-h-[38px] rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] px-3 py-1.5 text-xs font-semibold text-zinc-800 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors"
              >
                Catat Setoran Tabungan
              </button>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Goal Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/[0.08]">
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-[#FAFAFA]">
                {editing ? 'Edit Target Tabungan' : 'Tambah Target Tabungan'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Nama Target
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Periode (YYYY-MM)
                  </label>
                  <input
                    type="text"
                    value={periodKey}
                    onChange={(e) => setPeriodKey(e.target.value)}
                    placeholder="2026-10"
                    className="font-mono-num tabular-nums w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Tanggal Target
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    required
                    className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Target Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={targetAmountStr}
                    onChange={(e) => setTargetAmountStr(e.target.value)}
                    required
                    className="font-mono-num tabular-nums w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                    Tambahan Manual (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={manualSavedStr}
                    onChange={(e) => setManualSavedStr(e.target.value)}
                    className="font-mono-num tabular-nums w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-[40px] rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-4 py-2 text-sm font-medium text-zinc-700 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-5 py-2 text-sm font-semibold"
                >
                  Simpan Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Deposit Modal */}
      {depositModalGoal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/[0.08]">
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-[#FAFAFA]">
                Catat Setoran Tabungan
              </h3>
              <button
                type="button"
                onClick={() => setDepositModalGoal(null)}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuickDeposit} className="space-y-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Setoran akan dicatat sebagai transaksi kategori <strong className="text-zinc-900 dark:text-[#FAFAFA]">tabungan</strong> untuk{' '}
                <strong className="text-zinc-900 dark:text-[#FAFAFA]">{depositModalGoal.name}</strong>.
              </p>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Nominal Setoran (Rp)
                </label>
                <input
                  type="number"
                  min="1"
                  value={depositAmountStr}
                  onChange={(e) => setDepositAmountStr(e.target.value)}
                  required
                  className="font-mono-num tabular-nums w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Dari Akun
                </label>
                <select
                  value={depositAccount}
                  onChange={(e) => setDepositAccount(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
                >
                  {(accounts.length > 0 ? accounts.map((a) => a.name) : ['Cash', 'ShopeePay', 'SeaBank']).map(
                    (nameOption) => (
                      <option key={nameOption} value={nameOption} className="bg-white dark:bg-[#121215]">
                        {nameOption}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositModalGoal(null)}
                  className="min-h-[40px] rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-4 py-2 text-sm font-medium text-zinc-700 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-5 py-2 text-sm font-semibold"
                >
                  Simpan Setoran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
