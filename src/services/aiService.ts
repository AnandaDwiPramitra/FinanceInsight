import { AiAnalysisResult, InsightItem, OptimizationResult, PredictionResult } from '../types/finance';
import { formatMoney } from '../utils/formatMoney';
import { getStoredGeminiApiKey } from './storageService';

export interface AiPromptSummary {
  periode: string;
  totalPemasukan: number;
  totalPengeluaran: number;
  saldo: number;
  saldoAkun: {
    cash: number;
    shopeePay: number;
    seaBank: number;
  };
  kategoriPengeluaran: { kategori: string; total: number }[];
  kebutuhanNominal: number;
  keinginanNominal: number;
  perluDitinjauNominal: number;
  kebutuhanPersen: number;
  keinginanPersen: number;
  perluDitinjauPersen: number;
  targetTabungan: number;
  pencapaianTabungan: number;
  tingkatKeyakinanPrediksi: PredictionResult['confidenceLevel'];
  asumsiPrediksi: string[];
  rentangPrediksi: {
    pemasukanMin: number;
    pemasukanMax: number;
    pengeluaranMin: number;
    pengeluaranMax: number;
    saldoMin: number;
    saldoMax: number;
  };
  trenBulanan: {
    periode: string;
    pemasukan: number;
    pengeluaran: number;
    saldo: number;
    parsial: boolean;
    tanggalTerakhir: string;
  }[];
}

export function buildFallbackAiAnalysis(params: {
  summary: AiPromptSummary;
  insights: InsightItem[];
  optimization: OptimizationResult;
  prediction: PredictionResult;
  errorNote?: string;
}): AiAnalysisResult {
  const { summary, insights, optimization, prediction, errorNote } = params;

  const topCategory = summary.kategoriPengeluaran[0];
  const reviewNote =
    summary.perluDitinjauNominal > 0
      ? `, dan ${summary.perluDitinjauPersen}% (${formatMoney(summary.perluDitinjauNominal)}) berstatus Perlu Ditinjau`
      : '';
  const kondisiKeuangan =
    summary.totalPemasukan === 0 && summary.totalPengeluaran === 0
      ? 'Belum ada aktivitas pemasukan dan pengeluaran yang tercatat pada periode terpilih.'
      : `Pada periode ${summary.periode}, total pemasukan nyata sebesar ${formatMoney(summary.totalPemasukan)} dan pengeluaran konsumsi ${formatMoney(summary.totalPengeluaran)} menghasilkan saldo gabungan ${formatMoney(summary.saldo)} (Cash ${formatMoney(summary.saldoAkun.cash)}, ShopeePay ${formatMoney(summary.saldoAkun.shopeePay)}, SeaBank ${formatMoney(summary.saldoAkun.seaBank)}). Pengeluaran kebutuhan menyerap ${summary.kebutuhanPersen}% dan keinginan ${summary.keinginanPersen}%${reviewNote}${topCategory ? `, dengan pos terbesar pada kategori ${topCategory.kategori} (${formatMoney(topCategory.total)})` : ''}.`;

  const prediksi = prediction.available
    ? `Tingkat keyakinan ${prediction.confidenceLevel} (${prediction.fullMonthsCount} bulan penuh, ${prediction.monthsCount} total periode). Proyeksi bulan berikutnya: pemasukan ${formatMoney(prediction.predictedIncome)} (rentang ${formatMoney(prediction.incomeRange.min)}–${formatMoney(prediction.incomeRange.max)}), pengeluaran ${formatMoney(prediction.predictedExpense)} (rentang ${formatMoney(prediction.expenseRange.min)}–${formatMoney(prediction.expenseRange.max)}), dan proyeksi saldo ${formatMoney(prediction.predictedBalance)}. ${prediction.negativeBalanceReason || prediction.confidenceReason}`
    : `Prediksi belum tersedia karena baru terdapat ${prediction.monthsCount} periode data historis (${prediction.fullMonthsCount} bulan penuh).`;

  const risiko: string[] = [];
  if (prediction.negativeBalanceReason) {
    risiko.push(prediction.negativeBalanceReason);
  }
  if (optimization.isOverLimit) {
    risiko.push(
      `Pengeluaran aktual melewati batas rekomendasi sebesar ${formatMoney(optimization.overLimitAmount)}.`
    );
  }
  if (summary.keinginanPersen > 30) {
    risiko.push(
      `Proporsi pengeluaran keinginan (${summary.keinginanPersen}%) melebihi ambang ideal 30%.`
    );
  }
  if (summary.perluDitinjauNominal > 0) {
    risiko.push(
      `Terdapat ${formatMoney(summary.perluDitinjauNominal)} transaksi pengeluaran yang masih berstatus Perlu Ditinjau sehingga perlu klasifikasi ulang.`
    );
  }
  if (summary.saldo < 0) {
    risiko.push(`Defisit arus kas sebesar ${formatMoney(Math.abs(summary.saldo))}.`);
  }
  insights
    .filter((i) => i.type === 'warning' || i.type === 'danger')
    .slice(0, 2)
    .forEach((i) => {
      if (!risiko.some((r) => r.includes(i.title))) {
        risiko.push(`${i.title}: ${i.message}`);
      }
    });
  if (risiko.length === 0) {
    risiko.push('Tidak terdeteksi risiko defisit utama pada data periode saat ini.');
  }

  const rekomendasi = optimization.recommendations.map((r) => `${r.title} — ${r.detail}`);

  const gap = Math.max(0, summary.targetTabungan - summary.pencapaianTabungan);
  const targetTabungan =
    summary.targetTabungan <= 0
      ? 'Belum ada target tabungan aktif untuk periode ini.'
      : gap === 0
        ? `Target tabungan sebesar ${formatMoney(summary.targetTabungan)} telah tercapai 100% dari transaksi tabungan aktual (${formatMoney(summary.pencapaianTabungan)}).`
        : `Terkumpul ${formatMoney(summary.pencapaianTabungan)} dari target ${formatMoney(summary.targetTabungan)}. Masih dibutuhkan ${formatMoney(gap)} dari alokasi tabungan aktual; jaga pengeluaran harian di bawah ${formatMoney(optimization.dailySpendingLimit)}.`;

  return {
    source: 'fallback',
    generatedAt: new Date().toISOString(),
    kondisiKeuangan,
    prediksi,
    risiko,
    rekomendasi,
    targetTabungan,
    errorNote,
  };
}

