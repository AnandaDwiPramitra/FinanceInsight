import React, { useEffect, useState } from 'react';
import { Bot, KeyRound, Loader2, ShieldAlert, Trash2, X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import { AiPromptSummary, runFinancialAiAnalysis } from '../services/aiService';
import {
  getStoredGeminiApiKey,
  removeGeminiApiKey,
  saveGeminiApiKey,
} from '../services/storageService';
import { AiAnalysisResult } from '../types/finance';
import { getMonthLabel } from '../utils/formatMoney';

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResultReady?: (result: AiAnalysisResult) => void;
}

export const AiModal: React.FC<AiModalProps> = ({ isOpen, onClose, onResultReady }) => {
  const {
    selectedPeriod,
    kpi,
    cashBalance,
    shopeePayBalance,
    seaBankBalance,
    totalAccountBalance,
    categoryExpenseData,
    activeSavingsTarget,
    activeSavingsCollected,
    insights,
    optimization,
    prediction,
  } = useFinance();
  const { showToast } = useToast();

  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = getStoredGeminiApiKey();
      setHasStoredKey(Boolean(existing));
      setApiKeyInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      showToast({ type: 'error', title: 'API Key tidak boleh kosong' });
      return;
    }
    saveGeminiApiKey(apiKeyInput.trim());
    setHasStoredKey(true);
    setApiKeyInput('');
    setShowKeyForm(false);
    showToast({ type: 'success', title: 'API key tersimpan' });
  };

  const handleRemoveKey = () => {
    removeGeminiApiKey();
    setHasStoredKey(false);
    setApiKeyInput('');
    showToast({ type: 'info', title: 'API key dihapus dari penyimpanan lokal' });
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    const summary: AiPromptSummary = {
      periode: getMonthLabel(selectedPeriod),
      totalPemasukan: kpi.totalIncome,
      totalPengeluaran: kpi.totalExpense,
      saldo: totalAccountBalance,
      saldoAkun: {
        cash: cashBalance,
        shopeePay: shopeePayBalance,
        seaBank: seaBankBalance,
      },
      kategoriPengeluaran: categoryExpenseData.slice(0, 8),
      kebutuhanNominal: kpi.needsExpense,
      keinginanNominal: kpi.wantsExpense,
      perluDitinjauNominal: kpi.reviewExpense,
      kebutuhanPersen: kpi.needsPercentage,
      keinginanPersen: kpi.wantsPercentage,
      perluDitinjauPersen: kpi.reviewPercentage,
      targetTabungan: activeSavingsTarget,
      pencapaianTabungan: activeSavingsCollected,
      tingkatKeyakinanPrediksi: prediction.confidenceLevel,
      asumsiPrediksi: prediction.assumptions,
      rentangPrediksi: {
        pemasukanMin: prediction.incomeRange.min,
        pemasukanMax: prediction.incomeRange.max,
        pengeluaranMin: prediction.expenseRange.min,
        pengeluaranMax: prediction.expenseRange.max,
        saldoMin: prediction.balanceRange.min,
        saldoMax: prediction.balanceRange.max,
      },
      trenBulanan: prediction.history.map((h) => ({
        periode: h.periodLabel,
        pemasukan: h.income,
        pengeluaran: h.expense,
        saldo: h.balance,
        parsial: h.isPartial,
        tanggalTerakhir: h.latestDate,
      })),
    };

    const result = await runFinancialAiAnalysis({
      summary,
      insights,
      optimization,
      prediction,
    });

    setLoading(false);
    setAnalysis(result);
    onResultReady?.(result);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-3xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] shadow-xl">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Bot className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-[#FAFAFA]">
              Tanya AI: Prediksi & Optimasi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup AI modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* API Key Management */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                <KeyRound className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <span>
                  Status Gemini API Key:{' '}
                  {hasStoredKey ? 'Tersimpan (tersembunyi)' : 'Belum diatur (Mode Fallback aktif)'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowKeyForm((prev) => !prev)}
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:underline"
                >
                  {hasStoredKey ? 'Ganti API Key' : 'Atur API Key'}
                </button>
                {hasStoredKey && (
                  <button
                    type="button"
                    onClick={handleRemoveKey}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400/90 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus API Key</span>
                  </button>
                )}
              </div>
            </div>

            <p className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400/80" />
              <span>
                Catatan demo lokal: API key disimpan di localStorage browser hanya untuk penggunaan lokal/demo (bukan untuk production; aplikasi production sebaiknya memanggil Gemini melalui proxy backend). Jika API key kosong atau gagal, sistem otomatis menggunakan Rule Engine, Moving Average, dan Optimization Engine.
              </span>
            </p>

            {showKeyForm && (
              <form onSubmit={handleSaveKey} className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Masukkan Gemini API Key baru"
                  className="flex-1 min-h-[40px] rounded-xl border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-3.5 py-2 text-sm text-zinc-900 dark:text-[#FAFAFA] focus:border-zinc-500 dark:focus:border-white/40 focus:outline-none"
                />
                <button
                  type="submit"
                  className="min-h-[40px] rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-4 py-2 text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  Simpan API Key
                </button>
              </form>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              Hanya data agregat periode <strong className="text-zinc-900 dark:text-[#FAFAFA]">{getMonthLabel(selectedPeriod)}</strong> yang dikirim untuk analisis.
            </p>
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={loading}
              className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-5 py-2 text-sm font-semibold disabled:opacity-60 whitespace-nowrap transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menganalisis data...</span>
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4" />
                  <span>Jalankan Analisis AI</span>
                </>
              )}
            </button>
          </div>

          {analysis && <AiResultCard analysis={analysis} />}
        </div>
      </div>
    </div>
  );
};

export const AiResultCard: React.FC<{ analysis: AiAnalysisResult }> = ({ analysis }) => {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-white/[0.08]">
        <div>
          <h3 className="font-display text-base font-bold text-zinc-900 dark:text-[#FAFAFA]">
            AI Financial Analysis
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Sumber: {analysis.source === 'gemini' ? 'Gemini AI' : 'Fallback Engine (Rule-Based + MA3 + Optimasi)'}
          </p>
        </div>
      </div>

      {analysis.errorNote && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-200/90">
          {analysis.errorNote}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-[#FAFAFA]">
            Kondisi Keuangan
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {analysis.kondisiKeuangan}
          </p>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-[#FAFAFA]">Prediksi</h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            {analysis.prediksi}
          </p>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-rose-700 dark:text-rose-400/90">Risiko</h4>
          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-300 list-disc pl-4">
            {analysis.risiko.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400/90">
            Rekomendasi
          </h4>
          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-300 list-disc pl-4">
            {analysis.rekomendasi.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.08] space-y-1">
        <h4 className="text-xs font-semibold text-zinc-900 dark:text-[#FAFAFA]">Target Tabungan</h4>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{analysis.targetTabungan}</p>
      </div>
    </div>
  );
};
