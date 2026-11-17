import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { DEFAULT_PAYMENT_METHODS, inferExpenseNature } from '../data/initialData';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { ExpenseNature, Transaction, TransactionType } from '../types/finance';

interface TransactionFormProps {
  initialData?: Transaction | null;
  onSuccess?: (saved: Transaction) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
  submitLabel,
}) => {
  const { accounts, categories, addCategory, addTransaction, updateTransaction } = useFinance();
  const { showToast } = useToast();

  const today = new Date().toISOString().slice(0, 10);

  const [tanggal, setTanggal] = useState(initialData?.tanggal || today);
  const [tipe, setTipe] = useState<TransactionType>(initialData?.tipe || 'Pengeluaran');
  const [keterangan, setKeterangan] = useState(initialData?.keterangan || '');
  const [kategori, setKategori] = useState(initialData?.kategori || 'makan');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [metode, setMetode] = useState(initialData?.metode || 'QRIS');
  const [akun, setAkun] = useState(initialData?.akun || accounts[0]?.name || 'Cash');
  const [jenisPengeluaran, setJenisPengeluaran] = useState<ExpenseNature>(
    initialData?.jenisPengeluaran || 'Kebutuhan'
  );
  const [masukStr, setMasukStr] = useState(String(initialData?.masuk ?? 0));
  const [keluarStr, setKeluarStr] = useState(String(initialData?.keluar ?? 0));
  const [error, setError] = useState('');

  useEffect(() => {
    if (tipe === 'Pemasukan') {
      setJenisPengeluaran('Pemasukan');
      if (!initialData) {
        setKeluarStr('0');
        if (kategori === 'makan') setKategori('Pemasukan');
      }
    } else if (jenisPengeluaran === 'Pemasukan' || jenisPengeluaran === 'Tidak Berlaku') {
      setJenisPengeluaran(inferExpenseNature(kategori, 'Pengeluaran'));
    }
  }, [tipe]);

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    addCategory(trimmed);
    setKategori(trimmed);
    setNewCategoryInput('');
    setShowNewCategory(false);
    showToast({ type: 'success', title: `Kategori "${trimmed}" ditambahkan` });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const masuk = Math.round(Number(masukStr) || 0);
    const keluar = Math.round(Number(keluarStr) || 0);

    if (!tanggal) {
      setError('Tanggal wajib diisi.');
      return;
    }
    if (!keterangan.trim()) {
      setError('Keterangan wajib diisi.');
      return;
    }
    if (!kategori.trim()) {
      setError('Kategori wajib dipilih.');
      return;
    }
    if (!akun.trim()) {
      setError('Akun wajib dipilih.');
      return;
    }
    if (masuk < 0 || keluar < 0) {
      setError('Nominal tidak boleh negatif.');
      return;
    }
    if (masuk === 0 && keluar === 0) {
      setError('Minimal nominal Pemasukan atau Pengeluaran harus lebih dari 0.');
      return;
    }

    const finalJenis: ExpenseNature =
      tipe === 'Pemasukan'
        ? 'Pemasukan'
        : jenisPengeluaran === 'Pemasukan' || jenisPengeluaran === 'Tidak Berlaku'
          ? 'Perlu Ditinjau'
          : jenisPengeluaran;

    const payload: Omit<Transaction, 'id'> = {
      tanggal,
      tipe,
      kategori: kategori.trim(),
      metode: metode.trim() || 'transfer',
      akun: akun.trim(),
      masuk,
      keluar,
      keterangan: keterangan.trim(),
      jenisPengeluaran: finalJenis,
    };

    if (initialData) {
      const updated: Transaction = { ...payload, id: initialData.id };
      updateTransaction(updated);
      showToast({ type: 'success', title: 'Transaksi berhasil diubah' });
      onSuccess?.(updated);
    } else {
      const created = addTransaction(payload);
      showToast({ type: 'success', title: 'Transaksi berhasil ditambahkan' });
      onSuccess?.(created);
    }
  };

  const accountNames = Array.from(
    new Set([
      ...(accounts.length > 0 ? accounts.map((a) => a.name) : ['Cash', 'ShopeePay', 'SeaBank']),
      ...(akun ? [akun] : []),
    ])
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300/90"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Tanggal
          </label>
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            required
            className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Tipe Transaksi
          </label>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-100 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-1">
            {(['Pengeluaran', 'Pemasukan'] as TransactionType[]).map((opt) => {
              const isSelected = tipe === opt;
              const selectedClasses =
                opt === 'Pemasukan'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30';

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTipe(opt)}
                  className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
                    isSelected
                      ? selectedClasses
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-[#FAFAFA] border border-transparent'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
          Keterangan
        </label>
        <input
          type="text"
          value={keterangan}
          onChange={(e) => setKeterangan(e.target.value)}
          placeholder="Contoh: Makan siang, Token listrik, Uang bulanan"
          required
          className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Kategori
            </label>
            <button
              type="button"
              onClick={() => setShowNewCategory((prev) => !prev)}
              className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>Kategori Baru</span>
            </button>
          </div>
          {showNewCategory ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="Nama kategori baru"
                className="flex-1 min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddNewCategory}
                className="min-h-[42px] rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-3.5 text-xs font-semibold"
              >
                Simpan
              </button>
            </div>
          ) : (
            <select
              value={kategori}
              onChange={(e) => {
                const val = e.target.value;
                setKategori(val);
                if (tipe === 'Pengeluaran') {
                  setJenisPengeluaran(inferExpenseNature(val, 'Pengeluaran'));
                }
              }}
              className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-white dark:bg-[#121215]">
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Jenis Pengeluaran
          </label>
          <select
            value={tipe === 'Pemasukan' ? 'Pemasukan' : jenisPengeluaran}
            disabled={tipe === 'Pemasukan'}
            onChange={(e) => setJenisPengeluaran(e.target.value as ExpenseNature)}
            className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] disabled:opacity-60 focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
          >
            <option value="Kebutuhan" className="bg-white dark:bg-[#121215]">Kebutuhan</option>
            <option value="Keinginan" className="bg-white dark:bg-[#121215]">Keinginan</option>
            <option value="Transfer" className="bg-white dark:bg-[#121215]">Transfer</option>
            <option value="Tabungan" className="bg-white dark:bg-[#121215]">Tabungan</option>
            <option value="Perlu Ditinjau" className="bg-white dark:bg-[#121215]">Perlu Ditinjau</option>
            <option value="Pemasukan" className="bg-white dark:bg-[#121215]">Pemasukan</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Metode Pembayaran
          </label>
          <select
            value={metode}
            onChange={(e) => setMetode(e.target.value)}
            className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
          >
            {Array.from(new Set([...DEFAULT_PAYMENT_METHODS, metode])).map((m) => (
              <option key={m} value={m} className="bg-white dark:bg-[#121215]">
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Akun
          </label>
          <select
            value={akun}
            onChange={(e) => setAkun(e.target.value)}
            className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
          >
            {accountNames.map((name) => (
              <option key={name} value={name} className="bg-white dark:bg-[#121215]">
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Pemasukan (Rp)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={masukStr}
            onChange={(e) => setMasukStr(e.target.value)}
            className="font-mono-num tabular-nums w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
            Pengeluaran (Rp)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={keluarStr}
            onChange={(e) => setKeluarStr(e.target.value)}
            className="font-mono-num tabular-nums w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[42px] rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-4 py-2 text-sm font-medium text-zinc-700 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors"
          >
            Batal
          </button>
        )}
        <button
          type="submit"
          className="min-h-[42px] rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-5 py-2 text-sm font-semibold transition-colors whitespace-nowrap"
        >
          {submitLabel || (initialData ? 'Simpan Perubahan' : 'Simpan Transaksi')}
        </button>
      </div>
    </form>
  );
};

interface TransactionFormModalProps {
  isOpen: boolean;
  initialData?: Transaction | null;
  onClose: () => void;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  initialData,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200 dark:border-white/[0.08]">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-[#FAFAFA]">
            {initialData ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <TransactionForm initialData={initialData} onSuccess={onClose} onCancel={onClose} />
      </div>
    </div>
  );
};
