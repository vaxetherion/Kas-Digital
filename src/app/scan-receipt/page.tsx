"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/top-bar";
import { formatRupiah, cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────

type ReceiptData = {
  merchant: string;
  date: string;
  items: { name: string; quantity: number; price: number; subtotal: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  rawText: string;
};

type ScanState = "idle" | "uploading" | "scanning" | "done" | "error";

// ── Component ──────────────────────────────────────────────────────────

export default function ScanReceiptPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrorMessage("File harus berupa gambar (JPG, PNG, WEBP).");
      setScanState("error");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Ukuran file maksimal 10MB.");
      setScanState("error");
      return;
    }

    // Create preview and auto-scan
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreview(result);
      const base64 = result.split(",")[1];
      setBase64Image(base64);
      setScanState("uploading");
    };
    reader.readAsDataURL(file);
  };

  const handleScan = async () => {
    if (!base64Image) return;

    setScanState("scanning");
    setErrorMessage(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

      if (!apiKey) {
        // Demo mode: generate mock data
        const mockData: ReceiptData = {
          merchant: "Warung Padang Sederhana",
          date: new Date().toISOString().split("T")[0],
          items: [
            { name: "Nasi Rendang", quantity: 2, price: 35000, subtotal: 70000 },
            { name: "Es Teh Manis", quantity: 2, price: 5000, subtotal: 10000 },
            { name: "Kerupuk", quantity: 1, price: 3000, subtotal: 3000 },
          ],
          subtotal: 83000,
          tax: 8300,
          total: 91300,
          paymentMethod: "Tunai",
          rawText: "[Demo Mode] API Key belum dikonfigurasi. Menampilkan data contoh.",
        };
        setReceiptData(mockData);
        setScanState("done");
        return;
      }

      // Call Gemini API for OCR
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Analyze this receipt image and extract the following information. Return ONLY valid JSON with no markdown formatting:

{
  "merchant": "store/restaurant name",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "item name", "quantity": 1, "price": 0, "subtotal": 0}
  ],
  "subtotal": 0,
  "tax": 0,
  "total": 0,
  "paymentMethod": "cash/card/e-wallet",
  "rawText": "full extracted text from receipt"
}