export async function runFinancialAiAnalysis(params: {
  summary: AiPromptSummary;
  insights: InsightItem[];
  optimization: OptimizationResult;
  prediction: PredictionResult;
}): Promise<AiAnalysisResult> {
  const apiKey = getStoredGeminiApiKey();

  if (!apiKey) {
    return buildFallbackAiAnalysis(params);
  }

  const promptText = `Anda adalah analis keuangan pribadi & Business Intelligence untuk aplikasi Finance Insight.
Aturan ketat:
1. Hanya gunakan angka yang ada di JSON, JANGAN mengarang angka baru.
2. Gunakan format nominal mata uang Indonesia dengan pemisah ribuan titik (contoh: Rp1.000.000, Rp50.000, Rp10.000).
3. Pisahkan dengan tegas antara Data Aktual, Prediksi, dan Rekomendasi.
4. Jangan menganggap bulan yang ditandai "parsial: true" (misal November s.d. tgl 16) sebagai bulan penuh, dan jangan memprediksi tabungan bulan parsial seolah sudah terjadi.
5. Pisahkan saldo akun Cash, ShopeePay, dan SeaBank, dan jangan menghitung transfer internal sebagai pemasukan baru.
6. Jangan pernah menyarankan untuk menambah alokasi pos Keinginan jika pengguna sedang berhemat (keinginanNominal = 0), serta jangan mengklasifikasikan transaksi Perlu Ditinjau tanpa dasar.
7. Jelaskan asumsi, rentang prediksi, tingkat keyakinan (${params.summary.tingkatKeyakinanPrediksi}), dan penyebab jika saldo proyeksi bernilai negatif.

Data Agregat Pengguna:
${JSON.stringify(params.summary, null, 2)}

Berikan output JSON valid sesuai skema berikut (Bahasa Indonesia ringkas, profesional, dan actionable):
{
  "kondisiKeuangan": "DATA AKTUAL: ringkasan kondisi arus kas aktual, posisi akun Cash/ShopeePay/SeaBank, dan struktur pengeluaran",
  "prediksi": "PREDIKSI: proyeksi MA3 beserta rentang prediksi, asumsi, dan tingkat keyakinan",
  "risiko": ["daftar 2-3 risiko finansial nyata dari data"],
  "rekomendasi": ["REKOMENDASI: daftar 3 langkah efisiensi kebutuhan dan tabungan tanpa menambah alokasi Keinginan"],
  "targetTabungan": "evaluasi pencapaian target tabungan aktual dan strategi mencapainya"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-4-hydrogen:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errBody.slice(0, 140)}`);
    }

    const data = await response.json();
    const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('Respons Gemini kosong.');
    }

    const parsed = JSON.parse(rawText);
    return {
      source: 'gemini',
      generatedAt: new Date().toISOString(),
      kondisiKeuangan: String(parsed.kondisiKeuangan || ''),
      prediksi: String(parsed.prediksi || ''),
      risiko: Array.isArray(parsed.risiko) ? parsed.risiko.map(String) : [],
      rekomendasi: Array.isArray(parsed.rekomendasi) ? parsed.rekomendasi.map(String) : [],
      targetTabungan: String(parsed.targetTabungan || ''),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Koneksi Gemini gagal';
    return buildFallbackAiAnalysis({
      ...params,
      errorNote: `Mode Fallback aktif (${message}). Analisis tetap dihitung secara deterministik dari Rule Engine, Moving Average, dan Optimization Engine.`,
    });
  }
}
