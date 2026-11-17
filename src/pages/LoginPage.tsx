import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);

    if (!res.ok) {
      setError(res.error || 'Gagal login.');
      return;
    }

    showToast({ type: 'success', title: 'Login berhasil' });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090B] flex flex-col justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 dark:border-white/[0.12] bg-zinc-900 dark:bg-[#18181B] text-[#FAFAFA] shadow-sm">
            <CreditCard className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900 dark:text-[#FAFAFA]">
            Finance Insight
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Personal Financial Management & Business Intelligence
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-[#FAFAFA]">
              Masuk ke Akun
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Masuk untuk mengelola catatan transaksi dan analitik keuangan Anda.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                className="w-full min-h-[44px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2.5 text-sm text-zinc-900 dark:text-[#FAFAFA] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-[#FAFAFA] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                required
                className="w-full min-h-[44px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#09090B] px-3.5 py-2.5 text-sm text-zinc-900 dark:text-[#FAFAFA] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-[#FAFAFA] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>{submitting ? 'Memproses...' : 'Login'}</span>
            </button>
          </form>

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Belum punya akun?{' '}
            <Link
              to="/register"
              className="font-semibold text-zinc-900 dark:text-[#FAFAFA] hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
