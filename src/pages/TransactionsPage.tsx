import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown,
  Edit2,
  Eye,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { ExportDataButton } from '../components/ExportDataButton';
import { ImportModal } from '../components/ImportModal';
import { TransactionFormModal } from '../components/TransactionForm';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { Transaction } from '../types/finance';
import { resolveTransactionPeriodKey } from '../utils/calculations';
import { formatDateShort, formatMoney } from '../utils/formatMoney';
import { getJenisBadgeClass } from '../utils/semanticColors';

const PAGE_SIZE = 10;

export const TransactionsPage: React.FC = () => {
  const {
    transactions,
    transactionsWithBalance,
    availablePeriods,
    categories,
    accounts,
    deleteTransaction,
    resetAllData,
  } = useFinance();
  const { showToast, confirmAction } = useToast();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [jenisFilter, setJenisFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const methodOptions = useMemo(() => {
    const set = new Set(transactionsWithBalance.map((t) => t.metode.toLowerCase()));
    return Array.from(set).sort();
  }, [transactionsWithBalance]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = transactionsWithBalance.filter((t) => {
      if (monthFilter !== 'all' && resolveTransactionPeriodKey(t) !== monthFilter) return false;
      if (categoryFilter !== 'all' && t.kategori.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      if (
        jenisFilter !== 'all' &&
        String(t.jenisPengeluaran || '').toLowerCase() !== jenisFilter.toLowerCase()
      ) {
        return false;
      }
      if (methodFilter !== 'all' && t.metode.toLowerCase() !== methodFilter.toLowerCase()) {
        return false;
      }
      if (accountFilter !== 'all' && t.akun.toLowerCase() !== accountFilter.toLowerCase()) {
        return false;
      }
      if (q) {
        const hay = `${t.keterangan} ${t.kategori} ${t.metode} ${t.akun} ${t.tanggal}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return sortOrder === 'desc' ? [...list].reverse() : list;
  }, [
    transactionsWithBalance,
    search,
    monthFilter,
    categoryFilter,
    jenisFilter,
    methodFilter,
    accountFilter,
    sortOrder,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleDelete = async (tx: Transaction) => {
    const ok = await confirmAction({
      title: 'Hapus transaksi?',
      message: `Transaksi "${tx.keterangan}" pada ${formatDateShort(tx.tanggal)} akan dihapus permanen dan saldo akan dihitung ulang.`,
      confirmLabel: 'Hapus',
      destructive: true,
    });
    if (ok) {
      deleteTransaction(tx.id);
      showToast({ type: 'success', title: 'Transaksi berhasil dihapus' });
    }
  };

  const handleResetAllData = async () => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-[#FAFAFA]">
            Semua Transaksi
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Kelola, cari, filter, import, dan export seluruh catatan pemasukan & pengeluaran
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setModalOpen(true);
            }}
            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Transaksi</span>
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-3.5 py-2 text-sm font-medium text-zinc-800 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors whitespace-nowrap"
          >
            <Upload className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>Import Data</span>
          </button>
          <ExportDataButton
            transactions={filtered}
            filePrefix="finance-insight-transaksi"
          />
          <button
            type="button"
            onClick={handleResetAllData}
            disabled={transactions.length === 0}
            className="min-h-[42px] inline-flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-sm font-medium text-rose-600 dark:text-rose-400/90 hover:bg-rose-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4" />
            <span>Reset Data</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="h-4 w-4 text-zinc-500 dark:text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari keterangan, kategori, metode, akun..."
              className="w-full min-h-[42px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#09090B] pl-10 pr-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#18181B] px-3.5 py-2 text-sm font-medium text-zinc-800 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors"
          >
            <ArrowUpDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>Urut Tanggal: {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <select
            aria-label="Filter bulan"
            value={monthFilter}
            onChange={(e) => {
              setMonthFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="min-h-[40px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3 text-xs sm:text-sm text-zinc-900 dark:text-[#FAFAFA]"
          >
            {availablePeriods.map((p) => (
              <option key={p.value} value={p.value} className="bg-white dark:bg-[#121215]">
                {p.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter kategori"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="min-h-[40px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3 text-xs sm:text-sm text-zinc-900 dark:text-[#FAFAFA]"
          >
            <option value="all" className="bg-white dark:bg-[#121215]">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c} value={c} className="bg-white dark:bg-[#121215]">
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter jenis pengeluaran"
            value={jenisFilter}
            onChange={(e) => {
              setJenisFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="min-h-[40px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3 text-xs sm:text-sm text-zinc-900 dark:text-[#FAFAFA]"
          >
            <option value="all" className="bg-white dark:bg-[#121215]">Semua Jenis</option>
            <option value="Kebutuhan" className="bg-white dark:bg-[#121215]">Kebutuhan</option>
            <option value="Keinginan" className="bg-white dark:bg-[#121215]">Keinginan</option>
            <option value="Pemasukan" className="bg-white dark:bg-[#121215]">Pemasukan</option>
            <option value="Transfer" className="bg-white dark:bg-[#121215]">Transfer</option>
            <option value="Tabungan" className="bg-white dark:bg-[#121215]">Tabungan</option>
            <option value="Perlu Ditinjau" className="bg-white dark:bg-[#121215]">Perlu Ditinjau</option>
          </select>

          <select
            aria-label="Filter metode"
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="min-h-[40px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3 text-xs sm:text-sm text-zinc-900 dark:text-[#FAFAFA]"
          >
            <option value="all" className="bg-white dark:bg-[#121215]">Semua Metode</option>
            {methodOptions.map((m) => (
              <option key={m} value={m} className="bg-white dark:bg-[#121215]">
                {m}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter akun"
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="min-h-[40px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3 text-xs sm:text-sm text-zinc-900 dark:text-[#FAFAFA] col-span-2 sm:col-span-1"
          >
            <option value="all" className="bg-white dark:bg-[#121215]">Semua Akun</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.name} className="bg-white dark:bg-[#121215]">
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Container with horizontal scroll on mobile */}
      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] overflow-hidden">
        {paginated.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-zinc-800 dark:text-[#FAFAFA]">
              Tidak ada transaksi yang sesuai filter.
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Ubah kata kunci pencarian atau tambahkan transaksi baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[820px]">
              <thead className="bg-zinc-50 dark:bg-[#09090B] text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-white/[0.08]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Tanggal</th>
                  <th className="py-3 px-4 font-semibold">Keterangan</th>
                  <th className="py-3 px-4 font-semibold">Kategori</th>
                  <th className="py-3 px-4 font-semibold">Jenis</th>
                  <th className="py-3 px-4 font-semibold">Metode</th>
                  <th className="py-3 px-4 font-semibold">Akun</th>
                  <th className="py-3 px-4 font-semibold text-right">Pemasukan</th>
                  <th className="py-3 px-4 font-semibold text-right">Pengeluaran</th>
                  <th className="py-3 px-4 font-semibold text-right">Saldo</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
                {paginated.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-zinc-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 px-4 font-mono-num tabular-nums whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {formatDateShort(tx.tanggal)}
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-900 dark:text-[#FAFAFA]">
                      <button
                        type="button"
                        onClick={() => navigate(`/transactions/${tx.id}`)}
                        className="text-left hover:underline"
                      >
                        {tx.keterangan}
                      </button>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                      {tx.kategori}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${getJenisBadgeClass(
                          tx.jenisPengeluaran
                        )}`}
                      >
                        {tx.jenisPengeluaran}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                      {tx.metode}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                      {tx.akun}
                    </td>
                    <td
                      className={`py-3 px-4 font-mono-num tabular-nums text-right whitespace-nowrap font-semibold ${
                        tx.masuk > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-400 dark:text-zinc-500 font-normal'
                      }`}
                    >
                      {tx.masuk > 0 ? formatMoney(tx.masuk) : '-'}
                    </td>
                    <td
                      className={`py-3 px-4 font-mono-num tabular-nums text-right whitespace-nowrap font-semibold ${
                        tx.keluar > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-zinc-400 dark:text-zinc-500 font-normal'
                      }`}
                    >
                      {tx.keluar > 0 ? formatMoney(tx.keluar) : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono-num tabular-nums text-right whitespace-nowrap font-semibold text-sky-600 dark:text-sky-400">
                      {formatMoney(tx.runningBalance)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/transactions/${tx.id}`)}
                          aria-label="Lihat detail"
                          title="Detail"
                          className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTx(tx);
                            setModalOpen(true);
                          }}
                          aria-label="Edit transaksi"
                          title="Edit"
                          className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tx)}
                          aria-label="Hapus transaksi"
                          title="Hapus"
                          className="p-2 rounded-lg text-zinc-500 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-zinc-200 dark:border-white/[0.08] text-xs sm:text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              Halaman <span className="font-mono-num tabular-nums">{safePage}</span> dari{' '}
              <span className="font-mono-num tabular-nums">{totalPages}</span> · Total{' '}
              <span className="font-mono-num tabular-nums">{filtered.length}</span> transaksi
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="min-h-[36px] rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-3 py-1 font-medium text-zinc-800 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="min-h-[36px] rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-3 py-1 font-medium text-zinc-800 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      <TransactionFormModal
        isOpen={modalOpen}
        initialData={editingTx}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(null);
        }}
      />
      <ImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};