Extract all items visible. Prices should be in numbers (no currency symbol). If a field is not visible, use reasonable defaults.`,
                  },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: base64Image,
                    },
                  },
                ],
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("Tidak ada respons dari AI.");
      }

      // Parse JSON response (strip markdown code blocks if present)
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed: ReceiptData = JSON.parse(cleaned);

      setReceiptData(parsed);
      setScanState("done");
    } catch (err) {
      console.error("Scan error:", err);
      setErrorMessage(
        err instanceof Error
          ? `Gagal memindai: ${err.message}`
          : "Terjadi kesalahan saat memindai struk.",
      );
      setScanState("error");
    }
  };

  const handleCreateTransaction = () => {
    if (!receiptData) return;

    // Store receipt data in sessionStorage for the transaction form
    sessionStorage.setItem(
      "scan-receipt-data",
      JSON.stringify({
        description: receiptData.merchant,
        amount: receiptData.total,
        date: receiptData.date,
        notes: receiptData.items
          .map((i) => `${i.quantity}x ${i.name} @${formatRupiah(i.price)}`)
          .join(", "),
      }),
    );

    router.push("/transactions/new");
  };

  const resetScan = () => {
    setScanState("idle");
    setPreview(null);
    setReceiptData(null);
    setErrorMessage(null);
    setBase64Image(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <TopBar
        title="Scan Struk"
        rightAction={
          scanState === "uploading" ? (
            <button
              onClick={handleScan}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              🔍 Scan
            </button>
          ) : undefined
        }
      />
      <div className="p-4 lg:p-8 space-y-4 max-w-2xl mx-auto">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Scan Struk AI</h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload foto struk/kuitansi, AI akan otomatis mengekstrak data transaksi.
          </p>
        </div>

        {/* Upload area */}
        {scanState === "idle" && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
                  📸
                </div>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Upload Foto Struk
              </h2>
              <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">
                Ambil foto struk belanja atau kuitansi, lalu upload di sini.
                AI akan membaca dan mengekstrak data transaksi secara otomatis.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
                id="receipt-upload"
              />
              <label
                htmlFor="receipt-upload"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer transition-all"
              >
                📷 Pilih Foto / Ambil Foto
              </label>
              <p className="text-[10px] text-gray-400 mt-3">
                Format: JPG, PNG, WEBP · Maks 10MB
              </p>
            </div>
          </div>
        )}

        {/* Preview & scanning */}
        {(scanState === "uploading" || scanState === "scanning") && preview && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              Foto Struk
            </h2>
            <div className="rounded-lg overflow-hidden border border-gray-200">
              <img
                src={preview}
                alt="Receipt preview"
                className="w-full max-h-80 object-contain bg-gray-50"
              />
            </div>
            {scanState === "uploading" && (
              <div className="flex items-center justify-center gap-3 py-4">
                <button
                  onClick={handleScan}
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all"
                >
                  🔍 Mulai Scan
                </button>
                <button
                  onClick={resetScan}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
              </div>
            )}
            {scanState === "scanning" && (
              <div className="flex items-center justify-center gap-3 py-4">
                <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm text-gray-600">AI sedang menganalisis struk...</span>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {scanState === "done" && receiptData && (
          <div className="space-y-4">
            {/* Preview thumbnail */}
            {preview && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={preview}
                    alt="Receipt"
                    className="h-16 w-16 rounded-lg object-cover border border-gray-200"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {receiptData.merchant}
                    </h3>
                    <p className="text-xs text-gray-400">{receiptData.date}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Extracted data */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">
                  Data Terdeteksi
                </h2>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  ✓ Berhasil
                </span>
              </div>

              {/* Items */}
              {receiptData.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Item</p>
                  <div className="space-y-1">
                    {receiptData.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0"
                      >
                        <span className="text-gray-700">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatRupiah(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatRupiah(receiptData.subtotal)}</span>
                </div>
                {receiptData.tax > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Pajak</span>
                    <span>{formatRupiah(receiptData.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1">
                  <span>Total</span>
                  <span>{formatRupiah(receiptData.total)}</span>
                </div>
              </div>

              {/* Payment method */}
              {receiptData.paymentMethod && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Metode bayar:</span>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                    {receiptData.paymentMethod}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={resetScan}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                🔄 Scan Lagi
              </button>
              <button
                onClick={handleCreateTransaction}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all"
              >
                ➕ Buat Transaksi
              </button>
            </div>

            {/* Raw text */}
            {receiptData.rawText && (
              <details className="rounded-xl border border-gray-200 bg-white">
                <summary className="px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors">
                  📄 Teks Mentah
                </summary>
                <div className="px-4 pb-4">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {receiptData.rawText}
                  </pre>
                </div>
              </details>
            )}
          </div>
        )}

        {/* Error state */}
        {scanState === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <div className="text-center">
              <div className="text-3xl mb-3">❌</div>
              <h2 className="text-base font-semibold text-red-900 mb-2">
                Gagal Memindai
              </h2>
              <p className="text-sm text-red-700 mb-4">{errorMessage}</p>
              <button
                onClick={resetScan}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Cara Kerja</h2>
          <div className="space-y-2">
            {[
              { step: "1", icon: "📷", desc: "Ambil foto atau upload gambar struk" },
              { step: "2", icon: "🤖", desc: "AI (Gemini) membaca dan mengekstrak data" },
              { step: "3", icon: "✅", desc: "Data otomatis terisi di form transaksi" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 shrink-0">
                  {item.step}
                </span>
                <span className="text-sm text-gray-600">
                  {item.icon} {item.desc}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            {process.env.NEXT_PUBLIC_GEMINI_API_KEY
              ? "✅ Gemini API terkonfigurasi — mode live aktif"
              : "⚠️ Gemini API belum dikonfigurasi — menggunakan demo mode"}
          </p>
        </div>
      </div>
    </>
  );
}
