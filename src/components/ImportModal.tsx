import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Link2,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useToast } from '../context/ToastContext';
import {
  buildImportSummary,
  ParsedImportResult,
  parseGoogleSheetUrl,
  parseImportFile,
} from '../services/importService';
import { ImportSummary } from '../types/finance';
import { formatDateShort, formatMoney } from '../utils/formatMoney';
import { getJenisBadgeClass } from '../utils/semanticColors';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
  const { transactions, bulkImportTransactions } = useFinance();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'upload' | 'sheets'>('upload');
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [loadingStep, setLoadingStep] = useState<'idle' | 'fetching' | 'parsing'>('idle');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedImportResult | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [completedSummary, setCompletedSummary] = useState<ImportSummary | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFileName('');
    setParseError('');
    setParsedResult(null);
    setReplaceExisting(true);
    setCompletedSummary(null);
    setGoogleSheetsUrl('');
    setLoadingStep('idle');
    setParsing(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setLoadingStep('parsing');
    setParseError('');
    setCompletedSummary(null);
    setFileName(file.name);

    const result = await parseImportFile(file, transactions);
    setParsing(false);
    setLoadingStep('idle');

    if (result.error) {
      setParseError(result.error);
      setParsedResult(null);
      showToast({ type: 'error', title: 'Import gagal', description: result.error });
    } else {
      setParsedResult(result);
    }

    e.target.value = '';
  };

  const handleFetchGoogleSheet = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const url = googleSheetsUrl.trim();
    if (!url) {
      const msg = 'Link Google Sheets tidak valid. Pastikan menyalin URL lengkap dari browser.';
      setParseError(msg);
      showToast({ type: 'error', title: 'URL kosong', description: msg });
      return;
    }

    setParsing(true);
    setLoadingStep('fetching');
    setParseError('');
    setCompletedSummary(null);
    setParsedResult(null);

    const result = await parseGoogleSheetUrl(url, transactions);
    setParsing(false);
    setLoadingStep('idle');

    if (result.error) {
      setParseError(result.error);
      setParsedResult(null);
      showToast({ type: 'error', title: 'Import gagal', description: result.error });
    } else {
      setFileName(result.fileName);
      setParsedResult(result);
      showToast({
        type: 'success',
        title: 'Google Sheets berhasil dimuat',
        description: `${result.rows.length} transaksi siap ditinjau.`,
      });
    }
  };

  const previewRows = parsedResult?.rows || [];
  const validCandidates = previewRows.filter((r) => r.status !== 'Invalid');
  const existingDuplicateRows = validCandidates.filter((r) => r.isDuplicate);
  const readyRows =
    transactions.length > 0 && !replaceExisting
      ? validCandidates.filter((r) => !r.isDuplicate)
      : validCandidates;
  const skippedDuplicateCount =
    transactions.length > 0 && !replaceExisting ? existingDuplicateRows.length : 0;
  const invalidCount = previewRows.filter((r) => r.status === 'Invalid').length;

  const liveSummary =
    parsedResult && readyRows.length > 0
      ? buildImportSummary({
          parsed: parsedResult,
          importedRows: readyRows,
          skippedDuplicateCount,
        })
      : null;

  const handleConfirmImport = () => {
    if (!parsedResult || readyRows.length === 0) {
      showToast({
        type: 'warning',
        title: 'Tidak ada baris baru yang valid untuk diimport',
        description:
          skippedDuplicateCount > 0
            ? `${skippedDuplicateCount} baris duplikat dilewati otomatis.`
            : undefined,
      });
      return;
    }

    const summary = buildImportSummary({
      parsed: parsedResult,
      importedRows: readyRows,
      skippedDuplicateCount,
    });

    const importedCount = bulkImportTransactions(
      readyRows.map((r) => ({
        tanggal: r.tanggal,
        tipe: r.tipe,
        kategori: r.kategori,
        metode: r.metode,
        akun: r.akun,
        masuk: r.masuk,
        keluar: r.keluar,
        keterangan: r.keterangan,
        jenisPengeluaran: r.jenisPengeluaran,
        bulan: r.bulan,
        importedSaldo: r.importedSaldo,
        transferId: r.transferId,
      })),
      {
        replaceExisting: transactions.length > 0 ? replaceExisting : true,
        summary,
      }
    );

    setCompletedSummary(summary);
    showToast({
      type: 'success',
      title: 'Import berhasil',
      description: `${importedCount} transaksi dari ${parsedResult.fileName} berhasil diimport.${
        skippedDuplicateCount > 0 ? ` (${skippedDuplicateCount} duplikat dilewati)` : ''
      }`,
    });
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-5xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#121215] shadow-xl">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-zinc-200 dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-[#FAFAFA]">
              Import Data
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup import modal"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/[0.06] dark:hover:text-[#FAFAFA]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {completedSummary ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300/90">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <h3 className="font-display text-base font-bold">
                    Import Data Selesai
                  </h3>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block">File / Format</span>
                    <span className="font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                      {completedSummary.fileName} ({completedSummary.fileType})
                    </span>
                  </div>
                  {completedSummary.sheetName && (
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400 block">Sheet Digunakan</span>
                      <span className="font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                        {completedSummary.sheetName}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block">Baris Excel Dibaca</span>
                    <span className="font-mono-num tabular-nums font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                      {completedSummary.totalRowsRead} baris
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block">Transaksi Diimport</span>
                    <span className="font-mono-num tabular-nums font-bold text-zinc-900 dark:text-[#FAFAFA]">
                      {completedSummary.importedCount} transaksi
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block">Baris Gagal</span>
                    <span className="font-mono-num tabular-nums font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                      {completedSummary.failedCount} baris
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block">Rentang Tanggal</span>
                    <span className="font-mono-num tabular-nums font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                      {formatDateShort(completedSummary.earliestDate)} –{' '}
                      {formatDateShort(completedSummary.latestDate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block">Uang Tunai</span>
                    <span className="font-mono-num tabular-nums font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                      {formatMoney(completedSummary.cashBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block">Saldo ShopeePay</span>
                    <span className="font-mono-num tabular-nums font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                      {formatMoney(completedSummary.shopeePayBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block">Saldo SeaBank</span>
                    <span className="font-mono-num tabular-nums font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                      {formatMoney(completedSummary.seaBankBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400 block">Total Tabungan</span>
                    <span className="font-mono-num tabular-nums font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                      {formatMoney(completedSummary.totalSavings)}
                    </span>
                  </div>
                  {completedSummary.skippedDuplicateCount > 0 && (
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400 block">Duplikat Dilewati</span>
                      <span className="font-mono-num tabular-nums font-semibold text-amber-700 dark:text-amber-300/90">
                        {completedSummary.skippedDuplicateCount} baris
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08]">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Jumlah Transaksi per Bulan
                  </span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                    {completedSummary.perMonthCounts.map((m) => (
                      <span key={m.periodKey}>
                        {m.periodLabel}: <strong className="font-mono-num tabular-nums text-zinc-900 dark:text-[#FAFAFA]">{m.count}</strong> transaksi
                      </span>
                    ))}
                  </div>
                </div>

                {completedSummary.validation && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08]">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Validasi Konsistensi Data ({completedSummary.validation.passedCount}/
                      {completedSummary.validation.totalCount} lolos)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                      {completedSummary.validation.checks.map((chk) => (
                        <div key={chk.id} className="flex items-start gap-1.5">
                          <span
                            className={`font-bold shrink-0 ${
                              chk.passed
                                ? 'text-emerald-700 dark:text-emerald-400/90'
                                : 'text-amber-700 dark:text-amber-400/90'
                            }`}
                          >
                            {chk.passed ? '✓' : '!'}
                          </span>
                          <span className="text-zinc-700 dark:text-zinc-300">
                            <strong>{chk.label}:</strong> {chk.detail}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {completedSummary.failedReasons.length > 0 && (
                  <div className="pt-2 border-t border-rose-500/20 text-xs text-rose-700 dark:text-rose-300/90">
                    <span className="font-semibold block mb-1">Alasan Baris Gagal:</span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {completedSummary.failedReasons.map((f, idx) => (
                        <li key={idx}>
                          Baris {f.rowNumber}: {f.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {!parsedResult && (
                <div className="space-y-4">
                  {/* Tab Selector */}
                  <div className="flex border-b border-zinc-200 dark:border-white/[0.08] gap-4 sm:gap-6">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('upload');
                        setParseError('');
                      }}
                      className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'upload'
                          ? 'border-zinc-900 text-zinc-900 dark:border-[#FAFAFA] dark:text-[#FAFAFA]'
                          : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload File (.xlsx / .csv)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('sheets');
                        setParseError('');
                      }}
                      className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                        activeTab === 'sheets'
                          ? 'border-zinc-900 text-zinc-900 dark:border-[#FAFAFA] dark:text-[#FAFAFA]'
                          : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Link2 className="h-4 w-4" />
                      <span>Link Google Sheets</span>
                    </button>
                  </div>

                  {/* Tab 1: Upload File */}
                  {activeTab === 'upload' && (
                    <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#09090B] p-6 text-center cursor-pointer hover:border-zinc-500 dark:hover:border-white/30 transition-colors">
                      <Upload className="h-7 w-7 text-zinc-500 dark:text-zinc-400 mb-2" />
                      <span className="text-sm font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                        {fileName
                          ? `File dipilih: ${fileName}`
                          : 'Pilih file .xlsx, .xls, atau .csv'}
                      </span>
                      <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xl">
                        Mendukung multi-sheet otomatis (September, Oktober, November), kolom nominal tunggal, dan format Data Keuangan.
                      </span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                  )}

                  {/* Tab 2: Link Google Sheets */}
                  {activeTab === 'sheets' && (
                    <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-5 sm:p-6 space-y-4">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                        <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-[#FAFAFA]">
                          Import Langsung dari Link Google Sheets
                        </h3>
                      </div>

                      <form onSubmit={handleFetchGoogleSheet} className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <input
                              type="url"
                              value={googleSheetsUrl}
                              onChange={(e) => {
                                setGoogleSheetsUrl(e.target.value);
                                if (parseError) setParseError('');
                              }}
                              placeholder="https://docs.google.com/spreadsheets/d/..."
                              className="w-full rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-3.5 py-2.5 text-sm text-zinc-900 dark:text-[#FAFAFA] placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:focus:ring-sky-400/30"
                            />
                            {googleSheetsUrl && (
                              <button
                                type="button"
                                onClick={() => setGoogleSheetsUrl('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                          <button
                            type="submit"
                            disabled={!googleSheetsUrl.trim() || parsing}
                            className="min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-5 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {loadingStep === 'fetching' ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Mengambil...</span>
                              </>
                            ) : (
                              <>
                                <Link2 className="h-4 w-4" />
                                <span>Import dari Link</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <p className="flex items-start gap-1.5">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300 shrink-0">Penting:</span>
                            <span>
                              Pastikan akses Google Spreadsheet sudah diatur ke <strong className="text-zinc-900 dark:text-[#FAFAFA]">&apos;Siapa saja yang memiliki link (Anyone with the link)&apos;</strong>.
                            </span>
                          </p>
                          <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                            Mendukung tautan Google Sheets lengkap (/edit, /view, /pubhtml, atau dengan parameter ?gid). Seluruh sheet transaksi akan dipindai otomatis.
                          </p>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {parsedResult && (
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-3.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {parsedResult.fileName.includes('GoogleSheet') ? (
                      <Link2 className="h-4 w-4 text-sky-500 shrink-0" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 block">Sumber Data Siap Ditinjau:</span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-[#FAFAFA] truncate block">
                        {parsedResult.fileName} ({parsedResult.fileType})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setParsedResult(null);
                      setParseError('');
                    }}
                    className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline shrink-0 ml-4 cursor-pointer"
                  >
                    Ganti File / Link
                  </button>
                </div>
              )}

              {parsing && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-600 dark:text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-900 dark:text-[#FAFAFA]" />
                  <span>
                    {loadingStep === 'fetching'
                      ? 'Mengambil data dari Google Sheets...'
                      : 'Membaca seluruh sheet dan memvalidasi data transaksi...'}
                  </span>
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-300/90">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {parsedResult && previewRows.length > 0 && (
                <div className="space-y-4">
                  {/* Validation & Month Breakdown Summary */}
                  <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#09090B] p-4 space-y-3 text-xs sm:text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-zinc-700 dark:text-zinc-300">
                        {parsedResult.sheetName && (
                          <>
                            <span className="font-semibold text-zinc-900 dark:text-[#FAFAFA]">
                              Sheet: {parsedResult.sheetName}
                            </span>
                            <span aria-hidden="true">·</span>
                          </>
                        )}
                        <span className="font-mono-num tabular-nums font-semibold">
                          {parsedResult.totalRowsRead} baris dibaca
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300/90">
                          {readyRows.length} siap diimport
                        </span>
                        {invalidCount > 0 && (
                          <span className="inline-flex items-center rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300/90">
                            {invalidCount} gagal
                          </span>
                        )}
                      </div>

                      {liveSummary && (
                        <span className="font-mono-num tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDateShort(liveSummary.earliestDate)} –{' '}
                          {formatDateShort(liveSummary.latestDate)}
                        </span>
                      )}
                    </div>

                    {liveSummary && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {liveSummary.perMonthCounts.map((m) => (
                          <span key={m.periodKey}>
                            {m.periodLabel}:{' '}
                            <strong className="font-mono-num tabular-nums text-zinc-900 dark:text-[#FAFAFA]">
                              {m.count}
                            </strong>
                          </span>
                        ))}
                        <span aria-hidden="true">·</span>
                        <span>
                          Uang Tunai:{' '}
                          <strong className="font-mono-num tabular-nums text-zinc-900 dark:text-[#FAFAFA]">
                            {formatMoney(liveSummary.cashBalance)}
                          </strong>
                        </span>
                        <span>
                          Saldo ShopeePay:{' '}
                          <strong className="font-mono-num tabular-nums text-zinc-900 dark:text-[#FAFAFA]">
                            {formatMoney(liveSummary.shopeePayBalance)}
                          </strong>
                        </span>
                        <span>
                          Saldo SeaBank:{' '}
                          <strong className="font-mono-num tabular-nums text-zinc-900 dark:text-[#FAFAFA]">
                            {formatMoney(liveSummary.seaBankBalance)}
                          </strong>
                        </span>
                        <span>
                          Total Tabungan:{' '}
                          <strong className="font-mono-num tabular-nums text-zinc-900 dark:text-[#FAFAFA]">
                            {formatMoney(liveSummary.totalSavings)}
                          </strong>
                        </span>
                      </div>
                    )}

                    {transactions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-zinc-200 dark:border-white/[0.08] text-xs">
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-zinc-800 dark:text-[#FAFAFA]">
                          <input
                            type="radio"
                            name="importMode"
                            checked={replaceExisting}
                            onChange={() => setReplaceExisting(true)}
                            className="accent-zinc-900 dark:accent-white"
                          />
                          <span>Ganti data saat ini dengan hasil import</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-zinc-700 dark:text-zinc-300">
                          <input
                            type="radio"
                            name="importMode"
                            checked={!replaceExisting}
                            onChange={() => setReplaceExisting(false)}
                            className="accent-zinc-900 dark:accent-white"
                          />
                          <span>Gabungkan dengan transaksi yang ada (duplikat dilewati otomatis)</span>
                        </label>
                      </div>
                    )}

                    {existingDuplicateRows.length > 0 && (
                      <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200/90">
                        Terdeteksi <strong>{existingDuplicateRows.length}</strong> transaksi yang sama dengan data tersimpan.{' '}
                        {!replaceExisting
                          ? 'Baris duplikat dilewati otomatis saat mode Gabungkan.'
                          : 'Pada mode Ganti Data, seluruh data lama diganti bersih oleh file ini.'}
                      </div>
                    )}

                    {liveSummary?.validation && (
                      <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08] text-xs">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                          Pra-Validasi ({liveSummary.validation.passedCount}/{liveSummary.validation.totalCount} pemeriksaan lolos)
                        </span>
                        {!liveSummary.validation.allPassed && (
                          <ul className="list-disc pl-4 space-y-0.5 text-amber-700 dark:text-amber-300/90">
                            {liveSummary.validation.checks
                              .filter((c) => !c.passed)
                              .map((c) => (
                                <li key={c.id}>
                                  {c.label}: {c.detail}
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {parsedResult.failedRows.length > 0 && (
                      <div className="pt-2 border-t border-rose-500/20 text-xs text-rose-700 dark:text-rose-300/90">
                        <span className="font-semibold block mb-1">
                          {parsedResult.failedRows.length} baris gagal dibaca:
                        </span>
                        <ul className="list-disc pl-4 space-y-0.5 max-h-24 overflow-y-auto">
                          {parsedResult.failedRows.map((f, idx) => (
                            <li key={idx}>
                              Baris {f.rowNumber}: {f.reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Preview Table */}
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08] max-h-[340px]">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead className="sticky top-0 bg-zinc-50 dark:bg-[#09090B] text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-white/[0.08]">
                        <tr>
                          <th className="py-2.5 px-3 font-medium">Baris</th>
                          <th className="py-2.5 px-3 font-medium">Tanggal</th>
                          <th className="py-2.5 px-3 font-medium">Bulan</th>
                          <th className="py-2.5 px-3 font-medium">Keterangan</th>
                          <th className="py-2.5 px-3 font-medium">Kategori</th>
                          <th className="py-2.5 px-3 font-medium">Jenis</th>
                          <th className="py-2.5 px-3 font-medium">Metode</th>
                          <th className="py-2.5 px-3 font-medium">Akun</th>
                          <th className="py-2.5 px-3 font-medium text-right">Pemasukan</th>
                          <th className="py-2.5 px-3 font-medium text-right">Pengeluaran</th>
                          <th className="py-2.5 px-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
                        {previewRows.map((row) => {
                          const statusColor =
                            row.status === 'Valid'
                              ? 'text-emerald-700 dark:text-emerald-400/90'
                              : row.status === 'Warning'
                                ? 'text-amber-700 dark:text-amber-400/90'
                                : 'text-rose-700 dark:text-rose-400/90';

                          return (
                            <tr
                              key={row.rowNumber}
                              className="hover:bg-zinc-50 dark:hover:bg-white/[0.03]"
                            >
                              <td className="py-2 px-3 font-mono-num tabular-nums text-zinc-500 dark:text-zinc-400">
                                {row.rowNumber}
                              </td>
                              <td className="py-2 px-3 font-mono-num tabular-nums whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                                {row.tanggal}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                                {row.bulan || '-'}
                              </td>
                              <td className="py-2 px-3 max-w-[180px] truncate text-zinc-900 dark:text-[#FAFAFA]">
                                {row.keterangan}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300">{row.kategori}</td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${getJenisBadgeClass(
                                    row.jenisPengeluaran
                                  )}`}
                                >
                                  {row.jenisPengeluaran}
                                </span>
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300">{row.metode}</td>
                              <td className="py-2 px-3 whitespace-nowrap font-medium text-zinc-900 dark:text-[#FAFAFA]">
                                {row.akun}
                              </td>
                              <td
                                className={`py-2 px-3 font-mono-num tabular-nums text-right whitespace-nowrap ${
                                  row.masuk > 0
                                    ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                    : 'text-zinc-400 dark:text-zinc-500'
                                }`}
                              >
                                {formatMoney(row.masuk)}
                              </td>
                              <td
                                className={`py-2 px-3 font-mono-num tabular-nums text-right whitespace-nowrap ${
                                  row.keluar > 0
                                    ? 'font-semibold text-rose-600 dark:text-rose-400'
                                    : 'text-zinc-400 dark:text-zinc-500'
                                }`}
                              >
                                {formatMoney(row.keluar)}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                <span className={`font-semibold ${statusColor}`}>
                                  {row.status}
                                </span>
                                {row.issues.length > 0 && (
                                  <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {row.issues.join(' · ')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-zinc-200 dark:border-white/[0.08]">
          {completedSummary ? (
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[42px] rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-5 py-2 text-sm font-semibold transition-colors"
            >
              Selesai & Lihat Dashboard
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[42px] rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#18181B] px-4 py-2 text-sm font-medium text-zinc-700 dark:text-[#FAFAFA] hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={readyRows.length === 0 || parsing}
                onClick={handleConfirmImport}
                className="min-h-[42px] inline-flex items-center gap-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-[#FAFAFA] dark:text-[#09090B] dark:hover:bg-zinc-200 px-5 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Konfirmasi Import ({readyRows.length})</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
