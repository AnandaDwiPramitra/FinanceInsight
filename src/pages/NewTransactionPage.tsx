import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TransactionForm } from '../components/TransactionForm';

export const NewTransactionPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link
          to="/transactions"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#18181B] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="font-display text-xl font-bold text-zinc-900 dark:text-[#FAFAFA]">
            Tambah Transaksi Baru
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Catat pemasukan atau pengeluaran baru ke buku kas pribadi
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 sm:p-6">
        <TransactionForm
          onSuccess={() => navigate('/transactions')}
          onCancel={() => navigate('/transactions')}
        />
      </div>
    </div>
  );
};
