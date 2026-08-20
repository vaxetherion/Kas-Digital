"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { TopBar } from "@/components/layout/top-bar";
import { formatRupiah, formatDate } from "@/lib/utils";
import type { Transaction, Category } from "@/types/database";

type TxRow = Transaction & {
  categories: Pick<Category, "name"> | null;
};

type ImportRow = {
  date: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: number;
  status: "confirmed" | "pending" | "cancelled";
  reference: string;
  notes: string;
};

export default function BackupsPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [loading, setLoading] = useState(false);
  const [txCount, setTxCount] = useState(0);
  const [lastExport, setLastExport] = useState<string | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .then((res: { count: number | null }) => setTxCount(res.count ?? 0));
  }, [supabase]);

  // ── Export CSV ──────────────────────────────────────────────────────
  const exportCSV = async () => {
    if (!supabase) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("transactions")
      .select("*, categories(name)")
      .order("transaction_date", { ascending: false });

    if (error || !data) {
      alert("Gagal mengambil data.");
      setLoading(false);
      return;
    }

    const rows = data as TxRow[];

    const headers = [
      "Tanggal",
      "Jenis",
      "Kategori",
      "Deskripsi",
      "Nominal",
      "Status",
      "Referensi",
      "Catatan",
    ];

    const csvRows = [
      "\uFEFF" + headers.join(","),
      ...rows.map((tx) =>
        [
          tx.transaction_date,
          tx.type === "income" ? "Pemasukan" : "Pengeluaran",
          tx.categories?.name ?? "",
          `"${tx.description.replace(/"/g, '""')}"`,
          tx.amount,
          tx.status === "confirmed"
            ? "Dikonfirmasi"
            : tx.status === "pending"
              ? "Menunggu"
              : "Dibatalkan",
          tx.reference ?? "",
          `"${(tx.notes ?? "").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `kas-digital-export-${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setLastExport(new Date().toLocaleString("id-ID"));
    setLoading(false);
  };

  // ── Import CSV ─────────────────────────────────────────────────────
  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];

    // Skip header row
    const rows: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles quoted fields)
      const cols: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          cols.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      cols.push(current.trim());

      if (cols.length < 5) continue;

      const jenis = cols[1]?.toLowerCase();
      const statusRaw = cols[5]?.toLowerCase();

      rows.push({
        date: cols[0] || new Date().toISOString().split("T")[0],
        type: jenis?.includes("masuk") || jenis?.includes("income") ? "income" : "expense",
        category: cols[2] || "",
        description: cols[3]?.replace(/^"|"$/g, "") || "",
        amount: parseFloat(cols[4]) || 0,
        status:
          statusRaw?.includes("konfirmasi") || statusRaw?.includes("confirm")
            ? "confirmed"
            : statusRaw?.includes("batal") || statusRaw?.includes("cancel")
              ? "cancelled"
              : "pending",
        reference: cols[6] || "",
        notes: cols[7]?.replace(/^"|"$/g, "") || "",
      });
    }
    return rows;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    setImporting(true);
    setImportResult(null);

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      setImportResult({
        success: 0,
        failed: 0,
        errors: ["Tidak ada data valid ditemukan dalam file CSV."],
      });
      setImporting(false);
      return;
    }

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setImportResult({
        success: 0,
        failed: 0,
        errors: ["Anda harus login untuk mengimpor data."],
      });
      setImporting(false);
      return;
    }

    // Fetch categories for name-to-id mapping
    const { data: catData } = await supabase.from("categories").select("id, name");
    const catMap = new Map<string, string>();
    (catData ?? []).forEach((c: { id: string; name: string }) =>
      catMap.set(c.name.toLowerCase(), c.id),
    );

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      setImportProgress({ done: i, total: rows.length });

      const insertRows = batch
        .filter((r) => r.amount > 0 && r.description)
        .map((r) => {
          const categoryId = catMap.get(r.category.toLowerCase()) ?? null;
          return {
            user_id: user.id,
            type: r.type,
            status: r.status,
            amount: r.amount,
            description: r.description,
            category_id: categoryId,
            reference: r.reference || null,
            notes: r.notes || null,
            transaction_date: r.date,
          };
        });

      if (insertRows.length === 0) continue;

      const { error } = await supabase.from("transactions").insert(insertRows);

      if (error) {
        failed += insertRows.length;
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        success += insertRows.length;
      }
    }

    setImportProgress({ done: rows.length, total: rows.length });
    setImportResult({ success, failed, errors });
    setImporting(false);

    // Refresh count
    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true });
    setTxCount(count ?? 0);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <TopBar title="Backup" />
      <div className="p-4 lg:p-8 space-y-4">
        {/* Desktop header */}
        <div className="hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>
          <p className="text-sm text-gray-500 mt-1">
            Ekspor dan impor data kas digital.
          </p>
        </div>

        {/* Export CSV Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl shrink-0">
              📊
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-900">
                Ekspor ke CSV
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Unduh seluruh data transaksi dalam format CSV (Excel-compatible).
                File dapat dibuka langsung di Microsoft Excel atau Google Sheets.
              </p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                <span>📁 {txCount} transaksi</span>
                {lastExport && <span>Terakhir diekspor: {lastExport}</span>}
              </div>
            </div>
          </div>

          <button
            onClick={exportCSV}
            disabled={loading || txCount === 0}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Mengekspor...
              </span>
            ) : (
              "⬇️ Unduh CSV"
            )}
          </button>
        </div>

        {/* Import CSV Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl shrink-0">
              📥
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-gray-900">
                Impor dari CSV
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Upload file CSV dengan format yang sesuai untuk mengimpor data
                transaksi. Kolom: Tanggal, Jenis, Kategori, Deskripsi, Nominal,
                Status, Referensi, Catatan.
              </p>
            </div>
          </div>

          {/* Import progress */}
          {importing && importProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Mengimpor data...</span>
                <span>
                  {importProgress.done}/{importProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(importProgress.done / importProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div
              className={`rounded-lg p-3 text-xs ${
                importResult.failed > 0
                  ? "bg-amber-50 border border-amber-200 text-amber-700"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-700"
              }`}
            >
              {importResult.success > 0 && (
                <p>✅ {importResult.success} transaksi berhasil diimpor.</p>
              )}
              {importResult.failed > 0 && (
                <p>❌ {importResult.failed} transaksi gagal diimpor.</p>
              )}
              {importResult.errors.map((err, i) => (
                <p key={i} className="mt-1 opacity-70">
                  {err}
                </p>
              ))}
            </div>
          )}

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="hidden"
              id="csv-import"
            />
            <label
              htmlFor="csv-import"
              className={`inline-flex items-center justify-center w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-400 cursor-pointer transition-all ${
                importing ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {importing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memproses file...
                </span>
              ) : (
                <span className="flex flex-col items-center gap-2">
                  <span className="text-2xl">📄</span>
                  Klik untuk memilih file CSV
                </span>
              )}
            </label>
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Format CSV</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium text-gray-500">Kolom</th>
                  <th className="py-2 font-medium text-gray-500">Deskripsi</th>
                  <th className="py-2 font-medium text-gray-500">Contoh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-600">
                <tr>
                  <td className="py-2 pr-4 font-medium">Tanggal</td>
                  <td className="py-2">Format YYYY-MM-DD</td>
                  <td className="py-2 font-mono text-gray-400">2026-08-20</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Jenis</td>
                  <td className="py-2">Pemasukan / Pengeluaran</td>
                  <td className="py-2 font-mono text-gray-400">Pengeluaran</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Kategori</td>
                  <td className="py-2">Nama kategori (opsional)</td>
                  <td className="py-2 font-mono text-gray-400">Makan & Minum</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Deskripsi</td>
                  <td className="py-2">Keterangan transaksi</td>
                  <td className="py-2 font-mono text-gray-400">Makan siang</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Nominal</td>
                  <td className="py-2">Angka tanpa titik/koma</td>
                  <td className="py-2 font-mono text-gray-400">50000</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Status</td>
                  <td className="py-2">Dikonfirmasi / Menunggu / Dibatalkan</td>
                  <td className="py-2 font-mono text-gray-400">Dikonfirmasi</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Referensi</td>
                  <td className="py-2">No. bon / invoice (opsional)</td>
                  <td className="py-2 font-mono text-gray-400">INV-001</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Catatan</td>
                  <td className="py-2">Catatan tambahan (opsional)</td>
                  <td className="py-2 font-mono text-gray-400">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
