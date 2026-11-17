import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react';
import { TransactionFormModal } from '../components/TransactionForm';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { formatDateShort, formatMoney } from '../utils/formatMoney';
import { getJenisBadgeClass } from '../utils/semanticColors';

export const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { transactionsWithBalance, deleteTransaction } = useFinance();
  const { showToast, confirmAction } = useToast();
  const [editOpen, setEditOpen] = useState(false);

  const txId = Number(id);
  const tx = transactionsWithBalance.find((item) => item.id === txId);

  if (!tx) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-8 text-center space-y-4">
        <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-[#FAFAFA]">
          Transaksi tidak ditemukan
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Data transaksi mungkin sudah dihapus atau bukan milik akun ini.
        </p>
        <Link
          to="/transactions"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-4 py-2 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar Transaksi</span>
        </Link>
      </div>
    );
  }

  const handleDelete = async () => {
    const ok = await confirmAction({
      title: 'Hapus transaksi?',
      message: `Hapus transaksi "${tx.keterangan}"? Saldo kronologis akan dihitung ulang.`,
      confirmLabel: 'Hapus',
      destructive: true,
    });
    if (ok) {
      deleteTransaction(tx.id);
      showToast({ type: 'success', title: 'Transaksi berhasil dihapus' });
      navigate('/transactions');
    }
  };

  const isIncome = tx.masuk > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to="/transactions"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#18181B] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-[#FAFAFA]">
              Detail Transaksi
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              ID #{tx.id} · {formatDateShort(tx.tanggal)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-3.5 py-2 text-sm font-medium text-zinc-800 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Edit2 className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2 text-sm font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-6 space-y-6">
        <div className="pb-5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                isIncome
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-400'
              }`}
            >
              {tx.tipe}
            </span>
            <h3 className="font-display text-xl font-bold text-zinc-900 dark:text-[#FAFAFA] mt-1.5">
              {tx.keterangan}
            </h3>
          </div>
          <div className="sm:text-right">
            <p
              className={`font-mono-num tabular-nums text-2xl font-bold ${
                isIncome
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isIncome ? `+${formatMoney(tx.masuk)}` : `-${formatMoney(tx.keluar)}`}
            </p>
            <p className="font-mono-num tabular-nums text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Saldo setelah transaksi:{' '}
              <span className="font-semibold text-sky-600 dark:text-sky-400">
                {formatMoney(tx.runningBalance)}
              </span>
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Tanggal</dt>
            <dd className="font-medium text-zinc-900 dark:text-[#FAFAFA] mt-0.5">
              {formatDateShort(tx.tanggal)} ({tx.tanggal})
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Kategori</dt>
            <dd className="font-medium text-zinc-900 dark:text-[#FAFAFA] mt-0.5">{tx.kategori}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Jenis Pengeluaran</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getJenisBadgeClass(
                  tx.jenisPengeluaran
                )}`}
              >
                {tx.jenisPengeluaran}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Metode Pembayaran</dt>
            <dd className="font-medium text-zinc-900 dark:text-[#FAFAFA] mt-0.5">{tx.metode}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Akun</dt>
            <dd className="font-medium text-zinc-900 dark:text-[#FAFAFA] mt-0.5">{tx.akun}</dd>
          </div>
          <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">Rincian Nominal</dt>
            <dd className="font-mono-num tabular-nums font-medium text-zinc-900 dark:text-[#FAFAFA] mt-0.5">
              Masuk {formatMoney(tx.masuk)} · Keluar {formatMoney(tx.keluar)}
            </dd>
          </div>
          {tx.transferId && (
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">ID Transfer</dt>
              <dd className="font-mono-num tabular-nums font-medium text-zinc-900 dark:text-[#FAFAFA] mt-0.5">
                {tx.transferId}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <TransactionFormModal
        isOpen={editOpen}
        initialData={tx}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
};
